#!/bin/bash
# Complete Deployment Script for Aaradhya Tuition System on Google Cloud

set -e  # Exit on any error

# Configuration
PROJECT_ID="aaradhya-classes-470709"
REGION="asia-south1"
APP_NAME="aaradhya-tuition"
DB_INSTANCE_NAME="aaradhya-tuition-db"
BACKUP_BUCKET="aaradhya-tuition-backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "${BLUE}🚀 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_requirements() {
    print_step "Checking requirements..."

    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "Google Cloud SDK (gcloud) is not installed."
        print_warning "Please install it from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed."
        print_warning "Please install Node.js from: https://nodejs.org/"
        exit 1
    fi

    print_success "All requirements met"
}

setup_project() {
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${YELLOW}Please enter your Google Cloud Project ID:${NC}"
        read -r PROJECT_ID
    fi

    print_step "Setting up Google Cloud project: $PROJECT_ID"

    # Set current project
    gcloud config set project "$PROJECT_ID"

    # Enable required APIs
    print_step "Enabling required APIs..."
    gcloud services enable appengine.googleapis.com
    gcloud services enable sqladmin.googleapis.com
    gcloud services enable storage.googleapis.com
    gcloud services enable cloudbuild.googleapis.com

    print_success "Project setup completed"
}

setup_database() {
    print_step "Setting up Cloud SQL database..."

    # Check if instance already exists
    if gcloud sql instances describe "$DB_INSTANCE_NAME" --project="$PROJECT_ID" &> /dev/null; then
        print_warning "Cloud SQL instance $DB_INSTANCE_NAME already exists"
        return
    fi

    # Generate secure password
    DB_PASSWORD=$(openssl rand -base64 32)

    # Create Cloud SQL instance
    print_step "Creating Cloud SQL MySQL instance..."
    gcloud sql instances create "$DB_INSTANCE_NAME" \
        --database-version=MYSQL_8_0 \
        --tier=db-f1-micro \
        --region="$REGION" \
        --root-password="$DB_PASSWORD" \
        --backup-start-time=02:00 \
        --enable-bin-log \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --project="$PROJECT_ID"

    # Create database
    print_step "Creating application database..."
    gcloud sql databases create tuition_management \
        --instance="$DB_INSTANCE_NAME" \
        --project="$PROJECT_ID"

    print_success "Database setup completed"
    print_warning "Database password: $DB_PASSWORD"
    print_warning "Save this password securely!"

    # Update app.yaml with database configuration
    update_app_yaml "$DB_PASSWORD"
}

update_app_yaml() {
    local db_password="$1"

    print_step "Updating app.yaml configuration..."

    # Replace placeholder values in app.yaml
    sed -i.bak "s/your-project-id/$PROJECT_ID/g" app.yaml
    sed -i.bak "s/your-region/$REGION/g" app.yaml
    sed -i.bak "s/your-instance-name/$DB_INSTANCE_NAME/g" app.yaml
    sed -i.bak "s/your-secure-password/$db_password/g" app.yaml

    print_success "app.yaml updated"
}

setup_storage() {
    print_step "Setting up Cloud Storage for backups..."

    # Check if bucket exists
    if gsutil ls -b gs://"$BACKUP_BUCKET" &> /dev/null; then
        print_warning "Storage bucket $BACKUP_BUCKET already exists"
        return
    fi

    # Create backup bucket
    gsutil mb -p "$PROJECT_ID" -c STANDARD -l "$REGION" gs://"$BACKUP_BUCKET"

    # Set lifecycle policy for automatic cleanup
    cat > lifecycle.json << EOF
{
  "rule": [
    {
      "action": {
        "type": "Delete"
      },
      "condition": {
        "age": 90,
        "matchesStorageClass": ["STANDARD"]
      }
    }
  ]
}
EOF

    gsutil lifecycle set lifecycle.json gs://"$BACKUP_BUCKET"
    rm lifecycle.json

    print_success "Storage setup completed"
}

install_dependencies() {
    print_step "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed"
}

deploy_application() {
    print_step "Deploying application to App Engine..."

    # Deploy the application
    gcloud app deploy app.yaml --quiet --project="$PROJECT_ID"

    # Get the application URL
    APP_URL=$(gcloud app browse --no-launch-browser --project="$PROJECT_ID" 2>&1 | grep -o 'https://[^[:space:]]*')

    print_success "Application deployed successfully!"
    print_success "URL: $APP_URL"

    return $APP_URL
}

setup_cron_jobs() {
    print_step "Setting up automated backups..."

    # Create cron.yaml for scheduled tasks
    cat > cron.yaml << EOF
cron:
- description: "Daily database backup"
  url: /api/backup
  schedule: every day 02:00
  timezone: Asia/Kolkata
EOF

    # Deploy cron jobs
    gcloud app deploy cron.yaml --quiet --project="$PROJECT_ID"

    print_success "Automated backups configured"
}

print_summary() {
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Summary:${NC}"
    echo "Project ID: $PROJECT_ID"
    echo "Region: $REGION"
    echo "Database Instance: $DB_INSTANCE_NAME"
    echo "Backup Bucket: gs://$BACKUP_BUCKET"
    echo "Application URL: $1"
    echo ""
    echo -e "${BLUE}📱 Next Steps:${NC}"
    echo "1. Open your application URL in a browser"
    echo "2. Test all functionality (add students, record payments, etc.)"
    echo "3. Add to mobile home screen for app-like experience"
    echo "4. Share the URL with users"
    echo ""
    echo -e "${YELLOW}⚠️  Important Notes:${NC}"
    echo "- Database password has been set (save it securely)"
    echo "- Automated backups run daily at 2 AM"
    echo "- Monitor your Google Cloud billing"
    echo "- Contact: chetankhairnar21@gmail.com for support"
}

# Main deployment process
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║        AARADHYA CLASSES - GOOGLE CLOUD DEPLOYMENT           ║"
    echo "║                    Full Stack Application                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    check_requirements
    setup_project
    setup_database
    setup_storage
    install_dependencies

    APP_URL=$(deploy_application)

    setup_cron_jobs
    print_summary "$APP_URL"
}

# Run deployment if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
