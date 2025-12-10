# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to SQLite database
npm run db:studio    # Open Drizzle Studio (port 4983)
```

No test suite is currently configured.

## Architecture Overview

This is a Next.js 15 (App Router) financial application template using:
- **Database**: SQLite with Drizzle ORM (WAL mode enabled for concurrent reads)
- **Auth**: Better Auth with email/password (OAuth-ready)
- **UI**: Tailwind CSS + shadcn/ui components

### Authentication Pattern

**Server Components** - Get session via Better Auth API:
```typescript
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const session = await auth.api.getSession({ headers: await headers() });
```

**Client Components** - Use the auth client hooks:
```typescript
import { useSession, signIn, signOut } from '@/lib/auth-client';
```

**Route Protection**: Middleware (`src/middleware.ts`) checks session cookie existence. Admin role verification must happen in page/layout server components since middleware cannot access full session data.

### Database Access

Schema defined in `src/lib/db/schema.ts`. Query using Drizzle:
```typescript
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

const allUsers = await db.select().from(users);
```

After schema changes, run `npm run db:push` to sync with SQLite.

### Key Files

- `src/lib/auth.ts` - Better Auth server configuration
- `src/lib/auth-client.ts` - Client-side auth hooks (useSession, signIn, signOut)
- `src/lib/db/schema.ts` - Drizzle schema (users, sessions, accounts, verifications, calculations)
- `src/middleware.ts` - Route protection logic
- `src/app/api/auth/[...all]/route.ts` - Auth API catch-all handler

### Route Groups

- `(auth)/` - Login and register pages (redirect to dashboard if authenticated)
- `dashboard/` - Protected user area
- `admin/` - Admin-only area (requires `role === 'admin'`)

## Docker Development

Project uses VS Code Dev Containers. Database stored in `data/app.db` (gitignored). Production deployment uses `docker-compose.prod.yml` with Caddy for HTTPS.
