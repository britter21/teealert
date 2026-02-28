#!/bin/bash
# Starts cloudflared quick tunnel and updates Vercel env var with the new URL.
# Run via pm2: pm2 start scripts/start-tunnel.sh --name tunnel

VERCEL_PROJECT_ID="prj_nl2Y3M6DjVuzcNwmodNLLMRiJ5ek"
VERCEL_TEAM_ID="team_xonBs9yLlsOEeA3Gj4XRp9Do"
LOG_FILE="/tmp/cloudflared-tunnel.log"

# Read VERCEL_TOKEN from .env.local if not in env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
if [ -z "${VERCEL_TOKEN:-}" ] && [ -f "$PROJECT_DIR/.env.local" ]; then
  VERCEL_TOKEN=$(grep '^VERCEL_TOKEN=' "$PROJECT_DIR/.env.local" | cut -d= -f2-)
fi

> "$LOG_FILE"

# Start cloudflared, redirect stderr to stdout, tee to log
cloudflared tunnel --url http://localhost:3456 > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

# Wait for the tunnel URL to appear
echo "Waiting for tunnel URL..."
TUNNEL_URL=""
for i in $(seq 1 30); do
  sleep 1
  TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    echo "Tunnel URL: $TUNNEL_URL"
    break
  fi
done

if [ -z "$TUNNEL_URL" ]; then
  echo "ERROR: Failed to detect tunnel URL after 30s"
  cat "$LOG_FILE"
  exit 1
fi

# Update Vercel env var via API
if [ -n "${VERCEL_TOKEN:-}" ]; then
  echo "Updating Vercel CHRONOGOLF_RELAY_URL..."

  # Find and delete existing env var
  ENV_ID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID" \
    | grep -o '"id":"[^"]*","key":"CHRONOGOLF_RELAY_URL"' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$ENV_ID" ]; then
    curl -s -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$ENV_ID?teamId=$VERCEL_TEAM_ID" > /dev/null
    echo "Deleted old env var ($ENV_ID)"
  fi

  # Create new env var
  RESULT=$(curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID" \
    -d "{\"key\":\"CHRONOGOLF_RELAY_URL\",\"value\":\"$TUNNEL_URL\",\"type\":\"encrypted\",\"target\":[\"production\"]}")

  echo "Vercel API response: $RESULT"
  echo "Updated CHRONOGOLF_RELAY_URL=$TUNNEL_URL"
else
  echo "WARNING: VERCEL_TOKEN not found. Manually update CHRONOGOLF_RELAY_URL=$TUNNEL_URL"
fi

# Verify relay is reachable through tunnel
sleep 2
RELAY_SECRET=$(grep '^RELAY_SECRET=' "$PROJECT_DIR/.env.local" 2>/dev/null | cut -d= -f2- || echo "")
if [ -n "$RELAY_SECRET" ]; then
  HEALTH=$(curl -s -H "X-Relay-Secret: $RELAY_SECRET" "$TUNNEL_URL/health" 2>/dev/null || echo "unreachable")
  echo "Relay health check: $HEALTH"
fi

echo "Tunnel running (PID $TUNNEL_PID)"

# Keep running — pm2 monitors this process
wait $TUNNEL_PID
