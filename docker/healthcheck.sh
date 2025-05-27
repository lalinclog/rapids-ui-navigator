#!/bin/bash

# Health check for FastAPI application
# Return 0 if application is healthy, 1 otherwise

# Define variables
MAX_RETRIES=3
RETRY_DELAY=5
API_ENDPOINT="http://localhost:8080/api/health"
TIMEOUT=5

# Check if API is responsive
for i in $(seq 1 $MAX_RETRIES); do
    echo "Health check attempt $i of $MAX_RETRIES..."
    
    # Try to connect to the API endpoint with timeout
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT $API_ENDPOINT)
    
    if [ "$response" = "200" ]; then
        echo "Health check succeeded! API is responsive."
        exit 0
    fi
    
    echo "Health check failed. Response code: $response"
    
    # Wait before retrying
    echo "Waiting $RETRY_DELAY seconds before retry..."
    sleep $RETRY_DELAY
done

echo "Health check failed after $MAX_RETRIES attempts!"
exit 1