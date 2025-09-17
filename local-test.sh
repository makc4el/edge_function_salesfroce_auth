#!/bin/bash

# =============================================================================
# LOCAL TESTING SCRIPT FOR SALESFORCE AUTH LAYER
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${PURPLE}"
    echo "🚀 SALESFORCE AUTH LAYER - LOCAL TESTING"
    echo "========================================"
    echo -e "${NC}"
}

print_status() {
    echo -e "${2}${1}${NC}"
}

print_step() {
    echo -e "${CYAN}📋 ${1}${NC}"
}

# Check if environment file exists
check_env_file() {
    if [ ! -f ".env.local" ]; then
        print_status "⚠️  Environment file .env.local not found" $YELLOW
        echo "Creating .env.local from template..."
        cp env.local.template .env.local
        print_status "✅ Created .env.local - Please update it with your credentials" $GREEN
        echo ""
        echo "Edit .env.local and update:"
        echo "- SALESFORCE_CLIENT_ID"
        echo "- SALESFORCE_CLIENT_SECRET"  
        echo "- SALESFORCE_USERNAME"
        echo "- SALESFORCE_PASSWORD"
        echo ""
        read -p "Press Enter when you've updated .env.local..."
    fi
}

# Load environment variables
load_env() {
    if [ -f ".env.local" ]; then
        export $(cat .env.local | grep -v '#' | xargs)
        print_status "✅ Environment variables loaded from .env.local" $GREEN
    fi
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Supabase CLI
    if ! command -v supabase &> /dev/null; then
        print_status "❌ Supabase CLI not found. Installing..." $RED
        brew install supabase/tap/supabase
    else
        print_status "✅ Supabase CLI found" $GREEN
    fi

    # Check Docker (not required but recommended)
    if ! command -v docker &> /dev/null; then
        print_status "⚠️  Docker not found. You can still test functions but can't run full stack locally" $YELLOW
    else
        if ! docker info &> /dev/null; then
            print_status "⚠️  Docker is not running. Starting it is recommended for full local testing" $YELLOW
        else
            print_status "✅ Docker is running" $GREEN
        fi
    fi
}

# Serve functions locally
serve_functions() {
    print_step "Starting Edge Functions server..."
    print_status "🔄 Starting Supabase functions serve..." $YELLOW
    
    # Kill any existing processes on port 54323
    lsof -ti:54323 | xargs kill -9 2>/dev/null || true
    
    # Start functions server in background
    supabase functions serve --no-verify-jwt --env-file .env.local &
    SERVE_PID=$!
    
    # Wait for server to start
    echo "Waiting for function server to start..."
    sleep 5
    
    # Check if server is running
    if kill -0 $SERVE_PID 2>/dev/null; then
        print_status "✅ Functions server started (PID: $SERVE_PID)" $GREEN
        echo "Function URL: http://localhost:54323/functions/v1/salesforce-auth"
    else
        print_status "❌ Failed to start functions server" $RED
        exit 1
    fi
}

# Test function with various scenarios
run_tests() {
    print_step "Running test scenarios..."
    
    local BASE_URL="http://localhost:54323/functions/v1/salesforce-auth"
    local ANON_KEY="${SUPABASE_ANON_KEY}"
    
    echo ""
    echo "📊 TEST 1: CORS Preflight Request"
    echo "================================"
    
    curl -X OPTIONS "$BASE_URL" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: authorization, content-type" \
        -w "\nHTTP Status: %{http_code}\n" \
        --silent
    
    echo ""
    echo "📊 TEST 2: Login with Environment Variables"
    echo "=========================================="
    
    # Test with environment variables (if set)
    if [ -n "$SALESFORCE_CLIENT_ID" ] && [ -n "$SALESFORCE_CLIENT_SECRET" ]; then
        echo "Testing with environment variables..."
        curl -X POST "$BASE_URL" \
            -H "Authorization: Bearer $ANON_KEY" \
            -H "Content-Type: application/json" \
            -d '{"action": "login"}' \
            -w "\nHTTP Status: %{http_code}\n" \
            --silent | jq '.' 2>/dev/null || cat
    else
        echo "⚠️  Salesforce credentials not set in environment variables"
    fi
    
    echo ""
    echo "📊 TEST 3: Login with Request Parameters"
    echo "======================================="
    
    # Test with request parameters
    curl -X POST "$BASE_URL" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "action": "login",
            "username": "test@example.com",
            "password": "testpassword",
            "clientId": "test-client-id",
            "clientSecret": "test-client-secret"
        }' \
        -w "\nHTTP Status: %{http_code}\n" \
        --silent | jq '.' 2>/dev/null || cat
    
    echo ""
    echo "📊 TEST 4: Token Verification"
    echo "============================"
    
    # Test token verification
    curl -X POST "$BASE_URL" \
        -H "Authorization: Bearer dummy-token" \
        -H "Content-Type: application/json" \
        -d '{"action": "verify"}' \
        -w "\nHTTP Status: %{http_code}\n" \
        --silent | jq '.' 2>/dev/null || cat
}

