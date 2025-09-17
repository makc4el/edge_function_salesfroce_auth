# 🌍 Public API Usage Guide

Your Salesforce OAuth Callback Function is now **publicly accessible** and requires **no authentication**!

## 📍 **Public Endpoint**

```
https://prtctipgoioqpytelojf.supabase.co/functions/v1/callback
```

## 🚀 **Usage Examples**

### ✅ **Success Case - OAuth Authorization Code**

```bash
curl -X POST "https://prtctipgoioqpytelojf.supabase.co/functions/v1/callback" \
  -H "Content-Type: application/json" \
  -d '[{
    "query": {
      "code": "aPrx5x1yFLl_K.HLJidek9QZyNTdpRSgFl2zHw5E....",
      "instance_url": "https://mydomain.my.salesforce.com/",
      "state": "csrf-protection-token"
    },
    "headers": {
      "referer": "https://mydomain.my.salesforce.com/setup/secur/RemoteAccessAuthorizationPage.apexp"
    }
  }]'
```

**Response:**
```json
{
  "instanceUrl": "https://mydomain.my.salesforce.com/",
  "authCode": "aPrx5x1yFLl_K.HLJidek9QZyNTdpRSgFl2zHw5E....",
  "state": "csrf-protection-token"
}
```

### ❌ **Error Case - OAuth Denied/Error**

```bash
curl -X POST "https://prtctipgoioqpytelojf.supabase.co/functions/v1/callback" \
  -H "Content-Type: application/json" \
  -d '[{
    "query": {
      "error": "access_denied",
      "error_description": "End-user denied authorization",
      "state": "csrf-protection-token"
    }
  }]'
```

**Response:**
```json
{
  "error": "access_denied",
  "error_description": "End-user denied authorization",
  "details": "OAuth error: access_denied - End-user denied authorization"
}
```

## 🔧 **Integration Examples**

### **JavaScript/TypeScript**

```typescript
// Success handler
async function handleSalesforceCallback(oauthData: any) {
  const response = await fetch('https://prtctipgoioqpytelojf.supabase.co/functions/v1/callback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      query: oauthData.query,
      headers: oauthData.headers
    }])
  });
  
  const result = await response.json();
  
  if (result.error) {
    console.error('OAuth Error:', result.error_description);
    return { success: false, error: result };
  }
  
  return { 
    success: true, 
    instanceUrl: result.instanceUrl,
    authCode: result.authCode 
  };
}
```

### **Python**

```python
import requests
import json

def handle_salesforce_callback(oauth_data):
    url = "https://prtctipgoioqpytelojf.supabase.co/functions/v1/callback"
    
    payload = [{
        "query": oauth_data["query"],
        "headers": oauth_data.get("headers", {})
    }]
    
    response = requests.post(url, json=payload)
    result = response.json()
    
    if "error" in result:
        return {"success": False, "error": result}
    
    return {
        "success": True,
        "instance_url": result["instanceUrl"],
        "auth_code": result["authCode"]
    }
```

## 📊 **Expected Data Formats**

### **Input Format**
```typescript
interface CallbackInput {
  query: {
    // Success case
    code?: string;              // OAuth authorization code
    instance_url?: string;      // Salesforce instance URL
    state?: string;            // CSRF protection token
    scope?: string;            // Granted permissions
    
    // Error case
    error?: string;            // Error code (access_denied, etc.)
    error_description?: string; // Human-readable error
    error_uri?: string;        // Error documentation URL
  };
  headers?: {
    referer?: string;          // Salesforce instance URL
    [key: string]: string;
  };
}
```

### **Success Response**
```typescript
interface SuccessResponse {
  instanceUrl: string;  // Clean Salesforce instance URL
  authCode: string;     // OAuth authorization code
  state?: string;       // CSRF token (if provided)
  scope?: string;       // Granted scopes (if provided)
}
```

### **Error Response**
```typescript
interface ErrorResponse {
  error: string;                // Error code
  error_description?: string;   // Detailed error message
  details?: string;            // Additional context
}
```

## 🛡️ **Security Notes**

- ✅ **No Authentication Required**: Public endpoint, no API keys needed
- ✅ **CORS Enabled**: Can be called from any domain
- ✅ **HTTPS Only**: All communication is encrypted
- ✅ **Input Validation**: Comprehensive TypeScript validation
- ⚠️ **Rate Limiting**: Standard Supabase limits apply

## 🔗 **Use Cases**

1. **OAuth Callback Handler**: Process Salesforce OAuth redirects
2. **Webhook Endpoint**: Receive OAuth data from external systems  
3. **Development Testing**: Test OAuth flows without backend setup
4. **Mobile App Integration**: Direct API calls from mobile apps
5. **Third-party Integration**: Allow partners to send OAuth data

## 📈 **Monitoring**

You can monitor function usage in your [Supabase Dashboard](https://supabase.com/dashboard/project/prtctipgoioqpytelojf/functions).

---

🚀 **Your function is now live and ready for production use!**
