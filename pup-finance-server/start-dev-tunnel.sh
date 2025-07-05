#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
# Load environment variables from your main .env file
if [ -f .env ]; then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

# Check for required environment variables for the Auth0 Management API
: "${AUTH0_DOMAIN?Error: Need to set AUTH0_DOMAIN in .env}"
: "${MGMT_CLIENT_ID?Error: Need to set MGMT_CLIENT_ID in .env}"
: "${MGMT_CLIENT_SECRET?Error: Need to set MGMT_CLIENT_SECRET in .env}"
: "${ACTION_ID?Error: Need to set ACTION_ID in .env}"

LOCAL_PORT="3000" # The port your local API runs on. Change if yours is different.

# --- Main Script ---

echo "👉 Starting ngrok tunnel for port $LOCAL_PORT..."

# Start ngrok in the background. Redirect output to a log file.
ngrok http $LOCAL_PORT --log=stdout > ngrok.log &

# Give ngrok a few seconds to initialize and create the tunnel.
sleep 3

# Use ngrok's local API to get the public HTTPS URL of the tunnel.
NGROK_URL=$(curl --silent http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[] | select(.proto=="https") | .public_url')

if [ -z "$NGROK_URL" ]; then
  echo "❌ ERROR: Could not retrieve ngrok public URL. Is ngrok running?"
  exit 1
fi

echo "✅ ngrok URL obtained: $NGROK_URL"
echo "👉 Requesting Auth0 Management API token..."

# Get an access token for the Auth0 Management API.
AUTH0_TOKEN=$(curl --silent --request POST \
  --url "https://$AUTH0_DOMAIN/oauth/token" \
  --header 'content-type: application/json' \
  --data "{\"client_id\":\"$MGMT_CLIENT_ID\",\"client_secret\":\"$MGMT_CLIENT_SECRET\",\"audience\":\"https://$AUTH0_DOMAIN/api/v2/\",\"grant_type\":\"client_credentials\"}" \
  | jq -r '.access_token')

if [ -z "$AUTH0_TOKEN" ] || [ "$AUTH0_TOKEN" == "null" ]; then
    echo "❌ ERROR: Failed to get Auth0 Management API Token. Check your credentials."
    exit 1
fi

echo "✅ Auth0 token acquired."
echo "👉 Updating Auth0 Action secret (API_BASE_URL)..."

# Update the secret in your Auth0 Action using the Management API.
# The payload is a JSON array of secrets to update.
UPDATE_PAYLOAD="[{\"name\":\"API_BASE_URL\",\"value\":\"$NGROK_URL\"}]"

# Make the API call to update the secret
curl --silent --request PATCH \
  --url "https://$AUTH0_DOMAIN/api/v2/actions/actions/$ACTION_ID/secrets" \
  --header "authorization: Bearer $AUTH0_TOKEN" \
  --header 'content-type: application/json' \
  --data "$UPDATE_PAYLOAD"

echo ""
echo "✅🚀 Auth0 Action secret updated successfully!"
echo "Your local API is now publicly available for Auth0 at: $NGROK_URL"
echo "Press Ctrl+C to stop the tunnel."

# Keep the script running to keep the tunnel alive, and kill ngrok on exit.
trap "echo '👋 Shutting down ngrok...'; killall ngrok" EXIT
wait