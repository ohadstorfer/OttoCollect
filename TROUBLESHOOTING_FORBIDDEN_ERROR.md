# 🔧 Troubleshooting "Forbidden" Error on Cloud Run

## ❌ **Error: "Forbidden - Your client does not have permission to get URL / from this server"**

This error typically occurs due to IAM permissions or application issues. Here's how to fix it:

## 🔍 **Step-by-Step Troubleshooting**

### **1. Check IAM Permissions (Most Common Cause)**

**In Google Cloud Console:**
1. Go to **Cloud Run** → **ottoman-banknote-archive-hub**
2. Click on your service name
3. Go to **Security** tab
4. Under **Invoke**, verify that **allUsers** has the **Cloud Run Invoker** role

**If missing, add it:**
1. Click **Add Principal**
2. Enter: `allUsers`
3. Select role: **Cloud Run Invoker**
4. Click **Save**

### **2. Check Service Configuration**

**In Google Cloud Console:**
1. Go to **Cloud Run** → **ottoman-banknote-archive-hub**
2. Click **Edit & Deploy New Revision**
3. Go to **Security** tab
4. Ensure **Allow unauthenticated invocations** is checked
5. Click **Deploy**

### **3. Check Application Logs**

**In Google Cloud Console:**
1. Go to **Cloud Run** → **ottoman-banknote-archive-hub**
2. Click on **Logs** tab
3. Look for error messages or application logs
4. Check if the server is starting correctly

### **4. Test Different Endpoints**

Try these URLs in your browser:
- `https://your-service-url/health` - Should return "healthy"
- `https://your-service-url/` - Should return your React app

### **5. Command Line Fix (if you have gcloud CLI)**

```bash
# Make the service publicly accessible
gcloud run services add-iam-policy-binding ottoman-banknote-archive-hub \
    --region=us-central1 \
    --member="allUsers" \
    --role="roles/run.invoker"

# Check service status
gcloud run services describe ottoman-banknote-archive-hub \
    --region=us-central1 \
    --format="value(status.url)"
```

## 🚀 **Quick Fix Steps**

### **Option 1: Re-deploy with Public Access**
1. Go to **Cloud Run** in Google Cloud Console
2. Click on **ottoman-banknote-archive-hub**
3. Click **Edit & Deploy New Revision**
4. Go to **Security** tab
5. Check **Allow unauthenticated invocations**
6. Click **Deploy**

### **Option 2: Update IAM Policy**
1. Go to **IAM & Admin** → **IAM**
2. Find your Cloud Run service
3. Add **allUsers** with **Cloud Run Invoker** role

## 🔧 **Application-Level Debugging**

The updated `server.js` now includes:
- ✅ Request logging
- ✅ Error handling
- ✅ Better debugging information

**Check logs for:**
- Server startup messages
- Request logs
- Error messages
- Static file serving

## 📊 **Common Issues & Solutions**

### **Issue 1: Service Not Public**
**Solution:** Enable unauthenticated access in Cloud Run console

### **Issue 2: IAM Policy Missing**
**Solution:** Add `allUsers` with `Cloud Run Invoker` role

### **Issue 3: Application Error**
**Solution:** Check logs for server errors

### **Issue 4: Wrong Region**
**Solution:** Ensure you're accessing the correct region URL

## 🧪 **Testing Commands**

```bash
# Test health endpoint
curl https://your-service-url/health

# Test main page
curl https://your-service-url/

# Check service status
gcloud run services describe ottoman-banknote-archive-hub --region=us-central1
```

## 🎯 **Expected Results**

- **Health endpoint**: Should return "healthy"
- **Main page**: Should return your React app HTML
- **Logs**: Should show request logs and server startup messages

## 🚨 **If Still Not Working**

1. **Check the exact error message** in browser developer tools
2. **Verify the service URL** is correct
3. **Check if the service is actually running** (not crashed)
4. **Look at Cloud Run metrics** for request counts
5. **Try accessing from different browsers/devices**

## 📞 **Next Steps**

1. Try the health endpoint first: `https://your-service-url/health`
2. Check the Cloud Run logs for any errors
3. Verify IAM permissions are correct
4. Re-deploy if necessary

The issue is most likely IAM permissions - make sure **allUsers** has **Cloud Run Invoker** access! 🔑
