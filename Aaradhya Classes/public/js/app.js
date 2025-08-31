// Aaradhya Classes Management System - Frontend JavaScript
class TuitionManagement {
    constructor() {
        this.currentSection = 'dashboard';
        this.students = [];
        this.courses = [];
        this.payments = [];
        this.dashboardData = {};

        this.init();
    }

    async init() {
        console.log('🚀 Initializing Aaradhya Classes Management System');

        // Set today's date as default for payment date
        const today = new Date().toISOString().split('T')[0];
        const paymentDateField = document.getElementById('paymentDate');
        if (paymentDateField) {
            paymentDateField.value = today;
        }

        // Load initial data
        await this.loadDashboardData();
        await this.loadStudents();
        await this.loadCourses();

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.showSection(section);
            });
        });

        // Form submissions
        document.getElementById('studentForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveStudent();
        });

        document.getElementById('paymentForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePayment();
        });
    }

    // API Methods
    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            this.showLoading(true);

            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`/api${endpoint}`, options);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'API request failed');
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            this.showNotification('Error: ' + error.message, 'error');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    // Dashboard Methods
    async loadDashboardData() {
        try {
            const result = await this.apiCall('/dashboard');
            this.dashboardData = result.data;
            this.updateDashboard();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateDashboard() {
        const data = this.dashboardData;

        // Update stat cards
        document.getElementById('totalStudents').textContent = data.total_students || 0;
        document.getElementById('totalRevenue').textContent = `₹${this.formatCurrency(data.total_revenue || 0)}`;
        document.getElementById('pendingFees').textContent = data.pending_fees_count || 0;
        document.getElementById('pendingAmount').textContent = `₹${this.formatCurrency(data.pending_fees_amount || 0)}`;

        // Update recent payments table
        this.updateRecentPaymentsTable(data.recent_payments || []);
    }

    updateRecentPaymentsTable(payments) {
        const tbody = document.querySelector('#recentPaymentsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No recent payments</td></tr>';
            return;
        }

        payments.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${payment.student_name}</td>
                <td>₹${this.formatCurrency(payment.amount)}</td>
                <td>${this.formatDate(payment.payment_date || payment.created_at)}</td>
                <td><span class="badge bg-primary">${payment.payment_method || 'Cash'}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    // Students Methods
    async loadStudents() {
        try {
            const result = await this.apiCall('/students');
            this.students = result.data;
            this.updateStudentsTable();
            this.updateStudentSelects();
        } catch (error) {
            console.error('Failed to load students:', error);
        }
    }

    updateStudentsTable() {
        const tbody = document.querySelector('#studentsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.students.forEach(student => {
            const row = document.createElement('tr');
            const feeStatus = student.fee_paid ? 'Paid' : 'Pending';
            const statusBadge = student.fee_paid ? 'bg-success' : 'bg-warning';

            row.innerHTML = `
                <td>
                    <div>
                        <strong>${student.name}</strong>
                        ${student.email ? `<br><small class="text-muted">${student.email}</small>` : ''}
                    </div>
                </td>
                <td>
                    <a href="tel:${student.phone}" class="text-decoration-none">
                        ${student.phone}
                    </a>
                </td>
                <td>
                    <span class="badge bg-info">${student.course}</span>
                    ${student.batch ? `<br><small class="text-muted">Batch: ${student.batch}</small>` : ''}
                </td>
                <td>
                    ₹${this.formatCurrency(student.fee_amount || 0)}
                    ${student.balance_due > 0 ? `<br><small class="text-danger">Due: ₹${this.formatCurrency(student.balance_due)}</small>` : ''}
                </td>
                <td>
                    <span class="badge ${statusBadge}">${feeStatus}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="app.editStudent(${student.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="app.deleteStudent(${student.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <a href="https://wa.me/91${student.phone}?text=${encodeURIComponent(this.getWhatsAppMessage(student))}" 
                           class="btn btn-whatsapp btn-sm" target="_blank" title="WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </a>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getWhatsAppMessage(student) {
        const message = student.fee_paid 
            ? `Dear ${student.name}, your tuition fee for ${student.course} at AARADHYA CLASSES has been received. Thank you!`
            : `Dear ${student.name}, your tuition fee for ${student.course} at AARADHYA CLASSES is pending. Please pay at your earliest convenience.`;

        return message + '\n\n- AARADHYA CLASSES\nContact: chetankhairnar21@gmail.com';
    }

    updateStudentSelects() {
        const courseSelect = document.getElementById('studentCourse');
        const paymentStudentSelect = document.getElementById('paymentStudent');

        if (courseSelect) {
            courseSelect.innerHTML = '<option value="">Select Course</option>';
            this.courses.forEach(course => {
                courseSelect.innerHTML += `<option value="${course.name}">${course.name} - ₹${this.formatCurrency(course.fee_amount)}</option>`;
            });
        }

        if (paymentStudentSelect) {
            paymentStudentSelect.innerHTML = '<option value="">Select Student</option>';
            this.students.forEach(student => {
                paymentStudentSelect.innerHTML += `<option value="${student.id}">${student.name} - ${student.course}</option>`;
            });
        }
    }

    openStudentModal(studentId = null) {
        const modal = new bootstrap.Modal(document.getElementById('studentModal'));
        const form = document.getElementById('studentForm');

        // Reset form
        form.reset();
        document.getElementById('studentId').value = '';

        if (studentId) {
            // Edit mode
            const student = this.students.find(s => s.id === studentId);
            if (student) {
                document.getElementById('studentId').value = student.id;
                document.getElementById('studentName').value = student.name;
                document.getElementById('studentEmail').value = student.email || '';
                document.getElementById('studentPhone').value = student.phone;
                document.getElementById('studentAddress').value = student.address || '';
                document.getElementById('studentCourse').value = student.course;
                document.getElementById('studentBatch').value = student.batch || '';
                document.getElementById('studentFeeAmount').value = student.fee_amount || 0;
                document.getElementById('studentFeePaid').checked = student.fee_paid;

                document.querySelector('#studentModal .modal-title').textContent = 'Edit Student';
            }
        } else {
            // Add mode
            document.querySelector('#studentModal .modal-title').textContent = 'Add Student';
        }

        modal.show();
    }

    async saveStudent() {
        try {
            const form = document.getElementById('studentForm');
            const formData = new FormData(form);

            const studentData = {
                name: document.getElementById('studentName').value,
                email: document.getElementById('studentEmail').value,
                phone: document.getElementById('studentPhone').value,
                address: document.getElementById('studentAddress').value,
                course: document.getElementById('studentCourse').value,
                batch: document.getElementById('studentBatch').value,
                fee_amount: parseFloat(document.getElementById('studentFeeAmount').value) || 0,
                fee_paid: document.getElementById('studentFeePaid').checked
            };

            const studentId = document.getElementById('studentId').value;
            const method = studentId ? 'PUT' : 'POST';
            const endpoint = studentId ? `/students/${studentId}` : '/students';

            await this.apiCall(endpoint, method, studentData);

            // Close modal and refresh data
            const modal = bootstrap.Modal.getInstance(document.getElementById('studentModal'));
            modal.hide();

            await this.loadStudents();
            await this.loadDashboardData();

            this.showNotification('Student saved successfully!', 'success');

        } catch (error) {
            console.error('Error saving student:', error);
        }
    }

    editStudent(id) {
        this.openStudentModal(id);
    }

    async deleteStudent(id) {
        if (!confirm('Are you sure you want to delete this student?')) {
            return;
        }

        try {
            await this.apiCall(`/students/${id}`, 'DELETE');
            await this.loadStudents();
            await this.loadDashboardData();
            this.showNotification('Student deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting student:', error);
        }
    }

    // Courses Methods
    async loadCourses() {
        try {
            const result = await this.apiCall('/courses');
            this.courses = result.data;
            this.updateCoursesGrid();
            this.updateStudentSelects();
        } catch (error) {
            console.error('Failed to load courses:', error);
        }
    }

    updateCoursesGrid() {
        const grid = document.getElementById('coursesGrid');
        if (!grid) return;

        grid.innerHTML = '';

        this.courses.forEach(course => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';

            col.innerHTML = `
                <div class="card course-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${course.name}</h5>
                        <p class="card-text text-muted">${course.description || 'No description available'}</p>
                        <div class="course-fee mb-3">₹${this.formatCurrency(course.fee_amount)}</div>
                        <div class="course-details">
                            <small class="text-muted">
                                <i class="fas fa-clock"></i> ${course.duration_months} months<br>
                                <i class="fas fa-users"></i> ${course.student_count || 0} students enrolled<br>
                                <i class="fas fa-user-friends"></i> Max ${course.max_students} students
                            </small>
                        </div>
                    </div>
                </div>
            `;

            grid.appendChild(col);
        });
    }

    // Payments Methods
    async savePayment() {
        try {
            const paymentData = {
                student_id: parseInt(document.getElementById('paymentStudent').value),
                amount: parseFloat(document.getElementById('paymentAmount').value),
                payment_date: document.getElementById('paymentDate').value,
                payment_method: document.getElementById('paymentMethod').value,
                transaction_id: document.getElementById('paymentTransactionId').value,
                notes: document.getElementById('paymentNotes').value
            };

            await this.apiCall('/payments', 'POST', paymentData);

            // Close modal and refresh data
            const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
            modal.hide();
            document.getElementById('paymentForm').reset();

            await this.loadStudents();
            await this.loadDashboardData();

            this.showNotification('Payment recorded successfully!', 'success');

        } catch (error) {
            console.error('Error saving payment:', error);
        }
    }

    // Navigation Methods
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show selected section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('fade-in');
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[href="#${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentSection = sectionName;

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'students':
                await this.loadStudents();
                break;
            case 'courses':
                await this.loadCourses();
                break;
            case 'payments':
                // Load payment history if needed
                break;
        }
    }

    // Utility Methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN').format(amount);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN');
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} alert alert-dismissible fade show`;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Show animation
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Export data methods
    exportStudentsCSV() {
        const csvContent = this.arrayToCSV(this.students, [
            'id', 'name', 'email', 'phone', 'course', 'fee_amount', 'fee_paid', 'created_at'
        ]);

        this.downloadCSV(csvContent, 'students_export.csv');
    }

    arrayToCSV(data, headers) {
        const csvRows = [];

        // Add headers
        csvRows.push(headers.join(','));

        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// Global functions for HTML onclick events
function showSection(sectionName) {
    app.showSection(sectionName);
}

function openStudentModal(studentId = null) {
    app.openStudentModal(studentId);
}

function saveStudent() {
    app.saveStudent();
}

function savePayment() {
    app.savePayment();
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TuitionManagement();
});

// Service Worker Registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
