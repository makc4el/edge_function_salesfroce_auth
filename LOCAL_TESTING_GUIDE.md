# 🧪 Local Testing Guide

This guide will help you test your Salesforce Authentication Layer Edge Function locally before deploying to production.

## 📋 Prerequisites

- **Supabase CLI** - Will be installed automatically by the script
- **Node.js** (optional, for package scripts)
- **jq** (optional, for pretty JSON output)

## 🚀 Quick Start

### 1. Set Up Environment Variables

```bash
# Copy the template and edit with your credentials
cp env.local.template .env.local

# Edit .env.local with your actual Salesforce credentials
# Required variables:
# - SALESFORCE_CLIENT_ID (from your Salesforce Connected App)
# - SALESFORCE_CLIENT_SECRET (from your Salesforce Connected App)
# - SALESFORCE_USERNAME (your Salesforce username)
# - SALESFORCE_PASSWORD (your password + security token)
```

### 2. Run Local Testing

```bash
# Make the script executable (if not already)
chmod +x local-test.sh

# Run the comprehensive testing script
./local-test.sh
```

The script will:
- ✅ Check prerequisites and install Supabase CLI if needed
- ✅ Create `.env.local` from template if it doesn't exist
- ✅ Start the local Edge Functions server
- ✅ Run automated tests or provide interactive testing

## 🔧 Manual Testing

### Start Functions Server Only

```bash
# Start the server manually
supabase functions serve --no-verify-jwt --env-file .env.local

# The function will be available at:
# http://localhost:54323/functions/v1/salesforce-auth
```

### Test with cURL

```bash
# Test login with environment variables
curl -X POST 'http://localhost:54323/functions/v1/salesforce-auth' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  -H 'Content-Type: application/json' \
  -d '{"action": "login"}'

# Test login with request parameters
curl -X POST 'http://localhost:54323/functions/v1/salesforce-auth' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "login",
    "username": "your-username@company.com",
    "password": "your-password-with-token",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret"
  }'
```

## 📊 Available Tests

The testing script provides several test scenarios:

### 1. **CORS Preflight Test**
- Verifies that web applications can call the function
- Tests proper CORS headers

### 2. **Environment Variable Login**
- Tests login using credentials from `.env.local`
- Useful for default credentials setup

### 3. **Request Parameter Login**  
- Tests login with credentials passed in the request
- Allows different credentials per request

### 4. **Token Verification**
- Tests the token verification endpoint
- Validates Salesforce tokens

### 5. **Token Refresh**
- Tests the token refresh functionality
- Renews expired access tokens

## 🛠️ Environment Variables Reference

### Required Variables
```bash
# Supabase (automatically set for local development)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Salesforce (get from your Connected App)
SALESFORCE_CLIENT_ID=3MVG9...
SALESFORCE_CLIENT_SECRET=1234567890...
SALESFORCE_USERNAME=your-username@company.com
SALESFORCE_PASSWORD=your-password-with-security-token
```

### Optional Variables
```bash
# Salesforce environment
SALESFORCE_LOGIN_URL=https://login.salesforce.com  # or https://test.salesforce.com for sandbox

# Debug settings
DEBUG=true
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
```

## 🎯 Testing Modes

### 1. Automated Testing
- Runs all test scenarios automatically
- Good for quick validation

### 2. Interactive Testing
- Allows manual input of credentials
- Good for testing different scenarios
- Provides immediate feedback

### 3. Manual Server Mode
- Keeps the server running
- Allows external tool testing (Postman, etc.)
- Good for frontend development

## 🔍 Troubleshooting

### Common Issues

#### **Function server won't start**
```bash
# Kill any existing processes on port 54323
lsof -ti:54323 | xargs kill -9

# Try starting again
./local-test.sh
```

#### **"Missing required environment variable" error**
- Check your `.env.local` file exists
- Verify all required variables are set
- Make sure there are no spaces around the `=` signs

#### **Salesforce authentication fails**
- Verify your Connected App credentials
- Check if your password includes the security token
- Ensure your user has API access enabled

#### **CORS errors in browser**
- The function includes proper CORS headers
- Check that you're using the correct local URL
- Verify the request includes proper headers

### Debug Mode

Enable detailed logging:
```bash
# In .env.local
DEBUG=true
ENABLE_REQUEST_LOGGING=true
LOG_LEVEL=debug
```

## 📚 Next Steps

1. **Test with real credentials** in local environment
2. **Integrate with your frontend** application
3. **Test different Salesforce environments** (sandbox vs production)
4. **Deploy to production** when local testing passes
5. **Monitor and log** production usage

## 🔗 Related Files

- `env.local.template` - Environment variables template
- `local-test.sh` - Main testing script  
- `supabase/functions/salesforce-auth/index.ts` - Function source code
- `supabase/config.toml` - Supabase configuration

---

**Happy testing! 🚀** Your function is now ready for comprehensive local testing before production deployment.
