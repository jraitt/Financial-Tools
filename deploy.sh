#!/bin/bash
# ===========================================
# Deployment Script for Racknerd VPS
# ===========================================
# Usage: ./deploy.sh [--build-only|--restart-only]

set -e

# Configuration - Update these for your server
REMOTE_USER="root"
REMOTE_HOST="your-racknerd-ip"
REMOTE_DIR="/opt/finapp"
APP_NAME="finapp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Starting Deployment ===${NC}"

# Parse arguments
BUILD_ONLY=false
RESTART_ONLY=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --build-only) BUILD_ONLY=true ;;
        --restart-only) RESTART_ONLY=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

if [ "$RESTART_ONLY" = true ]; then
    echo -e "${YELLOW}Restarting container only...${NC}"
    ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && docker-compose -f docker-compose.prod.yml restart"
    echo -e "${GREEN}=== Restart Complete ===${NC}"
    exit 0
fi

# Step 1: Check for .env.production
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production file not found${NC}"
    echo "Create .env.production with your production secrets before deploying."
    exit 1
fi

# Step 2: Sync files to server
echo -e "${YELLOW}Syncing files to server...${NC}"
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'data/*.db*' \
    --exclude '.git' \
    --exclude '.env.development' \
    ./ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

# Step 3: Build and restart on server
if [ "$BUILD_ONLY" = false ]; then
    echo -e "${YELLOW}Building and starting container...${NC}"
    ssh ${REMOTE_USER}@${REMOTE_HOST} << EOF
        cd ${REMOTE_DIR}
        
        # Build the new image
        docker-compose -f docker-compose.prod.yml build
        
        # Stop and remove old container
        docker-compose -f docker-compose.prod.yml down
        
        # Start new container
        docker-compose -f docker-compose.prod.yml up -d
        
        # Run database migrations
        docker-compose -f docker-compose.prod.yml exec -T app npm run db:push
        
        # Clean up old images
        docker image prune -f
        
        # Show status
        docker-compose -f docker-compose.prod.yml ps
EOF
fi

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "Your app should be available at: http://${REMOTE_HOST}:3000"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Set up a reverse proxy (nginx/caddy) for HTTPS"
echo "2. Configure your domain's DNS"
echo "3. Make yourself admin: sqlite3 data/app.db \"UPDATE users SET role='admin' WHERE email='you@example.com'\""
