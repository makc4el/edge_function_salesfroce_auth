#!/bin/bash

# =============================================================================
# CALLBACK FUNCTION TEST SCRIPT
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${PURPLE}"
    echo "🔗 SALESFORCE CALLBACK FUNCTION - TESTING"
    echo "========================================="
    echo -e "${NC}"
}

print_status() {
    echo -e "${2}${1}${NC}"
}

print_step() {
    echo -e "${CYAN}📋 ${1}${NC}"
}

# Check if functions server is running
check_server() {
    if ! curl -s http://localhost:54323/functions/v1/callback > /dev/null 2>&1; then
        print_status "⚠️  Functions server not running. Starting it..." $YELLOW
        supabase functions serve --no-verify-jwt --env-file .env.local &
        SERVE_PID=$!
        echo "Waiting for server to start..."
        sleep 5
        
        if ! curl -s http://localhost:54323/functions/v1/callback > /dev/null 2>&1; then
            print_status "❌ Could not start functions server" $RED
            exit 1
        fi
        print_status "✅ Functions server started" $GREEN
    else
        print_status "✅ Functions server is running" $GREEN
    fi
}

# Test CORS preflight
test_cors() {
    print_step "Testing CORS preflight request..."
    
    response=$(curl -s -X OPTIONS 'http://localhost:54323/functions/v1/callback' \
        -H 'Access-Control-Request-Method: POST' \
        -H 'Access-Control-Request-Headers: content-type' \
        -w "%{http_code}")
    
    if [[ "$response" == *"200" ]]; then
        print_status "✅ CORS preflight test passed" $GREEN
    else
        print_status "❌ CORS preflight test failed" $RED
        echo "Response: $response"
    fi
}

# Test POST with JSON data (simulating Salesforce callback)
test_post_json() {
    print_step "Testing POST request with JSON data..."
    
    echo "Simulating Salesforce OAuth callback..."
    
    curl -X POST 'http://localhost:54323/functions/v1/callback' \
        -H 'Content-Type: application/json' \
        -d '{
            "code": "aPrx.ppuB8UlvcFDyjAB7jdDs2_IxT43AsytGnLL.lZ9.OaKFV_CU_tDbgcWfvZg4o0Is2qp0w==",
            "instance_url": "https://orgfarm-a3ae3ef50e-dev-ed.develop.lightning.force.com/",
            "state": "test-state-123"
        }' \
        -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || cat
    
    echo ""
}

# Test POST with form data (alternative format)
test_post_form() {
    print_step "Testing POST request with form data..."
    
    curl -X POST 'http://localhost:54323/functions/v1/callback' \
        -H 'Content-Type: application/x-www-form-urlencoded' \
        -d 'code=aPrx.ppuB8UlvcFDyjAB7jdDs2_IxT43AsytGnLL.lZ9.OaKFV_CU_tDbgcWfvZg4o0Is2qp0w==&instance_url=https://orgfarm-a3ae3ef50e-dev-ed.develop.lightning.force.com/&state=form-test-123' \
        -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || cat
    
    echo ""
}

# Test GET with query parameters
test_get_query() {
    print_step "Testing GET request with query parameters..."
    
    curl -X GET 'http://localhost:54323/functions/v1/callback?code=aPrx.ppuB8UlvcFDyjAB7jdDs2_IxT43AsytGnLL.lZ9.OaKFV_CU_tDbgcWfvZg4o0Is2qp0w%3D%3D&instance_url=https://orgfarm-a3ae3ef50e-dev-ed.develop.lightning.force.com/&state=get-test-123' \
        -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || cat
    
    echo ""
}

# Test error handling
test_error_handling() {
    print_step "Testing error handling..."
    
    echo "Testing OAuth error response..."
    curl -X POST 'http://localhost:54323/functions/v1/callback' \
        -H 'Content-Type: application/json' \
        -d '{
            "error": "access_denied",
            "error_description": "User denied access to the application"
        }' \
        -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || cat
    
    echo ""
}

# Test with your specific format
test_your_format() {
    print_step "Testing with your specific format..."
    
    echo "Testing exact format from your example..."
    curl -X POST 'http://localhost:54323/functions/v1/callback' \
        -H 'Content-Type: application/json' \
        -d '{
            "instanceUrl": "https://orgfarm-a3ae3ef50e-dev-ed.develop.lightning.force.com/",
            "authCode": "aPrx.ppuB8UlvcFDyjAB7jdDs2_IxT43AsytGnLL.lZ9.OaKFV_CU_tDbgcWfvZg4o0Is2qp0w=="
        }' \
        -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || cat
    
    echo ""
}

# Interactive testing
interactive_test() {
    print_step "Interactive Testing Mode"
    echo ""
    echo "Available tests:"
    echo "1. POST with JSON"
    echo "2. POST with form data"  
    echo "3. GET with query params"
    echo "4. Error handling"
    echo "5. Your specific format"
    echo "6. Custom request"
    echo "7. Exit"
    echo ""
    
    while true; do
        read -p "Select test (1-7): " choice
        
        case $choice in
            1) test_post_json ;;
            2) test_post_form ;;
            3) test_get_query ;;
            4) test_error_handling ;;
            5) test_your_format ;;
            6) 
                echo "Enter custom JSON payload (press Ctrl+D when done):"
                payload=$(cat)
                curl -X POST 'http://localhost:54323/functions/v1/callback' \
                    -H 'Content-Type: application/json' \
                    -d "$payload" \
                    -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || cat
                echo ""
                ;;
            7) break ;;
            *) echo "Invalid choice. Please enter 1-7." ;;
        esac
    done
}

# Main execution
main() {
    print_header
    
    check_server
    
    echo ""
    print_status "🎯 Callback function URL: http://localhost:54323/functions/v1/callback" $CYAN
    print_status "📡 Ready to receive Salesforce OAuth callbacks!" $GREEN
    echo ""
    
    echo "Choose testing mode:"
    echo "1. Run all automated tests"
    echo "2. Interactive testing"
    echo "3. Keep server running (for external testing)"
    echo ""
    
    read -p "Select option (1-3): " mode
    
    case $mode in
        1)
            test_cors
            echo ""
            test_post_json
            test_post_form
            test_get_query
            test_error_handling
            test_your_format
            print_status "🎉 All tests completed!" $GREEN
            ;;
        2)
            interactive_test
            ;;
        3)
            print_status "Server running. Use the following URL for testing:" $CYAN
            print_status "http://localhost:54323/functions/v1/callback" $YELLOW
            print_status "Press Ctrl+C to stop" $YELLOW
            
            # Show logs in real-time
            echo ""
            print_status "📄 Watching function logs..." $CYAN
            supabase functions logs callback --follow
            ;;
        *)
            echo "Invalid option. Exiting..."
            ;;
    esac
}

# Cleanup on exit
cleanup() {
    if [ -n "$SERVE_PID" ]; then
        kill $SERVE_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
