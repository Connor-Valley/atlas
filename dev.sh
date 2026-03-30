#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Start Caddy in background
echo -e "${GREEN}Starting Caddy reverse proxy...${NC}"
caddy start --config ./Caddyfile 2>/dev/null

# Trap to cleanup on exit (Ctrl+C)
cleanup() {
    echo -e "\n${GREEN}Shutting down...${NC}"
    caddy stop 2>/dev/null
    kill $API_PID $WEB_PID 2>/dev/null
    exit 0
}
trap cleanup INT TERM

# Start API server
echo -e "${BLUE}Starting API server...${NC}"
pnpm --filter @atlas/api dev &
API_PID=$!

# Start web client
echo -e "${BLUE}Starting web client...${NC}"
pnpm --filter @atlas/web dev &
WEB_PID=$!

# Wait for both processes
wait $API_PID $WEB_PID

# Cleanup Caddy when servers stop
caddy stop 2>/dev/null
