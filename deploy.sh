#!/bin/bash

# Ottoman Banknote Archive Hub - Google Cloud Run Deployment Script
# This script helps you deploy your React application to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="ottoman-banknote-archive-hub"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo -e "${BLUE}🚀 Ottoman Banknote Archive Hub - Google Cloud Run Deployment${NC}"
echo "=================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI (gcloud) is not installed.${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  You are not authenticated with Google Cloud.${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Get project ID if not set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}📋 Getting current project...${NC}"
    PROJECT_ID=$(gcloud config get-value project)
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}❌ No project ID found. Please set it:${NC}"
        echo "gcloud config set project YOUR_PROJECT_ID"
        exit 1
    fi
    echo -e "${GREEN}✅ Using project: $PROJECT_ID${NC}"
fi

# Update IMAGE_NAME with actual project ID
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo -e "${BLUE}🔧 Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service Name: $SERVICE_NAME"
echo "  Image: $IMAGE_NAME"
echo ""

# Enable required APIs
echo -e "${YELLOW}🔌 Enabling required Google Cloud APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push the image using Node.js server (more reliable for Cloud Run)
echo -e "${YELLOW}🏗️  Building and pushing Docker image...${NC}"
gcloud builds submit --tag $IMAGE_NAME

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --concurrency 80 \
    --timeout 300

# Get the service URL
echo -e "${YELLOW}🔗 Getting service URL...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "=================================================="
echo -e "${GREEN}✅ Service URL: $SERVICE_URL${NC}"
echo -e "${GREEN}✅ Service Name: $SERVICE_NAME${NC}"
echo -e "${GREEN}✅ Region: $REGION${NC}"
echo ""
echo -e "${BLUE}📋 Useful commands:${NC}"
echo "  View logs: gcloud run logs tail $SERVICE_NAME --region=$REGION"
echo "  Update service: gcloud run deploy $SERVICE_NAME --image $IMAGE_NAME --region $REGION"
echo "  Delete service: gcloud run services delete $SERVICE_NAME --region $REGION"
echo ""
echo -e "${YELLOW}💡 Don't forget to:${NC}"
echo "  1. Update your Supabase configuration for production"
echo "  2. Set up custom domain (optional)"
echo "  3. Configure environment variables if needed"
echo "  4. Set up monitoring and alerts"
