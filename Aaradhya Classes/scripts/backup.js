// Automated Backup System for Google Cloud Storage
const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BackupManager {
    constructor() {
        this.storage = new Storage({
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
        });
        this.bucketName = process.env.BACKUP_BUCKET_NAME || 'aaradhya-tuition-backups';
        this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    }

    async performBackup() {
        try {
            console.log('🔄 Starting automated backup...');

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = `/tmp/backups/${timestamp}`;

            // Create backup directory
            fs.mkdirSync(backupDir, { recursive: true });

            // 1. Database backup
            await this.backupDatabase(backupDir, timestamp);

            // 2. Application files backup
            await this.backupApplicationFiles(backupDir, timestamp);

            // 3. Upload to Cloud Storage
            await this.uploadToCloudStorage(backupDir, timestamp);

            // 4. Cleanup old backups
            await this.cleanupOldBackups();

            // 5. Cleanup local files
            this.cleanupLocal(backupDir);

            console.log('✅ Backup completed successfully');

            // Send notification email
            await this.sendBackupNotification(true, timestamp);

        } catch (error) {
            console.error('❌ Backup failed:', error);
            await this.sendBackupNotification(false, null, error.message);
            throw error;
        }
    }

    async backupDatabase(backupDir, timestamp) {
        console.log('📊 Backing up database...');

        const dbConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        };

        const connection = await mysql.createConnection(dbConfig);

        try {
            // Get all tables
            const [tables] = await connection.execute('SHOW TABLES');
            const tableNames = tables.map(row => Object.values(row)[0]);

            let sqlDump = `-- Aaradhya Tuition System Database Backup
-- Generated: ${new Date().toISOString()}
-- Database: ${dbConfig.database}

SET FOREIGN_KEY_CHECKS = 0;
`;

            // Backup each table
            for (const tableName of tableNames) {
                console.log(`  📋 Backing up table: ${tableName}`);

                // Get table structure
                const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
                sqlDump += `\n-- Table: ${tableName}\n`;
                sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
                sqlDump += createTable[0]['Create Table'] + ';\n\n';

                // Get table data
                const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);

                if (rows.length > 0) {
                    sqlDump += `-- Data for table: ${tableName}\n`;

                    for (const row of rows) {
                        const values = Object.values(row).map(value => {
                            if (value === null) return 'NULL';
                            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                            if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                            return value;
                        });

                        const columns = Object.keys(row).map(col => `\`${col}\``).join(', ');
                        sqlDump += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values.join(', ')});\n`;
                    }
                    sqlDump += '\n';
                }
            }

            sqlDump += 'SET FOREIGN_KEY_CHECKS = 1;\n';

            // Save database backup
            const dbBackupFile = path.join(backupDir, `database_${timestamp}.sql`);
            fs.writeFileSync(dbBackupFile, sqlDump);

            console.log(`✅ Database backup saved: ${dbBackupFile}`);

        } finally {
            await connection.end();
        }
    }

    async backupApplicationFiles(backupDir, timestamp) {
        console.log('📁 Backing up application files...');

        const appBackupFile = path.join(backupDir, `application_${timestamp}.tar.gz`);

        // Create tar.gz of application files (excluding node_modules, logs, etc.)
        const excludePatterns = [
            '--exclude=node_modules',
            '--exclude=.git',
            '--exclude=logs',
            '--exclude=tmp',
            '--exclude=*.log',
            '--exclude=.env*'
        ];

        const command = `tar -czf ${appBackupFile} ${excludePatterns.join(' ')} .`;
        execSync(command, { cwd: process.cwd() });

        console.log(`✅ Application backup saved: ${appBackupFile}`);
    }

    async uploadToCloudStorage(backupDir, timestamp) {
        console.log('☁️ Uploading backups to Cloud Storage...');

        const bucket = this.storage.bucket(this.bucketName);

        // Ensure bucket exists
        const [bucketExists] = await bucket.exists();
        if (!bucketExists) {
            await bucket.create({
                location: 'ASIA-SOUTH1',
                storageClass: 'STANDARD'
            });
            console.log(`📦 Created backup bucket: ${this.bucketName}`);
        }

        const files = fs.readdirSync(backupDir);

        for (const file of files) {
            const localFilePath = path.join(backupDir, file);
            const cloudFileName = `backups/${timestamp}/${file}`;

            await bucket.upload(localFilePath, {
                destination: cloudFileName,
                metadata: {
                    metadata: {
                        timestamp: timestamp,
                        type: file.includes('database') ? 'database' : 'application',
                        project: 'aaradhya-tuition-system'
                    }
                }
            });

            console.log(`☁️ Uploaded: ${cloudFileName}`);
        }

        console.log('✅ All files uploaded to Cloud Storage');
    }

    async cleanupOldBackups() {
        console.log('🧹 Cleaning up old backups...');

        const bucket = this.storage.bucket(this.bucketName);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

        const [files] = await bucket.getFiles({
            prefix: 'backups/'
        });

        let deletedCount = 0;

        for (const file of files) {
            const [metadata] = await file.getMetadata();
            const fileDate = new Date(metadata.timeCreated);

            if (fileDate < cutoffDate) {
                await file.delete();
                deletedCount++;
                console.log(`🗑️ Deleted old backup: ${file.name}`);
            }
        }

        console.log(`✅ Cleaned up ${deletedCount} old backup files`);
    }

    cleanupLocal(backupDir) {
        console.log('🧹 Cleaning up local backup files...');

        try {
            execSync(`rm -rf ${backupDir}`);
            console.log('✅ Local backup files cleaned up');
        } catch (error) {
            console.error('⚠️ Error cleaning up local files:', error.message);
        }
    }

    async sendBackupNotification(success, timestamp, errorMessage = null) {
        const status = success ? 'SUCCESS' : 'FAILED';
        const subject = `Aaradhya Tuition System - Backup ${status}`;

        let message = `Backup Status: ${status}\n`;
        message += `Timestamp: ${timestamp || new Date().toISOString()}\n`;
        message += `Database: ${process.env.DB_NAME}\n`;

        if (success) {
            message += `✅ Backup completed successfully and uploaded to Cloud Storage\n`;
            message += `📦 Bucket: ${this.bucketName}\n`;
        } else {
            message += `❌ Backup failed with error: ${errorMessage}\n`;
        }

        console.log(`📧 Backup notification: ${message}`);

        // Here you can implement email notification using SendGrid, Nodemailer, or similar
        // await this.sendEmail(process.env.ADMIN_EMAIL, subject, message);
    }
}

// Export for use in cron jobs
async function performBackup() {
    const backupManager = new BackupManager();
    await backupManager.performBackup();
}

module.exports = { BackupManager, performBackup };

// If running directly
if (require.main === module) {
    performBackup()
        .then(() => {
            console.log('✅ Backup script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Backup script failed:', error);
            process.exit(1);
        });
}
