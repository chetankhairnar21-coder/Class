# 🎓 AARADHYA CLASSES - Full Stack Tuition Management System

A complete, production-ready tuition management system built with Node.js, MySQL, and deployed on Google Cloud Platform with automated backups.

## ✨ Features

### 📊 **Dashboard**
- Real-time statistics (students, revenue, pending fees)
- Recent payments overview
- Visual analytics and insights

### 👥 **Student Management**
- Add, edit, and delete student records
- Complete student profiles with contact information
- Course assignment and batch management
- Fee tracking and payment status

### 💰 **Fee Management**
- Record fee payments with multiple payment methods
- Track payment history and due amounts
- Generate payment reports
- Automated payment reminders

### 📱 **WhatsApp Integration**
- One-click fee reminder messages
- Direct WhatsApp communication with students
- Customizable message templates

### 📚 **Course Management**
- Manage multiple courses and batches
- Set course fees and duration
- Track student enrollment per course

### 🔐 **Security & Backup**
- Automated daily database backups to Google Cloud Storage
- Secure environment variable configuration
- SQL injection protection
- Rate limiting and security headers

### 📱 **Progressive Web App (PWA)**
- Install as mobile app on any device
- Offline functionality with service worker
- Push notifications support
- Responsive design for all screen sizes

## 🚀 Google Cloud Deployment

### Prerequisites

