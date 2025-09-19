// @ts-ignore - Deno module import for Supabase Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input token data structure
interface TokenRefreshRequest {
  instanceUrl: string;
  accessToken: string;
  tokenType: string;
  refreshToken: string;
  scope?: string;
  authCode?: string;
}

// Response from Salesforce refresh token endpoint
interface SalesforceRefreshResponse {
  access_token: string;
  instance_url: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  id?: string;
  signature?: string;
  issued_at?: string;
}

// Success response format
interface TokenRefreshSuccessResponse {
  instanceUrl: string;
  accessToken: string;
  tokenType: string;
  refreshToken: string; // Keep the same refresh token
  scope?: string;
  authCode?: string; // Keep the original auth code if provided
  expiresIn: number;
  issuedAt?: string;
}

// Error response format
interface TokenRefreshErrorResponse {
  success: false;
  error: string;
  error_description?: string;
  details?: string;
}

// Environment variables
interface EnvironmentConfig {
  clientId?: string;
  clientSecret?: string;
}

// Helper function to get environment variables
function getEnvironmentConfig(): EnvironmentConfig {
  return {
    clientId: Deno.env.get('SALESFORCE_CLIENT_ID'),
    clientSecret: Deno.env.get('SALESFORCE_CLIENT_SECRET'),
  };
}

// Refresh access token using refresh token
async function refreshAccessToken(refreshToken: string, instanceUrl: string): Promise<SalesforceRefreshResponse> {
  const config = getEnvironmentConfig();
  
  if (!config.clientId || !config.clientSecret) {
    throw new Error('SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET environment variables are required for token refresh');
  }
  
  // Convert Lightning domain to OAuth endpoint if needed
  let oauthInstanceUrl = instanceUrl;
  if (instanceUrl.includes('lightning.force.com')) {
    oauthInstanceUrl = instanceUrl
      .replace('develop.lightning.force.com', 'develop.my.salesforce.com')
      .replace('lightning.force.com', 'my.salesforce.com');
  }
  
  // Remove trailing slash for OAuth endpoint
  oauthInstanceUrl = oauthInstanceUrl.replace(/\/$/, '');
  
  const tokenEndpoint = `${oauthInstanceUrl}/services/oauth2/token`;
  
  const refreshPayload = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret
  };
  
  console.log('🔄 Refreshing access token');
  console.log(`   Token endpoint: ${tokenEndpoint}`);
  console.log(`   Client ID: ${config.clientId}`);
  console.log(`   Refresh token: ${refreshToken.substring(0, 30)}...`);
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'Supabase-Edge-Function/1.0'
    },
    body: new URLSearchParams(refreshPayload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorDetails: any;
    
    try {
      errorDetails = JSON.parse(errorText);
    } catch {
      errorDetails = { error: 'unknown_error', error_description: errorText };
    }
    
    console.error('❌ Token refresh failed:', errorDetails);
    throw new Error(`Token refresh failed: ${errorDetails.error_description || errorDetails.error || errorText}`);
  }
  
  const tokenData: SalesforceRefreshResponse = await response.json();
  
  console.log('✅ Token refresh successful!');
  console.log(`   New Access Token: ${tokenData.access_token.substring(0, 30)}...`);
  console.log(`   Instance URL: ${tokenData.instance_url}`);
  console.log(`   Token Type: ${tokenData.token_type}`);
  console.log(`   Expires In: ${tokenData.expires_in} seconds`);
  
  return tokenData;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`🔄 Token refresh endpoint hit - ${req.method} request`)

    if (req.method !== 'POST') {
      throw new Error(`Unsupported HTTP method: ${req.method}. Only POST is supported.`)
    }

    // Parse request body
    let tokenData: TokenRefreshRequest;
    try {
      tokenData = await req.json() as TokenRefreshRequest;
      console.log('📝 Token refresh request data received');
    } catch (jsonError) {
      throw new Error(`Invalid JSON in request: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`)
    }

    // Validate required fields
    if (!tokenData.refreshToken) {
      throw new Error('Missing required field: refreshToken');
    }
    
    if (!tokenData.instanceUrl) {
      throw new Error('Missing required field: instanceUrl');
    }

    try {
      // Refresh the access token
      const refreshedTokens = await refreshAccessToken(tokenData.refreshToken, tokenData.instanceUrl);
      
      // Return the updated token data in the same format as input
      const response: TokenRefreshSuccessResponse = {
        instanceUrl: refreshedTokens.instance_url,
        accessToken: refreshedTokens.access_token,
        tokenType: refreshedTokens.token_type,
        refreshToken: tokenData.refreshToken, // Keep the same refresh token
        expiresIn: refreshedTokens.expires_in,
        ...(refreshedTokens.scope && { scope: refreshedTokens.scope }),
        ...(refreshedTokens.issued_at && { issuedAt: refreshedTokens.issued_at }),
        // Keep original fields if they were provided
        ...(tokenData.authCode && { authCode: tokenData.authCode })
      }
      
      console.log('✅ Token refresh completed successfully!');
      
      return new Response(
        JSON.stringify(response, null, 2),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } catch (refreshError) {
      console.error('❌ Token refresh failed:', refreshError);
      
      const errorResponse: TokenRefreshErrorResponse = {
        success: false,
        error: 'token_refresh_failed',
        error_description: refreshError instanceof Error ? refreshError.message : 'Unknown token refresh error',
        details: `Failed to refresh access token: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`
      }
      
      return new Response(
        JSON.stringify(errorResponse, null, 2),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

  } catch (error) {
    console.error('❌ Request processing error:', error)
    
    const errorResponse: TokenRefreshErrorResponse = {
      success: false,
      error: 'request_processing_failed',
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

console.log('🚀 Salesforce Token Refresh Function is ready!')
console.log('📡 Expecting POST with: { instanceUrl, accessToken, tokenType, refreshToken, scope?, authCode? }')