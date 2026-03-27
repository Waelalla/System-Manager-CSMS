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
 *     ├── /api/*  → csms-api  (port 8080) — Express REST API
 *     └── /*      → served from artifacts/csms/dist/public/ by Nginx (static files)
 *
 *   csms-web (port WEB_PORT, default 3000) serves the built SPA via "serve".
 *   In a fully configured Nginx setup Nginx serves static files from the filesystem
 *   directly for best performance. csms-web provides a fallback for direct-access
 *   testing and non-Nginx setups.
 *
 * Uploads persistence:
 *   User-uploaded files are stored at: artifacts/api-server/uploads/
 *   This directory is NOT tracked by git — it persists across all deployments
 *   automatically because "git pull" never removes untracked directories.
 *   The deploy.sh script ensures this directory always exists (mkdir -p).
 *   Both csms-api and csms-web have ignore_watch set for uploads/ so that
 *   new upload files never trigger an unnecessary PM2 restart.
 *   Back up the uploads/ directory separately (rsync, object storage, etc.).
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
      // Prevent accidental watch-restarts from new upload files
      ignore_watch: ["uploads", "dist"],
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "8080",
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
    // Serves the built React SPA via "serve".
    // Port is controlled by WEB_PORT env var (default 3000).
    // When Nginx is configured, it serves the same files from the filesystem
    // directly — this process is used as a fallback / for direct testing.
    {
      name: "csms-web",
      script: "npx",
      args: `serve dist/public -l ${process.env.WEB_PORT || "3000"} --no-clipboard --single`,
      cwd: `${root}/artifacts/csms`,
      instances: 1,
      autorestart: true,
      watch: false,
      // Prevent watch from triggering on built files
      ignore_watch: ["dist", "node_modules"],
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
        WEB_PORT: process.env.WEB_PORT || "3000",
      },
      error_file: `${root}/logs/web-error.log`,
      out_file: `${root}/logs/web-out.log`,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
