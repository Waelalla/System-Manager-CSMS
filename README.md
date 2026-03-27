# CSMS — نظام إدارة خدمة العملاء
## Customer Service Management System

A full-stack Arabic/English (RTL) web application for managing customer complaints, invoice follow-ups, analytics, and role-based access control.

---

## Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Frontend   | React 19, Vite, Tailwind CSS v4, shadcn/ui  |
| Backend    | Express 5, Node.js 24                       |
| Database   | PostgreSQL + Drizzle ORM                    |
| Auth       | JWT (access 15m + refresh 7d)               |
| Monorepo   | pnpm workspaces                             |
| Language   | TypeScript (strict)                         |

---

## Features

- **Role-based access**: Customer Service Agent, Accountant, Manager, Manager/Voter, Maintenance Engineer
- **Complaint lifecycle**: Create → Assign → Resolve with dynamic custom fields per complaint type
- **Invoice follow-ups** with customer rating system (stars)
- **Analytics dashboard**: charts, branch comparison, top products
- **CSV / Excel import** for bulk customer/invoice data
- **File uploads**: attach images/documents to complaints (lightbox preview)
- **Notifications**: real-time in-app notifications with read/unread state
- **Dark mode** by default (Arabic RTL layout)

---

## Prerequisites

- **Node.js 24+** — install via [nvm](https://github.com/nvm-sh/nvm)
- **pnpm 10+** — `npm install -g pnpm`
- **PostgreSQL 15+** — local or remote instance

---

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/csms.git
cd csms

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
# Leave NODE_ENV unset or set to "development"

# 4. Push database schema
pnpm run db:push

# 5. Seed the database (creates default roles, branches, products, and admin user)
pnpm run db:seed

# 6. Start both servers in development mode
pnpm run dev
```

The API server runs on `http://localhost:8080` and the frontend on `http://localhost:5173`.

**Default admin account:**
- Email: `wael@system.com`
- Password: `123`

---

## Available Scripts

| Command           | Description                                              |
|-------------------|----------------------------------------------------------|
| `pnpm run dev`    | Start all services in dev mode (watch + hot reload)      |
| `pnpm run build`  | Typecheck all packages, then build frontend + API        |
| `pnpm run db:push`| Push Drizzle schema to the database (safe, no data loss) |
| `pnpm run db:seed`| Seed initial roles, branches, products, and admin user   |

---

## Production Deployment (Hostinger VPS)

See the `deployment/` folder for all deployment files.

### First-time VPS setup

```bash
# 1. SSH into your VPS
ssh root@YOUR_VPS_IP

# 2. Upload and run the setup script
scp deployment/setup-vps.sh root@YOUR_VPS_IP:/root/
ssh root@YOUR_VPS_IP "chmod +x /root/setup-vps.sh && /root/setup-vps.sh"
```

This installs Node.js 24, pnpm, PM2, PostgreSQL, creates the database, and sets up the folder structure.

### Deploy the application

```bash
# On the VPS, after cloning the repo to /var/www/csms:
cd /var/www/csms
chmod +x deployment/deploy.sh
./deployment/deploy.sh
```

Every subsequent deployment just runs `./deployment/deploy.sh` again.

### Configure Nginx

```bash
# Copy the Nginx config
sudo cp deployment/nginx.conf /etc/nginx/sites-available/csms
sudo ln -s /etc/nginx/sites-available/csms /etc/nginx/sites-enabled/csms
sudo nginx -t && sudo systemctl reload nginx
```

### SSL Certificate (recommended)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values. See `.env.example` for descriptions.

| Variable            | Required in Prod | Description                                   |
|---------------------|:----------------:|-----------------------------------------------|
| `DATABASE_URL`      | ✅               | PostgreSQL connection string                   |
| `JWT_SECRET`        | ✅               | Long random string for access tokens           |
| `JWT_REFRESH_SECRET`| ✅               | Long random string for refresh tokens          |
| `CORS_ORIGIN`       | ✅               | Exact frontend URL (e.g. `https://csms.example.com`) |
| `PORT`              | ✅               | API server port (default: 8080)                |
| `NODE_ENV`          | ✅               | Set to `production`                            |

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Project Structure

```
csms/
├── artifacts/
│   ├── api-server/        # Express 5 REST API
│   └── csms/              # React + Vite frontend
├── lib/
│   ├── db/                # Drizzle ORM schema + migrations + seed
│   ├── api-zod/           # Zod validation schemas (generated)
│   └── api-client-react/  # TanStack Query hooks (generated)
├── deployment/            # Nginx config, deploy scripts, PM2 config
├── ecosystem.config.cjs   # PM2 process manager config
├── .env.example           # Environment variables template
└── pnpm-workspace.yaml    # pnpm monorepo config
```

---

## License

MIT
