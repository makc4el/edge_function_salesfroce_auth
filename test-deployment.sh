#!/bin/bash

# Test deployment script for Salesforce Auth Layer

echo "🚀 Testing Salesforce Auth Layer Deployment"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_status "❌ Supabase CLI is not installed. Please install it first:" $RED
    echo "npm install -g supabase"
    echo "or"
    echo "brew install supabase/tap/supabase"
    exit 1
fi

print_status "✅ Supabase CLI found" $GREEN

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_status "❌ Docker is not running. Please start Docker first." $RED
    exit 1
fi

print_status "✅ Docker is running" $GREEN

# Start Supabase local development
print_status "🔄 Starting Supabase local development..." $YELLOW
supabase start

if [ $? -eq 0 ]; then
    print_status "✅ Supabase started successfully" $GREEN
else
    print_status "❌ Failed to start Supabase" $RED
    exit 1
fi

# Get Supabase status and extract URLs
print_status "📊 Getting Supabase status..." $YELLOW
supabase status

# Serve the functions
print_status "🔄 Starting function server..." $YELLOW
echo "Starting functions in the background..."
supabase functions serve --no-verify-jwt &
SERVE_PID=$!

# Wait for function server to start
sleep 5

# Test the function
print_status "🧪 Testing the salesforce-auth function..." $YELLOW

# Get the anon key (you'll need to replace this with actual key from supabase status)
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')

if [ -z "$ANON_KEY" ]; then
    print_status "⚠️  Could not retrieve anon key automatically. Using placeholder." $YELLOW
    ANON_KEY="your-anon-key-here"
fi

echo "Testing with a basic request..."

# Test with a simple ping/health check
curl -X POST 'http://localhost:54323/functions/v1/salesforce-auth' \
  -H "Authorization: Bearer $ANON_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "login",
    "username": "test@example.com",
    "password": "testpassword",
    "clientId": "test-client-id",
    "clientSecret": "test-client-secret"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
print_status "📝 Function deployment test completed!" $GREEN
print_status "📊 Check the output above for any errors." $YELLOW

echo ""
echo "To stop the services:"
echo "  - Kill the function server: kill $SERVE_PID"
echo "  - Stop Supabase: supabase stop"

echo ""
print_status "🎉 Local deployment test finished!" $GREEN
print_status "ℹ️  The function is now running at: http://localhost:54323/functions/v1/salesforce-auth" $YELLOW

# Keep the script running to show logs
print_status "📄 Watching function logs (Ctrl+C to exit)..." $YELLOW
supabase functions logs salesforce-auth --follow
