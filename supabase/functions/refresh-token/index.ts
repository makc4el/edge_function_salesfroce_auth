// @ts-ignore - Deno module import for Supabase Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  refresh_token?: string; // Optional - Salesforce may or may not return a new refresh token
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
  supabaseUrl?: string;
  supabaseServiceKey?: string;
}

// Helper function to get environment variables
function getEnvironmentConfig(): EnvironmentConfig {
  return {
    clientId: Deno.env.get('SALESFORCE_CLIENT_ID'),
    clientSecret: Deno.env.get('SALESFORCE_CLIENT_SECRET'),
    supabaseUrl: Deno.env.get('SUPABASE_URL'),
    supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
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
  console.log(`   Full Salesforce Response:`, JSON.stringify(tokenData, null, 2));
  
  return tokenData;
}

// Read OAuth data from vault using userId as key
async function readFromVault(userId: string): Promise<any> {
  const config = getEnvironmentConfig();
  
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('Supabase URL or Service Key not configured for vault operations');
  }
  
  try {
    console.log('🔧 Environment check:');
    console.log(`   Supabase URL: ${config.supabaseUrl ? 'Set' : 'Missing'}`);
    console.log(`   Service Key: ${config.supabaseServiceKey ? 'Set' : 'Missing'}`);
    
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    
    console.log('🔍 Attempting to read from vault...');
    console.log(`   User ID: ${userId}`);
    
    // Try to read the secret using the userId as the secret name
    const { data, error } = await supabase.rpc('read_vault_secret', {
      secret_name: userId
    });
    
    if (error) {
      console.error('❌ Failed to read from vault:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to read from vault: ${error.message}`);
    }
    
    console.log('📝 Vault read response:', JSON.stringify(data, null, 2));
    
    // The vault API returns the data directly as a JSON string, not wrapped in a 'secret' property
    if (!data) {
      throw new Error(`No data found in vault for userId: ${userId}`);
    }
    
    // Parse the stored JSON data directly
    const oauthData = JSON.parse(data);
    console.log(`✅ Successfully retrieved OAuth data for userId: ${userId}`);
    return oauthData;
  } catch (vaultError) {
    console.error('❌ Vault read error:', vaultError);
    throw vaultError;
  }
}

// Update vault with refreshed tokens using same userId key
async function updateVault(userId: string, refreshedData: any): Promise<void> {
  const config = getEnvironmentConfig();
  
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('Supabase URL or Service Key not configured for vault operations');
  }
  
  try {
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    
    const { error } = await supabase.rpc('update_vault_secret', {
      secret_id: userId,
      secret: JSON.stringify(refreshedData),
      description: `Refreshed OAuth response for userId: ${userId}`
    });
    
    if (error) {
      console.error('❌ Failed to update vault:', error);
      throw new Error(`Failed to update vault: ${error.message}`);
    }
    
    console.log(`✅ Successfully updated vault for userId: ${userId}`);
  } catch (vaultError) {
    console.error('❌ Vault update error:', vaultError);
    throw vaultError;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`🔄 Token refresh endpoint hit - ${req.method} request`)

    // Extract userId from query parameters
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      throw new Error('Missing required parameter: userId');
    }
    
    console.log(`🆔 User ID: ${userId}`);

    // Read OAuth data from vault using userId as key
    let oauthData: any;
    try {
      oauthData = await readFromVault(userId);
      console.log('📝 OAuth data retrieved from vault');
    } catch (vaultError) {
      throw new Error(`Failed to read OAuth data from vault: ${vaultError instanceof Error ? vaultError.message : 'Unknown vault error'}`);
    }

    // Validate required fields from vault data
    if (!oauthData.refreshToken) {
      throw new Error('Missing refreshToken in vault data');
    }
    
    if (!oauthData.instanceUrl) {
      throw new Error('Missing instanceUrl in vault data');
    }

    try {
      // Refresh the access token using data from vault
      const refreshedTokens = await refreshAccessToken(oauthData.refreshToken, oauthData.instanceUrl);
      
      // Create updated OAuth data with refreshed tokens
      const updatedOauthData = {
        ...oauthData, // Keep all existing data
        instanceUrl: refreshedTokens.instance_url,
        accessToken: refreshedTokens.access_token,
        tokenType: refreshedTokens.token_type,
        expiresIn: refreshedTokens.expires_in,
        // Update refresh token if Salesforce returned a new one
        ...(refreshedTokens.refresh_token && { refreshToken: refreshedTokens.refresh_token }),
        ...(refreshedTokens.scope && { scope: refreshedTokens.scope }),
        ...(refreshedTokens.issued_at && { issuedAt: refreshedTokens.issued_at })
      };
      
      // Update vault with refreshed tokens
      await updateVault(userId, updatedOauthData);
      
      // Print new credentials
      console.log('🎉 NEW CREDENTIALS:');
      console.log(`   User ID: ${userId}`);
      console.log(`   Instance URL: ${updatedOauthData.instanceUrl}`);
      console.log(`   Access Token: ${updatedOauthData.accessToken.substring(0, 30)}...`);
      console.log(`   Token Type: ${updatedOauthData.tokenType}`);
      console.log(`   Expires In: ${updatedOauthData.expiresIn} seconds`);
      console.log(`   Refresh Token: ${updatedOauthData.refreshToken.substring(0, 30)}...`);
      
      // Return the updated token data
      const response: TokenRefreshSuccessResponse = {
        instanceUrl: updatedOauthData.instanceUrl,
        accessToken: updatedOauthData.accessToken,
        tokenType: updatedOauthData.tokenType,
        refreshToken: updatedOauthData.refreshToken,
        expiresIn: updatedOauthData.expiresIn,
        ...(updatedOauthData.scope && { scope: updatedOauthData.scope }),
        ...(updatedOauthData.issuedAt && { issuedAt: updatedOauthData.issuedAt }),
        ...(updatedOauthData.authCode && { authCode: updatedOauthData.authCode })
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
console.log('📡 Expecting GET with userId parameter: /refresh-token?userId=your-user-id')