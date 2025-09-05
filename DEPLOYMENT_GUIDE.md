# 🚀 Ottoman Banknote Archive Hub - Google Cloud Run Deployment Guide

This guide will help you deploy your React application to Google Cloud Run.

## 📋 Prerequisites

1. **Google Cloud Account**: Sign up at [Google Cloud Console](https://console.cloud.google.com/)
2. **Google Cloud CLI**: Install from [here](https://cloud.google.com/sdk/docs/install)
3. **Docker**: Install from [here](https://docs.docker.com/get-docker/)
4. **Node.js**: Version 18 or higher

## 🔧 Setup Steps

### 1. Install Google Cloud CLI

**Windows:**
```bash
# Download and run the installer from:
# https://cloud.google.com/sdk/docs/install-sdk#windows
```

**macOS:**
```bash
# Using Homebrew
brew install google-cloud-sdk

# Or download from:
# https://cloud.google.com/sdk/docs/install-sdk#mac
```

**Linux:**
```bash
# Download and run the installer
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 2. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud auth application-default login
```

### 3. Create a New Project (Optional)

```bash
# Create a new project
gcloud projects create ottoman-banknote-hub --name="Ottoman Banknote Archive Hub"

# Set as default project
gcloud config set project ottoman-banknote-hub
```

### 4. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## 🚀 Deployment Methods

### Method 1: Using the Deployment Script (Recommended)

**For Windows:**
```bash
deploy.bat
```

**For macOS/Linux:**
```bash
./deploy.sh
```

### Method 2: Manual Deployment

#### Step 1: Build and Push Docker Image

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export SERVICE_NAME="ottoman-banknote-archive-hub"
export IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Build and push the image
gcloud builds submit --tag $IMAGE_NAME
```

#### Step 2: Deploy to Cloud Run

```bash
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --concurrency 80 \
    --timeout 300
```

### Method 3: Using Cloud Build with cloudbuild.yaml

```bash
# Trigger a build using the cloudbuild.yaml file
gcloud builds submit --config cloudbuild.yaml
```

## 🔧 Configuration

### Environment Variables

If your application needs environment variables, you can set them during deployment:

```bash
gcloud run deploy ottoman-banknote-archive-hub \
    --image gcr.io/$PROJECT_ID/ottoman-banknote-archive-hub \
    --region us-central1 \
    --set-env-vars="NODE_ENV=production,API_URL=https://your-api.com"
```

### Custom Domain (Optional)

1. **Map a custom domain:**
```bash
gcloud run domain-mappings create \
    --service ottoman-banknote-archive-hub \
    --domain your-domain.com \
    --region us-central1
```

2. **Update your DNS records** as instructed by the command output.

## 📊 Monitoring and Management

### View Logs

```bash
# View recent logs
gcloud run logs tail ottoman-banknote-archive-hub --region us-central1

# View logs from a specific time
gcloud run logs read ottoman-banknote-archive-hub --region us-central1 --limit 50
```

### Update Service

```bash
# Rebuild and redeploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/ottoman-banknote-archive-hub
gcloud run deploy ottoman-banknote-archive-hub \
    --image gcr.io/$PROJECT_ID/ottoman-banknote-archive-hub \
    --region us-central1
```

### Scale Service

```bash
# Update scaling settings
gcloud run services update ottoman-banknote-archive-hub \
    --region us-central1 \
    --min-instances 1 \
    --max-instances 20
```

## 🔒 Security Considerations

### 1. Supabase Configuration

Update your Supabase configuration for production:

```typescript
// In your Supabase client configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'your-production-url'
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-production-key'
```

### 2. CORS Settings

Ensure your Supabase project allows requests from your Cloud Run domain.

### 3. Environment Variables

Never commit sensitive environment variables to your repository. Use Google Cloud Secret Manager for sensitive data:

```bash
# Create a secret
echo -n "your-secret-value" | gcloud secrets create my-secret --data-file=-

# Use in Cloud Run
gcloud run deploy ottoman-banknote-archive-hub \
    --image gcr.io/$PROJECT_ID/ottoman-banknote-archive-hub \
    --region us-central1 \
    --set-secrets="DATABASE_URL=my-secret:latest"
```

## 🐛 Troubleshooting

### Common Issues

1. **Build fails with "npm ci" error:**
   - Ensure your `package-lock.json` is committed
   - Check that all dependencies are properly listed in `package.json`

2. **Service fails to start:**
   - Check logs: `gcloud run logs tail ottoman-banknote-archive-hub --region us-central1`
   - Verify the port is set to 8080 in your nginx configuration

3. **Static files not loading:**
   - Ensure the build output is in the `dist` directory
   - Check that nginx is serving files from `/usr/share/nginx/html`

4. **CORS errors:**
   - Update your Supabase CORS settings
   - Check that your API endpoints are properly configured

### Debug Commands

```bash
# Check service status
gcloud run services describe ottoman-banknote-archive-hub --region us-central1

# View service configuration
gcloud run services describe ottoman-banknote-archive-hub --region us-central1 --format="export"

# Test the service locally
docker run -p 8080:8080 gcr.io/$PROJECT_ID/ottoman-banknote-archive-hub
```

## 💰 Cost Optimization

### 1. Set Appropriate Limits

```bash
# Set memory and CPU limits based on your needs
gcloud run deploy ottoman-banknote-archive-hub \
    --image gcr.io/$PROJECT_ID/ottoman-banknote-archive-hub \
    --region us-central1 \
    --memory 512Mi \
    --cpu 0.5 \
    --min-instances 0 \
    --max-instances 5
```

### 2. Use Cloud CDN

```bash
# Enable Cloud CDN for better performance and lower costs
gcloud compute backend-services create ottoman-banknote-backend \
    --global

gcloud compute url-maps create ottoman-banknote-map \
    --default-service ottoman-banknote-backend
```

## 📈 Performance Optimization

### 1. Enable Gzip Compression
Already configured in `nginx.conf`

### 2. Set Proper Cache Headers
Already configured in `nginx.conf`

### 3. Use HTTP/2
Cloud Run automatically uses HTTP/2

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Google Cloud Run

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v0
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: ${{ secrets.GCP_PROJECT_ID }}
    
    - name: Deploy to Cloud Run
      run: |
        gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/ottoman-banknote-archive-hub
        gcloud run deploy ottoman-banknote-archive-hub \
          --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/ottoman-banknote-archive-hub \
          --region us-central1 \
          --platform managed
```

## 📞 Support

If you encounter any issues:

1. Check the [Google Cloud Run documentation](https://cloud.google.com/run/docs)
2. Review the [Cloud Build documentation](https://cloud.google.com/build/docs)
3. Check the application logs for specific errors
4. Ensure all prerequisites are properly installed and configured

---

**Happy Deploying! 🎉**