1. **Google Cloud Account**
   - Create account at [cloud.google.com](https://cloud.google.com)
   - Enable billing on your project

2. **Local Development Environment**
   - Node.js 16+ installed
   - Google Cloud SDK installed
   - Git installed

### 🛠️ **Automated Deployment**

The easiest way to deploy is using our automated deployment script:

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run automated deployment
./deploy.sh
```

The script will:
- ✅ Check all requirements
- ✅ Set up Google Cloud project
- ✅ Create Cloud SQL database
- ✅ Configure Cloud Storage for backups
- ✅ Deploy application to App Engine
- ✅ Set up automated backup cron jobs
- ✅ Provide you with the live application URL

### 🔧 **Manual Deployment Steps**

If you prefer manual deployment:

#### 1. **Setup Google Cloud Project**

```bash
# Set your project ID
export PROJECT_ID="your-unique-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable appengine.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
```

#### 2. **Create Cloud SQL Database**

```bash
# Run the Cloud SQL setup script
chmod +x scripts/setup-cloudsql.sh
./scripts/setup-cloudsql.sh
```

#### 3. **Configure Environment Variables**

Update `app.yaml` with your database credentials:

```yaml
env_variables:
  DB_HOST: /cloudsql/your-project-id:asia-south1:aaradhya-tuition-db
  DB_USER: root
  DB_PASSWORD: your-generated-password
  DB_NAME: tuition_management
```

#### 4. **Deploy Application**

```bash
# Install dependencies
npm install

# Deploy to App Engine
gcloud app deploy
```

#### 5. **Set Up Automated Backups**

```bash
# Deploy cron jobs for automated backups
gcloud app deploy cron.yaml
```

### 📊 **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (HTML/CSS/JS) │◄──►│   (Node.js)     │◄──►│  (Cloud SQL)    │
│   Bootstrap 5   │    │   Express       │    │   MySQL 8.0     │
│   PWA Support   │    │   RESTful API   │    │   Auto Backups  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │    Google Cloud         │
                    │    - App Engine         │
                    │    - Cloud SQL          │
                    │    - Cloud Storage      │
                    │    - Cloud Build        │
                    └─────────────────────────┘
```

## 💾 **Backup System**

### Automated Daily Backups
- 🕐 **Schedule**: Daily at 2:00 AM IST
- 📦 **Storage**: Google Cloud Storage
- 🗄️ **Retention**: 30 days (configurable)
- 📧 **Notifications**: Email alerts for backup status

### Manual Backup
```bash
# Run manual backup
node scripts/backup.js
```

### Backup Contents
- Complete database dump with structure and data
- Application files (excluding node_modules)
- Configuration files
- Stored in versioned folders with timestamps

## 📱 **Mobile App Experience**

### Install as Mobile App

**Android (Chrome):**
1. Open your deployed URL
2. Tap menu (⋮) → "Add to Home screen"
3. App appears on home screen like native app

**iPhone (Safari):**
1. Open your deployed URL
2. Tap Share → "Add to Home Screen"
3. App icon appears on home screen

### PWA Features
- 📱 Native app-like experience
- 🔄 Offline functionality
- 🔔 Push notifications
- 📊 Background sync

## 🎯 **Usage Guide**

### For Teachers/Admins

1. **Adding Students**
   - Go to Students section
   - Click "Add Student"
   - Fill in student details and course information
   - Set fee amount and payment status

2. **Recording Payments**
   - Go to Payments section
   - Click "Record Payment"
   - Select student and enter payment details
   - Choose payment method (Cash, UPI, Bank Transfer, Card)

3. **WhatsApp Reminders**
   - In student list, click WhatsApp button
   - Automatic message generated based on fee status
   - Send reminder with one tap

4. **Viewing Reports**
   - Dashboard shows real-time statistics
   - Filter and export student data
   - Track payment trends and revenue

### For Students/Parents

1. **Access the System**
   - Use the provided URL from teacher
   - Install as mobile app for easy access
   - Bookmark for quick access

2. **Check Fee Status**
   - View current fee status
   - See payment history
   - Download payment receipts

## 🛡️ **Security Features**

- **SQL Injection Protection**: Parameterized queries
- **Rate Limiting**: Prevents API abuse
- **HTTPS Encryption**: All data transmitted securely
- **Environment Variables**: Sensitive data protected
- **Regular Backups**: Data loss prevention
- **Access Logging**: Monitor system usage

## 💰 **Cost Estimation**

### Google Cloud Free Tier (Monthly)
- **App Engine**: 28 instance hours free
- **Cloud SQL**: $7-15 (db-f1-micro instance)
- **Cloud Storage**: First 5GB free
- **Data Transfer**: First 1GB free

### Paid Tier (Monthly)
- **Small Scale** (< 100 students): $10-20
- **Medium Scale** (< 500 students): $20-50
- **Large Scale** (1000+ students): $50-100

*Costs may vary based on usage patterns*

## 🔧 **Customization Options**

### Branding
- Update logo and colors in `public/css/style.css`
- Modify app name in `manifest.json`
- Change contact information in templates

### Features
- Add new student fields in database schema
- Customize WhatsApp message templates
- Add new payment methods
- Integrate SMS notifications
- Add parent portal functionality

### Courses
- Add unlimited courses and subjects
- Set different fee structures
- Create batch schedules
- Add teacher assignments

## 📞 **Support & Contact**

**Technical Support:**
- Email: chetankhairnar21@gmail.com
- Issues: Create GitHub issue
- Documentation: Check README files

**Business Inquiries:**
- Custom development
- Training and setup assistance
- Enterprise features
- White-label solutions

## 📄 **License & Terms**

- Open source application
- Free for educational use
- Commercial use requires attribution
- No warranty provided

## 🚀 **Getting Started Checklist**

- [ ] Google Cloud account created and billing enabled
- [ ] Local development environment set up
- [ ] Project cloned and dependencies installed
- [ ] Database configured and deployed
- [ ] Application deployed to App Engine
- [ ] Automated backups configured
- [ ] Mobile app installed and tested
- [ ] Students and courses added
- [ ] Payment system tested
- [ ] WhatsApp integration verified
- [ ] Team trained on system usage

**🎉 Congratulations! Your AARADHYA CLASSES management system is now live and ready to use!**

---

*Built with ❤️ for AARADHYA CLASSES*  
*Powered by Google Cloud Platform*
