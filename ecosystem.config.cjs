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
 *   Do NOT put real secrets in this file (it may be committed to git).
 *   Instead, put your secrets in /var/www/csms/.env and reference them via
 *   process.env inside the app.  PM2 will inherit environment variables from
 *   the shell that starts it, so running:
 *       source /var/www/csms/.env && pm2 start ecosystem.config.cjs
 *   or sourcing .env in deploy.sh (which this repo's deploy.sh already does)
 *   is the recommended approach.
 *
 * Uploads persistence:
 *   User-uploaded files are stored at: artifacts/api-server/uploads/
 *   This directory is created by deploy.sh and is NOT tracked by git.
 *   It persists across deployments automatically since git pull never
 *   removes untracked directories. Back it up separately if needed.
 */

const root = __dirname;

module.exports = {
  apps: [
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
        // Secrets are loaded from the shell environment (sourced from .env by deploy.sh).
        // The placeholders below are ONLY used if the env vars are not already set.
        DATABASE_URL: process.env.DATABASE_URL || "postgresql://csms_user:CHANGE_ME@localhost:5432/csms_db",
        JWT_SECRET: process.env.JWT_SECRET || "CHANGE_ME_TO_A_LONG_RANDOM_STRING",
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "CHANGE_ME_TO_ANOTHER_LONG_RANDOM_STRING",
        CORS_ORIGIN: process.env.CORS_ORIGIN || "https://csms.yourdomain.com",
      },
      error_file: `${root}/logs/api-error.log`,
      out_file: `${root}/logs/api-out.log`,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
