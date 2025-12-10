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
6. Visit http://localhost:3000

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

## Deployment to Racknerd

### First-Time Server Setup

SSH into your VPS and install Docker:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin -y
```

### Deploy

1. Create `.env.production` with production secrets
2. Update `deploy.sh` with your server details:
   ```bash
   REMOTE_USER="root"
   REMOTE_HOST="your-server-ip"
   ```
3. Run:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

### HTTPS with Caddy (Recommended)

On your server, install Caddy:

```bash
apt install -y caddy
```

Edit `/etc/caddy/Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

Restart Caddy:
```bash
systemctl restart caddy
```

Caddy automatically handles SSL certificates.

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
import { db } from '@/lib/db';
import { calculations } from '@/lib/db/schema';

const results = await db.select().from(calculations);
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate migration files |
| `npm run db:studio` | Open Drizzle Studio |
| `./deploy.sh` | Deploy to production |
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
