// @ts-ignore - Deno module import for Supabase Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Salesforce OAuth callback query parameters (success case)
interface SalesforceOAuthSuccess {
  code: string;                    // Authorization code
  state?: string;                  // CSRF protection parameter
  instance_url?: string;           // Salesforce instance URL
  id?: string;                     // User identity URL
  issued_at?: string;              // Token issuance timestamp
  signature?: string;              // OAuth signature
  scope?: string;                  // Granted scopes
}

// Salesforce OAuth callback query parameters (error case)
interface SalesforceOAuthError {
  error: string;                   // Error code (e.g., 'access_denied', 'invalid_request')
  error_description?: string;      // Human-readable error description
  error_uri?: string;              // URI with error information
  state?: string;                  // CSRF protection parameter
}

// Union type for OAuth callback query parameters
type SalesforceOAuthQuery = SalesforceOAuthSuccess | SalesforceOAuthError;

// Request headers that might contain useful information
interface CallbackHeaders {
  referer?: string;                // Salesforce instance URL
  'user-agent'?: string;           // Client user agent
  authorization?: string;          // Bearer token if present
  'x-forwarded-for'?: string;      // Client IP if behind proxy
  [key: string]: string | undefined;
}

// Complete callback request data structure
interface CallbackRequestData {
  timestamp?: string;              // Request timestamp
  method?: string;                 // HTTP method (usually GET)
  url?: string;                    // Full callback URL
  headers?: CallbackHeaders;       // Request headers
  query?: SalesforceOAuthQuery;    // OAuth callback parameters
  params?: Record<string, any>;    // URL path parameters
  body?: Record<string, any>;      // Request body (usually empty for OAuth)
  ip?: string;                     // Client IP address
  userAgent?: string;              // Client user agent
}

// Helper type guards
function isSalesforceOAuthSuccess(query: SalesforceOAuthQuery): query is SalesforceOAuthSuccess {
  return 'code' in query;
}

function isSalesforceOAuthError(query: SalesforceOAuthQuery): query is SalesforceOAuthError {
  return 'error' in query;
}

// Response types
interface CallbackSuccessResponse {
  instanceUrl: string;
  authCode: string;
  state?: string;
  scope?: string;
}

interface CallbackErrorResponse {
  error: string;
  error_description?: string;
  details?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Callback endpoint hit')

    // Parse the incoming data
    const requestData = await req.json() as CallbackRequestData[]
    
    console.log('📝 Raw callback data received:', requestData)

    // Extract the first item from the array
    const callbackData = requestData[0]
    
    if (!callbackData) {
      throw new Error('No callback data received')
    }

    // Check if we have query parameters
    if (!callbackData.query) {
      throw new Error('No query parameters found in callback data')
    }

    // Check for OAuth errors first
    if (isSalesforceOAuthError(callbackData.query)) {
      const errorResponse: CallbackErrorResponse = {
        error: callbackData.query.error,
        error_description: callbackData.query.error_description,
        details: `OAuth error: ${callbackData.query.error}${callbackData.query.error_description ? ' - ' + callbackData.query.error_description : ''}`
      }
      
      console.log('❌ OAuth error received:', errorResponse)
      
      return new Response(
        JSON.stringify(errorResponse, null, 2),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Handle successful OAuth callback
    if (isSalesforceOAuthSuccess(callbackData.query)) {
      const { code: authCode, state, scope } = callbackData.query
      
      // Extract instance URL from multiple sources
      let instanceUrl: string = "https://orgfarm-a3ae3ef50e-dev-ed.develop.lightning.force.com/"
      
      // Priority 1: Direct instance_url from query params
      if (callbackData.query.instance_url) {
        instanceUrl = callbackData.query.instance_url
        // Ensure trailing slash
        if (!instanceUrl.endsWith('/')) {
          instanceUrl += '/'
        }
      }
      // Priority 2: Extract from referer header
      else if (callbackData.headers?.referer) {
        try {
          const refererUrl = new URL(callbackData.headers.referer)
          instanceUrl = `${refererUrl.protocol}//${refererUrl.host}/`
          
          // Convert from my.salesforce.com to lightning.force.com format if needed
          if (instanceUrl.includes('.my.salesforce.com/')) {
            instanceUrl = instanceUrl.replace('.my.salesforce.com/', '.lightning.force.com/')
          }
        } catch (urlError) {
          console.warn('⚠️ Failed to parse referer URL:', callbackData.headers.referer)
        }
      }

      // Return the successful response
      const response: CallbackSuccessResponse = {
        instanceUrl,
        authCode,
        ...(state && { state }),
        ...(scope && { scope })
      }
      
      console.log('✅ Processed successful OAuth callback:', response)
      
      return new Response(
        JSON.stringify(response, null, 2),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // If we get here, the query parameters don't match expected OAuth format
    throw new Error('Invalid OAuth callback format - missing required parameters')


  } catch (error) {
    console.error('❌ Callback processing error:', error)
    
    const errorResponse: CallbackErrorResponse = {
      error: 'Callback processing failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }
    
    return new Response(
      JSON.stringify(errorResponse, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})

console.log('🚀 Salesforce Callback Function is ready!')
console.log('📡 Expecting format: [{ query: { code: "..." }, headers: { referer: "..." } }]')
