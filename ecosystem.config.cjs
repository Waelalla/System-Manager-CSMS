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
        // Fill in your actual secrets — do NOT commit real values to git
        DATABASE_URL: "postgresql://csms_user:CHANGE_ME@localhost:5432/csms_db",
        JWT_SECRET: "CHANGE_ME_TO_A_LONG_RANDOM_STRING",
        JWT_REFRESH_SECRET: "CHANGE_ME_TO_ANOTHER_LONG_RANDOM_STRING",
        CORS_ORIGIN: "https://csms.yourdomain.com",
      },
      error_file: `${root}/logs/api-error.log`,
      out_file: `${root}/logs/api-out.log`,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "csms-web",
      script: "npx",
      args: "serve dist/public --listen 3000 --no-clipboard",
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
