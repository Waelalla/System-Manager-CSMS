#!/usr/bin/env bash
# =============================================================================
#  CSMS — Deploy Script
#  Run this on every new deployment from the project root: /var/www/csms
#  Usage: ./deployment/deploy.sh
# =============================================================================
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Load .env so db:push and db:seed can access DATABASE_URL
if [ -f "${PROJECT_ROOT}/.env" ]; then
    set -a
    # shellcheck source=/dev/null
    source "${PROJECT_ROOT}/.env"
    set +a
fi

echo ""
echo "=================================================="
echo "  CSMS — Deployment"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
echo ""

# --- 1. Pull latest code ---
echo "▶  Pulling latest code..."
git pull origin main
echo "   ✓ Code updated"

# --- 2. Install / update dependencies ---
echo "▶  Installing dependencies..."
pnpm install --frozen-lockfile
echo "   ✓ Dependencies installed"

# --- 3. Build all packages ---
echo "▶  Building (typecheck + compile)..."
pnpm run build
echo "   ✓ Build complete"

# --- 4. Push database schema changes ---
echo "▶  Pushing database schema..."
pnpm run db:push
echo "   ✓ Schema up to date"

# --- 5. Seed database (idempotent — safe to run every deploy) ---
echo "▶  Seeding database..."
pnpm run db:seed
echo "   ✓ Seed complete"

# --- 6. Ensure uploads directory exists (persisted between deployments) ---
echo "▶  Ensuring uploads directory..."
mkdir -p "${PROJECT_ROOT}/artifacts/api-server/uploads"
echo "   ✓ Uploads directory ready"

# --- 7. Ensure logs directory exists ---
echo "▶  Ensuring logs directory..."
mkdir -p "${PROJECT_ROOT}/logs"
echo "   ✓ Logs directory ready"

# --- 8. Reload PM2 (zero-downtime restart) ---
echo "▶  Reloading PM2 processes..."
if pm2 list | grep -q "csms-api"; then
    pm2 reload ecosystem.config.cjs --update-env
else
    pm2 start ecosystem.config.cjs
fi
pm2 save
echo "   ✓ PM2 reloaded"

echo ""
echo "=================================================="
echo "  Deployment complete!"
echo "=================================================="
echo ""
pm2 list