# Interactive testing mode
interactive_test() {
    print_step "Interactive Testing Mode"
    echo ""
    echo "Available actions:"
    echo "1. login    - Authenticate with Salesforce"
    echo "2. verify   - Verify a token"
    echo "3. refresh  - Refresh a token"
    echo "4. custom   - Send custom request"
    echo "5. exit     - Exit interactive mode"
    echo ""
    
    local BASE_URL="http://localhost:54323/functions/v1/salesforce-auth"
    local ANON_KEY="${SUPABASE_ANON_KEY}"
    
    while true; do
        read -p "Enter action (1-5): " choice
        
        case $choice in
            1|login)
                echo "Testing login..."
                read -p "Username (or press Enter for env var): " username
                read -p "Password (or press Enter for env var): " password
                read -p "Client ID (or press Enter for env var): " clientId
                read -p "Client Secret (or press Enter for env var): " clientSecret
                
                local payload='{"action": "login"'
                [ -n "$username" ] && payload+=", \"username\": \"$username\""
                [ -n "$password" ] && payload+=", \"password\": \"$password\""
                [ -n "$clientId" ] && payload+=", \"clientId\": \"$clientId\""
                [ -n "$clientSecret" ] && payload+=", \"clientSecret\": \"$clientSecret\""
                payload+='}'
                
                curl -X POST "$BASE_URL" \
                    -H "Authorization: Bearer $ANON_KEY" \
                    -H "Content-Type: application/json" \
                    -d "$payload" \
                    -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || cat
                ;;
            2|verify)
                read -p "Enter access token to verify: " token
                curl -X POST "$BASE_URL" \
                    -H "Authorization: Bearer $token" \
                    -H "Content-Type: application/json" \
                    -d '{"action": "verify"}' \
                    -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || cat
                ;;
            3|refresh)
                read -p "Refresh token: " refresh_token
                read -p "Client ID: " client_id
                read -p "Client Secret: " client_secret
                curl -X POST "$BASE_URL" \
                    -H "Authorization: Bearer $ANON_KEY" \
                    -H "Content-Type: application/json" \
                    -d "{\"action\": \"refresh\", \"refresh_token\": \"$refresh_token\", \"client_id\": \"$client_id\", \"client_secret\": \"$client_secret\"}" \
                    -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || cat
                ;;
            4|custom)
                echo "Enter custom JSON payload (press Ctrl+D when done):"
                payload=$(cat)
                curl -X POST "$BASE_URL" \
                    -H "Authorization: Bearer $ANON_KEY" \
                    -H "Content-Type: application/json" \
                    -d "$payload" \
                    -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || cat
                ;;
            5|exit)
                break
                ;;
            *)
                echo "Invalid choice. Please enter 1-5."
                ;;
        esac
        echo ""
    done
}

# Cleanup function
cleanup() {
    if [ -n "$SERVE_PID" ]; then
        print_status "🧹 Stopping functions server (PID: $SERVE_PID)..." $YELLOW
        kill $SERVE_PID 2>/dev/null || true
    fi
    
    # Kill any processes on port 54323
    lsof -ti:54323 | xargs kill -9 2>/dev/null || true
    
    print_status "✅ Cleanup completed" $GREEN
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Main execution
main() {
    print_header
    
    check_prerequisites
    check_env_file
    load_env
    serve_functions
    
    echo ""
    print_status "🎉 Local testing environment is ready!" $GREEN
    echo ""
    echo "Choose testing mode:"
    echo "1. Run automated tests"
    echo "2. Interactive testing"
    echo "3. Keep server running (manual testing)"
    echo ""
    
    read -p "Select option (1-3): " mode
    
    case $mode in
        1)
            run_tests
            ;;
        2)
            interactive_test
            ;;
        3)
            print_status "Server running at: http://localhost:54323/functions/v1/salesforce-auth" $CYAN
            print_status "Press Ctrl+C to stop" $YELLOW
            wait
            ;;
        *)
            echo "Invalid option. Keeping server running..."
            wait
            ;;
    esac
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
