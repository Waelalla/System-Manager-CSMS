#!/usr/bin/env bash
# =============================================================================
#  CSMS — First-time VPS Setup Script
#  Run once on a fresh Hostinger VPS (Ubuntu 22.04 / 24.04 LTS)
#  Usage: chmod +x setup-vps.sh && sudo ./setup-vps.sh
#
#  What this does:
#   - Updates system packages
#   - Installs Node.js 24 (via nvm), pnpm, PM2
#   - Installs PostgreSQL and creates the app database
#   - Clones the repository and creates .env from template
#   - Configures Nginx as a reverse proxy + static file server
#   - Configures UFW firewall
# =============================================================================
set -euo pipefail

# ---- Configuration — edit these before running ----
DB_NAME="csms_db"
DB_USER="csms_user"
DB_PASS="CHANGE_ME_DB_PASSWORD"            # ← Change this!
APP_DIR="/var/www/csms"
GITHUB_REPO="https://github.com/YOUR_USERNAME/csms.git"  # ← Change this!
DOMAIN="csms.yourdomain.com"               # ← Change this!
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
# Make node/npm/pnpm available system-wide
NODE_PATH="$(dirname "$(which node)")"
echo "export NVM_DIR=\"\$HOME/.nvm\"" >> /etc/profile.d/nvm.sh
echo "[ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\"" >> /etc/profile.d/nvm.sh
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

# --- 5. Install PostgreSQL ---
echo "▶  Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
echo "   ✓ PostgreSQL installed"

# --- 6. Create database and user ---
echo "▶  Creating database user and database..."
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || \
    echo "   - User ${DB_USER} already exists, skipping"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || \
    echo "   - Database ${DB_NAME} already exists, skipping"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
echo "   ✓ Database ready: ${DB_NAME} / ${DB_USER}"

# --- 7. Clone repository ---
echo "▶  Setting up repository at ${APP_DIR}..."
if [ -d "${APP_DIR}/.git" ]; then
    echo "   - Repository exists, pulling latest..."
    cd "${APP_DIR}" && git pull origin main
else
    git clone "${GITHUB_REPO}" "${APP_DIR}"
fi
echo "   ✓ Repository ready at ${APP_DIR}"

# --- 8. Create .env file ---
ENV_FILE="${APP_DIR}/.env"
if [ ! -f "${ENV_FILE}" ]; then
    echo "▶  Creating .env from template..."
    cp "${APP_DIR}/.env.example" "${ENV_FILE}"
    sed -i "s|postgresql://user:password@localhost:5432/csms_db|postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}|" "${ENV_FILE}"
    sed -i "s|https://csms.example.com|https://${DOMAIN}|" "${ENV_FILE}"
    echo "   ✓ .env created"
else
    echo "   - .env already exists, skipping"
fi

# --- 9. Create required directories ---
echo "▶  Creating required directories..."
# uploads/ persists user-uploaded files across deployments
mkdir -p "${APP_DIR}/artifacts/api-server/uploads"
mkdir -p "${APP_DIR}/logs"
echo "   ✓ Directories created"

# --- 10. Configure firewall ---
echo "▶  Configuring UFW firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
echo "   ✓ Firewall configured (SSH + HTTP/HTTPS allowed)"

# --- 11. Configure Nginx ---
echo "▶  Configuring Nginx..."
cp "${APP_DIR}/deployment/nginx.conf" /etc/nginx/sites-available/csms
sed -i "s/csms.yourdomain.com/${DOMAIN}/g" /etc/nginx/sites-available/csms
# Also update the root path in case it differs
sed -i "s|/var/www/csms|${APP_DIR}|g" /etc/nginx/sites-available/csms
# Enable the site
ln -sf /etc/nginx/sites-available/csms /etc/nginx/sites-enabled/csms
# Disable the default Nginx site
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
echo ""
echo "  1. Edit ${ENV_FILE}"
echo "     → Set JWT_SECRET and JWT_REFRESH_SECRET (run this to generate each):"
echo "       node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
echo ""
echo "  2. Run the full deployment:"
echo "     cd ${APP_DIR} && ./deployment/deploy.sh"
echo ""
echo "  3. Install SSL certificate:"
echo "     apt install certbot python3-certbot-nginx -y"
echo "     certbot --nginx -d ${DOMAIN}"
echo ""
echo "  Your app will be available at: http://${DOMAIN}"
echo "  (https:// after certbot runs)"
echo ""
