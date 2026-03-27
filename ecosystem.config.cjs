/**
 * PM2 Ecosystem Config — CSMS
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs        # start all apps
 *   pm2 restart ecosystem.config.cjs      # restart all apps
 *   pm2 reload ecosystem.config.cjs       # zero-downtime reload
 *   pm2 stop ecosystem.config.cjs         # stop all apps
 *   pm2 save                               # persist process list across reboots
 *   pm2 startup                            # generate startup script
 *
 * Run from the project root: /var/www/csms
 *
 * IMPORTANT — Secrets:
 *   Do NOT commit real secrets in this file.
 *   Put your secrets in /var/www/csms/.env — the deploy.sh script sources it
 *   before starting PM2 so all env vars are inherited automatically.
 *
 * Architecture overview:
 *   Nginx (port 80/443)
 *     ├── /api/*       → csms-api  (port 8080) — Express REST API
 *     └── /*           → served from dist/public/ by Nginx directly (static files)
 *
 *   csms-web (port 3000) is kept running as a fallback / for direct-access testing.
 *   In a fully configured Nginx setup, traffic never reaches csms-web; Nginx serves
 *   the built frontend files from the filesystem instead.
 *
 * Uploads persistence:
 *   User-uploaded files are stored at: artifacts/api-server/uploads/
 *   This path is NOT tracked by git — it persists across all deployments automatically
 *   because "git pull" never removes untracked directories.
 *   The deploy.sh script ensures this directory always exists (mkdir -p).
 *   Back up this folder separately if needed (e.g. scp, rsync, or object storage).
 */

const root = __dirname;

module.exports = {
  apps: [
    // ── API Server ───────────────────────────────────────────────────────────
    {
      name: "csms-api",
      script: "node",
      args: "--enable-source-maps ./dist/index.mjs",
      cwd: `${root}/artifacts/api-server`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "8080",
        // Env vars are loaded from .env by deploy.sh before PM2 starts.
        // These fallback values only apply if the variable is not already set.
        DATABASE_URL: process.env.DATABASE_URL || "postgresql://csms_user:CHANGE_ME@localhost:5432/csms_db",
        JWT_SECRET: process.env.JWT_SECRET || "CHANGE_ME_TO_A_LONG_RANDOM_STRING",
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "CHANGE_ME_TO_ANOTHER_LONG_RANDOM_STRING",
        CORS_ORIGIN: process.env.CORS_ORIGIN || "https://csms.yourdomain.com",
      },
      error_file: `${root}/logs/api-error.log`,
      out_file: `${root}/logs/api-out.log`,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },

    // ── Frontend Static Server ────────────────────────────────────────────────
    // Serves the built React SPA via "serve" on port 3000.
    // In production with Nginx: Nginx serves the same static files directly from
    // the filesystem (artifacts/csms/dist/public/) for better performance.
    // This process acts as a fallback and allows direct access without Nginx.
    {
      name: "csms-web",
      script: "npx",
      args: "serve dist/public --listen 3000 --no-clipboard --single",
      cwd: `${root}/artifacts/csms`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
      },
      error_file: `${root}/logs/web-error.log`,
      out_file: `${root}/logs/web-out.log`,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
