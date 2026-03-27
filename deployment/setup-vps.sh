#!/usr/bin/env bash
# =============================================================================
#  CSMS — First-time VPS Setup Script
#  Run once on a fresh Hostinger VPS (Ubuntu 22.04/24.04)
#  Usage: chmod +x setup-vps.sh && sudo ./setup-vps.sh
# =============================================================================
set -euo pipefail

# ---- Configuration — edit these before running ----
DB_NAME="csms_db"
DB_USER="csms_user"
DB_PASS="CHANGE_ME_DB_PASSWORD"      # Change this!
APP_DIR="/var/www/csms"
GITHUB_REPO="https://github.com/YOUR_USERNAME/csms.git"   # Change this!
DOMAIN="csms.yourdomain.com"          # Change this!
# ---------------------------------------------------

echo ""
echo "=================================================="
echo "  CSMS — VPS Setup"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
echo ""

# --- 1. System update ---
echo "▶  Updating system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git unzip nginx ufw
echo "   ✓ System updated"

# --- 2. Install Node.js 24 via nvm ---
echo "▶  Installing Node.js 24 via nvm..."
if [ ! -d "$HOME/.nvm" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 24
nvm use 24
nvm alias default 24
echo "   ✓ Node $(node -v) installed"

# --- 3. Install pnpm ---
echo "▶  Installing pnpm..."
npm install -g pnpm
echo "   ✓ pnpm $(pnpm -v) installed"

# --- 4. Install PM2 ---
echo "▶  Installing PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
echo "   ✓ PM2 $(pm2 -v) installed"

# --- 5. Install serve (for static frontend) ---
echo "▶  Installing serve..."
npm install -g serve
echo "   ✓ serve installed"

# --- 6. Install PostgreSQL ---
echo "▶  Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
echo "   ✓ PostgreSQL installed"

# --- 7. Create database and user ---
echo "▶  Creating database user and database..."
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || \
    echo "   - User ${DB_USER} already exists, skipping"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || \
    echo "   - Database ${DB_NAME} already exists, skipping"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
echo "   ✓ Database ready"

# --- 8. Clone repository ---
echo "▶  Cloning repository to ${APP_DIR}..."
if [ -d "${APP_DIR}" ]; then
    echo "   - Directory exists, pulling latest..."
    cd "${APP_DIR}" && git pull origin main
else
    git clone "${GITHUB_REPO}" "${APP_DIR}"
fi
echo "   ✓ Repository ready at ${APP_DIR}"

# --- 9. Create .env file ---
ENV_FILE="${APP_DIR}/.env"
if [ ! -f "${ENV_FILE}" ]; then
    echo "▶  Creating .env from template..."
    cp "${APP_DIR}/.env.example" "${ENV_FILE}"
    # Fill in the database URL automatically
    sed -i "s|postgresql://user:password@localhost:5432/csms_db|postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}|" "${ENV_FILE}"
    echo ""
    echo "   ⚠️  IMPORTANT: Edit ${ENV_FILE} and set:"
    echo "      - JWT_SECRET (generate: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")"
    echo "      - JWT_REFRESH_SECRET (same method, different value)"
    echo "      - CORS_ORIGIN=https://${DOMAIN}"
    echo ""
else
    echo "   - .env already exists, skipping"
fi

# --- 10. Create required directories ---
echo "▶  Creating required directories..."
mkdir -p "${APP_DIR}/artifacts/api-server/uploads"
mkdir -p "${APP_DIR}/logs"
echo "   ✓ Directories created"

# --- 11. Configure firewall ---
echo "▶  Configuring UFW firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
echo "   ✓ Firewall configured"

# --- 12. Configure Nginx ---
echo "▶  Configuring Nginx..."
cp "${APP_DIR}/deployment/nginx.conf" /etc/nginx/sites-available/csms
# Replace placeholder domain
sed -i "s/csms.yourdomain.com/${DOMAIN}/g" /etc/nginx/sites-available/csms
# Enable site
ln -sf /etc/nginx/sites-available/csms /etc/nginx/sites-enabled/csms
# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx
echo "   ✓ Nginx configured"

echo ""
echo "=================================================="
echo "  VPS Setup complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. Edit ${ENV_FILE} — set JWT_SECRET and JWT_REFRESH_SECRET"
echo "  2. Also update ecosystem.config.cjs with your actual secrets"
echo "  3. Run: cd ${APP_DIR} && pnpm install --frozen-lockfile"
echo "  4. Run: cd ${APP_DIR} && pnpm run build"
echo "  5. Run: cd ${APP_DIR} && pnpm run db:push"
echo "  6. Run: cd ${APP_DIR} && pnpm run db:seed"
echo "  7. Run: cd ${APP_DIR} && pm2 start ecosystem.config.cjs && pm2 save"
echo "  8. Install SSL: certbot --nginx -d ${DOMAIN}"
echo ""
echo "  Or simply run: ./deployment/deploy.sh (after editing .env)"
echo ""
