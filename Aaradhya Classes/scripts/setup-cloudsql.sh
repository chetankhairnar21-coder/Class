#!/bin/bash
# Cloud SQL Setup Script for Aaradhya Tuition System

PROJECT_ID="your-project-id"
INSTANCE_NAME="aaradhya-tuition-db"
REGION="asia-south1"
DATABASE_NAME="tuition_management"
ROOT_PASSWORD="$(openssl rand -base64 32)"

echo "🚀 Setting up Cloud SQL instance for Aaradhya Tuition System"
echo "Project: $PROJECT_ID"
echo "Instance: $INSTANCE_NAME"
echo "Region: $REGION"

# Create Cloud SQL instance
echo "📦 Creating Cloud SQL MySQL instance..."
gcloud sql instances create $INSTANCE_NAME \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region=$REGION \
    --root-password="$ROOT_PASSWORD" \
    --backup-start-time=02:00 \
    --enable-bin-log \
    --storage-type=SSD \
    --storage-size=10GB \
    --storage-auto-increase \
    --project=$PROJECT_ID

# Create database
echo "🗄️ Creating database: $DATABASE_NAME"
gcloud sql databases create $DATABASE_NAME \
    --instance=$INSTANCE_NAME \
    --project=$PROJECT_ID

# Create application user
echo "👤 Creating application user..."
APP_USER_PASSWORD="$(openssl rand -base64 32)"
gcloud sql users create appuser \
    --instance=$INSTANCE_NAME \
    --password="$APP_USER_PASSWORD" \
    --project=$PROJECT_ID

# Grant permissions
echo "🔐 Setting up user permissions..."
gcloud sql databases create $DATABASE_NAME --instance=$INSTANCE_NAME

echo "✅ Cloud SQL setup completed!"
echo ""
echo "📋 Configuration Summary:"
echo "Instance Name: $INSTANCE_NAME"
echo "Database Name: $DATABASE_NAME"
echo "Root Password: $ROOT_PASSWORD"
echo "App User: appuser"
echo "App Password: $APP_USER_PASSWORD"
echo ""
echo "📝 Update your app.yaml with these values:"
echo "DB_HOST: /cloudsql/$PROJECT_ID:$REGION:$INSTANCE_NAME"
echo "DB_USER: appuser"
echo "DB_PASSWORD: $APP_USER_PASSWORD"
echo "DB_NAME: $DATABASE_NAME"
echo ""
echo "⚠️  Save these credentials securely!"
