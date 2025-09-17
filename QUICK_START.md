# 🚀 Quick Start - Public Callback Function

Your Salesforce OAuth Callback Function is now **live and public**!

## 📍 **Public Endpoint**
```
https://prtctipgoioqpytelojf.supabase.co/functions/v1/callback
```

## 🧪 **Test it Right Now**

### Success Test:
```bash
curl -X POST "https://prtctipgoioqpytelojf.supabase.co/functions/v1/callback" \
  -H "Content-Type: application/json" \
  -d '[{"query": {"code": "test-code-123"}}]'
```

### Error Test:
```bash
curl -X POST "https://prtctipgoioqpytelojf.supabase.co/functions/v1/callback" \
  -H "Content-Type: application/json" \
  -d '[{"query": {"error": "access_denied", "error_description": "User denied"}}]'
```

## ✅ **Key Benefits**

- ✅ **No Authentication Required** - Call directly from any application
- ✅ **CORS Enabled** - Works from browsers, mobile apps, etc.
- ✅ **Full TypeScript Types** - Comprehensive error handling
- ✅ **Production Ready** - Deployed and monitored

## 📚 **Next Steps**

1. **Read the full documentation**: [PUBLIC_API_USAGE.md](./PUBLIC_API_USAGE.md)
2. **Monitor usage**: [Supabase Dashboard](https://supabase.com/dashboard/project/prtctipgoioqpytelojf/functions)
3. **Integration examples**: Check the detailed usage guide

---
🎉 **Your function is ready to handle Salesforce OAuth callbacks!**
