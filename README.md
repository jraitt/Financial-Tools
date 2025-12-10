# Next.js Docker Starter for Financial Apps

A Docker-first Next.js template with authentication, SQLite database, and admin panel - designed for low-volume financial and tax analysis web applications.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** SQLite + Drizzle ORM
- **Auth:** Better Auth (email/password + OAuth ready)
- **UI:** Tailwind CSS + shadcn/ui
- **Container:** Single Docker container for both dev and prod

## Quick Start

### Prerequisites

- Docker Desktop
- VS Code with "Dev Containers" extension

### Development Setup

1. Clone this repository
2. Open in VS Code
3. When prompted, click "Reopen in Container" (or run `Dev Containers: Reopen in Container` from command palette)
4. Wait for container to build and dependencies to install
5. Open terminal in VS Code and run:
   ```bash
   npm run dev
   ```
6. Visit http://localhost:3050

That's it! No local Node.js installation needed.

### Alternative: Docker Compose

If you prefer docker-compose over VS Code Dev Containers:

```bash
docker-compose up
```

## Project Structure

```
├── .devcontainer/          # VS Code Dev Container config
│   ├── devcontainer.json
│   └── Dockerfile.dev
├── docker/
│   └── Dockerfile.prod     # Production multi-stage build
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── (auth)/         # Auth pages (login, register)
│   │   ├── admin/          # Admin panel
│   │   ├── dashboard/      # User dashboard
│   │   └── api/            # API routes
│   ├── components/
│   │   └── ui/             # shadcn/ui components
│   └── lib/
│       ├── auth.ts         # Better Auth config
│       ├── auth-client.ts  # Client-side auth
│       └── db/             # Drizzle ORM setup
├── data/                   # SQLite database (gitignored)
├── drizzle/                # Database migrations
├── .env.development        # Dev environment (safe to commit)
├── .env.production         # Prod environment (DO NOT commit)
├── docker-compose.yml      # Local development
├── docker-compose.prod.yml # Production deployment
└── deploy.sh               # Deployment script
```

## Environment Variables

Copy `.env.example` to `.env.production` and update:

```env
DATABASE_URL=./data/app.db
BETTER_AUTH_SECRET=your-32-char-secret-here
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Generate a secret:

```bash
openssl rand -base64 32
```

## Database

### Schema Changes

Edit `src/lib/db/schema.ts` then run:

```bash
npm run db:push
```

### View Database

```bash
npm run db:studio
```

Opens Drizzle Studio at http://localhost:4983

### Direct SQL Access

```bash
sqlite3 data/app.db
```

## Authentication

### Making Yourself Admin

After registering, run in sqlite3:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### Adding OAuth Providers

Uncomment and configure in `src/lib/auth.ts`:

```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  },
},
```

## Production Deployment

### 1. First-Time Server Setup

SSH into your VPS and install required software:

### 2. Clone Repository on Server

```bash
git clone https://github.com/jraitt/Financial-Tools.git
cd Financial-Tools
```

### 3. Add Subdomain at DNS Provider

Create an A record pointing to your server IP:

- Example: `finapps.compound-interests.com` → `your-server-ip`

### 4. Configure Nginx Reverse Proxy

Create nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/finapps.conf
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name finapps.compound-interests.com;  # Update with your subdomain

    location / {
        proxy_pass http://127.0.0.1:3050;
        # Headers for Next.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;

        # Next.js specific optimizations
        proxy_cache_bypass $http_upgrade;
        proxy_set_header Accept-Encoding "";
    }

    # Handle Next.js static assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3050;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/finapps.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Get SSL Certificate

```bash
sudo certbot --nginx -d finapps.compound-interests.com
```

Certbot will automatically configure HTTPS and set up auto-renewal.

### 6. Configure Environment Variables

Create production environment file:

```bash
nano .env.production
```

Add your production configuration:

```env
# Database
DATABASE_URL=/app/data/app.db

# Better Auth
BETTER_AUTH_SECRET=<generate-with-openssl-below>
BETTER_AUTH_URL=https://finapps.compound-interests.com

# App
NEXT_PUBLIC_APP_URL=https://finapps.compound-interests.com
```

Generate secure secret:

```bash
openssl rand -base64 32
```

### 7. Build and Start Docker Container

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Your application is now live at `https://finapps.compound-interests.com`!

### Useful Production Commands

```bash
# View logs
docker logs financial-tools

# View live logs
docker logs -f financial-tools

# Stop the container
docker compose -f docker-compose.prod.yml down

# Restart the container
docker compose -f docker-compose.prod.yml restart

# Pull latest code and rebuild
git pull
docker compose -f docker-compose.prod.yml up -d --build

# View running containers
docker ps
```

## Adding shadcn/ui Components

From inside the dev container:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
# etc.
```

## Customization

### Color Scheme

Edit CSS variables in `src/app/globals.css`:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}
```

### Adding New Database Tables

1. Add schema in `src/lib/db/schema.ts`
2. Run `npm run db:push`
3. Import and use in your components

Example:

```typescript
import { db } from "@/lib/db";
import { calculations } from "@/lib/db/schema";

const results = await db.select().from(calculations);
```

## Commands Reference

| Command                      | Description                  |
| ---------------------------- | ---------------------------- |
| `npm run dev`                | Start development server     |
| `npm run build`              | Build for production         |
| `npm run start`              | Run production build         |
| `npm run db:push`            | Push schema to database      |
| `npm run db:generate`        | Generate migration files     |
| `npm run db:studio`          | Open Drizzle Studio          |
| `./deploy.sh`                | Deploy to production         |
| `./deploy.sh --restart-only` | Restart production container |

## Troubleshooting

### Container won't start

- Ensure Docker Desktop is running
- Try rebuilding: `Dev Containers: Rebuild Container`

### Database locked

- SQLite can only handle one write at a time
- For concurrent writes, consider switching to PostgreSQL

### Permission denied on data/

- Inside container: `sudo chown -R node:node /workspace/data`

## License

MIT
