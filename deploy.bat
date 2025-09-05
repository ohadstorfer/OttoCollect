@echo off
REM Ottoman Banknote Archive Hub - Google Cloud Run Deployment Script for Windows
REM This script helps you deploy your React application to Google Cloud Run

setlocal enabledelayedexpansion

REM Configuration
set PROJECT_ID=
set REGION=us-central1
set SERVICE_NAME=ottoman-banknote-archive-hub

echo 🚀 Ottoman Banknote Archive Hub - Google Cloud Run Deployment
echo ==================================================

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Google Cloud CLI (gcloud) is not installed.
    echo Please install it from: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

REM Check if user is authenticated
gcloud auth list --filter=status:ACTIVE --format="value(account)" >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  You are not authenticated with Google Cloud.
    echo Please run: gcloud auth login
    pause
    exit /b 1
)

REM Get project ID if not set
if "%PROJECT_ID%"=="" (
    echo 📋 Getting current project...
    for /f "tokens=*" %%i in ('gcloud config get-value project') do set PROJECT_ID=%%i
    if "%PROJECT_ID%"=="" (
        echo ❌ No project ID found. Please set it:
        echo gcloud config set project YOUR_PROJECT_ID
        pause
        exit /b 1
    )
    echo ✅ Using project: %PROJECT_ID%
)

set IMAGE_NAME=gcr.io/%PROJECT_ID%/%SERVICE_NAME%

echo 🔧 Configuration:
echo   Project ID: %PROJECT_ID%
echo   Region: %REGION%
echo   Service Name: %SERVICE_NAME%
echo   Image: %IMAGE_NAME%
echo.

REM Enable required APIs
echo 🔌 Enabling required Google Cloud APIs...
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

REM Build and push the image using Node.js server (more reliable for Cloud Run)
echo 🏗️  Building and pushing Docker image...
gcloud builds submit --tag %IMAGE_NAME%

REM Deploy to Cloud Run
echo 🚀 Deploying to Cloud Run...
gcloud run deploy %SERVICE_NAME% ^
    --image %IMAGE_NAME% ^
    --region %REGION% ^
    --platform managed ^
    --allow-unauthenticated ^
    --port 8080 ^
    --memory 1Gi ^
    --cpu 1 ^
    --min-instances 0 ^
    --max-instances 10 ^
    --concurrency 80 ^
    --timeout 300

REM Get the service URL
echo 🔗 Getting service URL...
for /f "tokens=*" %%i in ('gcloud run services describe %SERVICE_NAME% --region=%REGION% --format="value(status.url)"') do set SERVICE_URL=%%i

echo.
echo 🎉 Deployment completed successfully!
echo ==================================================
echo ✅ Service URL: %SERVICE_URL%
echo ✅ Service Name: %SERVICE_NAME%
echo ✅ Region: %REGION%
echo.
echo 📋 Useful commands:
echo   View logs: gcloud run logs tail %SERVICE_NAME% --region=%REGION%
echo   Update service: gcloud run deploy %SERVICE_NAME% --image %IMAGE_NAME% --region %REGION%
echo   Delete service: gcloud run services delete %SERVICE_NAME% --region %REGION%
echo.
echo 💡 Don't forget to:
echo   1. Update your Supabase configuration for production
echo   2. Set up custom domain (optional)
echo   3. Configure environment variables if needed
echo   4. Set up monitoring and alerts

pause
