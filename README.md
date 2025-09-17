# Salesforce Auth Layer - Supabase Edge Functions

A Supabase Edge Functions project that provides authentication services for Salesforce integration.

## Project Structure

```
salesfroce_auth_layer/
├── supabase/
│   ├── config.toml              # Supabase configuration
│   └── functions/
│       └── salesforce-auth/
│           └── index.ts         # Main authentication function
├── package.json                 # Project dependencies and scripts
├── .env.local                  # Environment variables (local)
└── README.md                   # This file
```

## Features

The `salesforce-auth` edge function provides:

1. **Salesforce Authentication** - OAuth2 password flow login
2. **Token Verification** - Verify existing Salesforce tokens
3. **Token Refresh** - Refresh expired access tokens
4. **CORS Support** - Properly configured for web applications

## Prerequisites

Before getting started, make sure you have:

1. [Supabase CLI](https://supabase.com/docs/guides/cli) installed
2. [Docker](https://www.docker.com/) installed (for local development)
3. A Supabase account and project

## Local Development Setup

1. **Initialize Supabase** (if not already done):
   ```bash
   supabase init
   ```

2. **Start the local Supabase stack**:
   ```bash
   npm run start
   # or
   supabase start
   ```

3. **Serve the functions locally**:
   ```bash
   npm run serve
   # or
   supabase functions serve
   ```

4. **Test the function**:
   ```bash
   curl -X POST 'http://localhost:54323/functions/v1/salesforce-auth' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "username": "your-salesforce-username",
       "password": "your-salesforce-password",
       "clientId": "your-salesforce-client-id",
       "clientSecret": "your-salesforce-client-secret",
       "action": "login"
     }'
   ```

## API Usage

### Authentication Endpoint

**POST** `/functions/v1/salesforce-auth`

#### Login
```json
{
  "action": "login",
  "username": "user@example.com",
  "password": "password123",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "loginUrl": "https://login.salesforce.com" // optional, defaults to login.salesforce.com
}
```

#### Token Verification
```json
{
  "action": "verify"
}
```
*Note: Requires `Authorization: Bearer <token>` header*

#### Token Refresh
```json
{
  "action": "refresh",
  "refresh_token": "your-refresh-token",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret"
}
```

## Deployment

### Deploy to Supabase

1. **Login to Supabase CLI**:
   ```bash
   supabase login
   ```

2. **Link your project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Deploy the function**:
   ```bash
   npm run deploy:salesforce-auth
   # or
   supabase functions deploy salesforce-auth
   ```

### Environment Variables

For production, set these environment variables in your Supabase dashboard:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (if needed)

## Security Notes

1. **Never expose client secrets** in frontend code
2. **Use HTTPS** in production
3. **Validate all inputs** on the server side
4. **Store sensitive credentials** securely using Supabase secrets or environment variables
5. **Implement rate limiting** for production use

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure the function includes proper CORS headers
2. **Authentication Failures**: Check your Salesforce credentials and connected app configuration
3. **Network Timeouts**: Verify your Salesforce instance URL and network connectivity

### Logs

View function logs:
```bash
npm run logs
# or
supabase functions logs salesforce-auth
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License
