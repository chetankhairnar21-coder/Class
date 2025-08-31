const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tuition_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();

        // Create database if not exists
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await connection.execute(`USE ${dbConfig.database}`);

        // Create tables
        const createTables = `
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                phone VARCHAR(15) NOT NULL,
                address TEXT,
                course VARCHAR(50) NOT NULL,
                batch VARCHAR(50),
                fee_amount DECIMAL(10,2) DEFAULT 0,
                fee_paid BOOLEAN DEFAULT FALSE,
                admission_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_phone (phone),
                INDEX idx_course (course)
            );

            CREATE TABLE IF NOT EXISTS courses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                fee_amount DECIMAL(10,2) NOT NULL,
                duration_months INT DEFAULT 12,
                max_students INT DEFAULT 30,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fee_payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_date DATE NOT NULL,
                payment_method VARCHAR(50) DEFAULT 'cash',
                transaction_id VARCHAR(100),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                INDEX idx_student_payment (student_id, payment_date)
            );

            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                date DATE NOT NULL,
                status ENUM('present', 'absent', 'late') DEFAULT 'present',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                UNIQUE KEY unique_attendance (student_id, date)
            );

            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'teacher', 'staff') DEFAULT 'staff',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const statements = createTables.split(';').filter(stmt => stmt.trim());
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.execute(statement);
            }
        }

        // Insert sample data
        await insertSampleData(connection);

        connection.release();
        console.log('✅ Database initialized successfully');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

async function insertSampleData(connection) {
    try {
        // Insert sample courses
        const [courseExists] = await connection.execute('SELECT COUNT(*) as count FROM courses');
        if (courseExists[0].count === 0) {
            await connection.execute(`
                INSERT INTO courses (name, description, fee_amount, duration_months) VALUES
                ('Mathematics Class 10', 'Complete Mathematics course for Class 10 CBSE', 2000.00, 12),
                ('Physics Class 11', 'Physics fundamentals for Class 11 students', 2500.00, 12),
                ('Chemistry Class 12', 'Advanced Chemistry for Class 12 board preparation', 2800.00, 12),
                ('English Speaking', 'Improve English speaking and communication skills', 1500.00, 6)
            `);
        }

        // Insert sample students
        const [studentExists] = await connection.execute('SELECT COUNT(*) as count FROM students');
        if (studentExists[0].count === 0) {
            await connection.execute(`
                INSERT INTO students (name, email, phone, course, fee_amount, fee_paid) VALUES
                ('Rahul Sharma', 'rahul@email.com', '9876543210', 'Mathematics Class 10', 2000.00, TRUE),
                ('Priya Patel', 'priya@email.com', '9876543211', 'Physics Class 11', 2500.00, FALSE),
                ('Amit Kumar', 'amit@email.com', '9876543212', 'Chemistry Class 12', 2800.00, FALSE),
                ('Sneha Singh', 'sneha@email.com', '9876543213', 'English Speaking', 1500.00, TRUE)
            `);
        }

        // Insert default admin user
        const bcrypt = require('bcryptjs');
        const [adminExists] = await connection.execute('SELECT COUNT(*) as count FROM admin_users');
        if (adminExists[0].count === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.execute(`
                INSERT INTO admin_users (username, email, password_hash, role) VALUES
                ('admin', 'admin@aaradhyaclasses.com', ?, 'admin')
            `, [hashedPassword]);
        }

    } catch (error) {
        console.log('Sample data already exists or error inserting:', error.message);
    }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all students
app.get('/api/students', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT s.*, 
                   COALESCE(SUM(fp.amount), 0) as total_paid,
                   (s.fee_amount - COALESCE(SUM(fp.amount), 0)) as balance_due
            FROM students s 
            LEFT JOIN fee_payments fp ON s.id = fp.student_id 
            GROUP BY s.id 
            ORDER BY s.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new student
app.post('/api/students', async (req, res) => {
    try {
        const { name, email, phone, address, course, batch, fee_amount } = req.body;

        if (!name || !phone || !course) {
            return res.status(400).json({ success: false, error: 'Name, phone, and course are required' });
        }

        const [result] = await pool.execute(`
            INSERT INTO students (name, email, phone, address, course, batch, fee_amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [name, email, phone, address, course, batch, fee_amount || 0]);

        res.json({ 
            success: true, 
            message: 'Student added successfully',
            student_id: result.insertId
        });
    } catch (error) {
        console.error('Error adding student:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update student
app.put('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address, course, batch, fee_amount, fee_paid } = req.body;

        const [result] = await pool.execute(`
            UPDATE students 
            SET name=?, email=?, phone=?, address=?, course=?, batch=?, fee_amount=?, fee_paid=?
            WHERE id=?
        `, [name, email, phone, address, course, batch, fee_amount, fee_paid, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        res.json({ success: true, message: 'Student updated successfully' });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.execute('DELETE FROM students WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all courses
app.get('/api/courses', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT c.*, COUNT(s.id) as student_count 
            FROM courses c 
            LEFT JOIN students s ON c.name = s.course 
            WHERE c.is_active = TRUE
            GROUP BY c.id 
            ORDER BY c.name
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add fee payment
app.post('/api/payments', async (req, res) => {
    try {
        const { student_id, amount, payment_date, payment_method, transaction_id, notes } = req.body;

        const [result] = await pool.execute(`
            INSERT INTO fee_payments (student_id, amount, payment_date, payment_method, transaction_id, notes) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [student_id, amount, payment_date, payment_method, transaction_id, notes]);

        res.json({ 
            success: true, 
            message: 'Payment recorded successfully',
            payment_id: result.insertId
        });
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get dashboard stats
app.get('/api/dashboard', async (req, res) => {
    try {
        const [totalStudents] = await pool.execute('SELECT COUNT(*) as count FROM students');
        const [totalRevenue] = await pool.execute('SELECT COALESCE(SUM(amount), 0) as total FROM fee_payments');
        const [pendingFees] = await pool.execute(`
            SELECT COUNT(*) as count, COALESCE(SUM(fee_amount), 0) as amount 
            FROM students WHERE fee_paid = FALSE
        `);
        const [recentPayments] = await pool.execute(`
            SELECT fp.*, s.name as student_name 
            FROM fee_payments fp 
            JOIN students s ON fp.student_id = s.id 
            ORDER BY fp.created_at DESC 
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                total_students: totalStudents[0].count,
                total_revenue: totalRevenue[0].total,
                pending_fees_count: pendingFees[0].count,
                pending_fees_amount: pendingFees[0].amount,
                recent_payments: recentPayments
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Setup automated backup (runs daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
    console.log('🔄 Running automated backup...');
    try {
        const { performBackup } = require('./scripts/backup');
        await performBackup();
        console.log('✅ Automated backup completed successfully');
    } catch (error) {
        console.error('❌ Automated backup failed:', error);
    }
});

// Start server
async function startServer() {
    try {
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}`);
            console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
