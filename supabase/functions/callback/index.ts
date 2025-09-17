// @ts-ignore - Deno module import for Supabase Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CallbackRequestData {
  timestamp?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  params?: Record<string, any>;
  body?: Record<string, any>;
  ip?: string;
  userAgent?: string;
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

    // Extract the auth code from query parameters
    const authCode = callbackData.query?.code
    
    if (!authCode) {
      throw new Error('No authorization code found in callback data')
    }

    // Extract instance URL from referer header
    let instanceUrl: string = "https://orgfarm-a3ae3ef50e-dev-ed.develop.lightning.force.com/"
    if (callbackData.headers?.referer) {
      const refererUrl = new URL(callbackData.headers.referer)
      instanceUrl = `${refererUrl.protocol}//${refererUrl.host}/`
      
      // Convert from my.salesforce.com to lightning.force.com format if needed
      if (instanceUrl.includes('.my.salesforce.com/')) {
        instanceUrl = instanceUrl.replace('.my.salesforce.com/', '.lightning.force.com/')
      }
    }

    // Return the simple format you requested
    const response = {
      instanceUrl: instanceUrl,
      authCode: authCode
    }

    console.log('✅ Processed callback:', response)

    return new Response(
      JSON.stringify(response, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Callback processing error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Callback processing failed',
        details: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})

console.log('🚀 Salesforce Callback Function is ready!')
console.log('📡 Expecting format: [{ query: { code: "..." }, headers: { referer: "..." } }]')
