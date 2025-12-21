import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as schema from './db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  
  // Email/Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production with email provider
  },
  
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Advanced cookie configuration for production behind reverse proxy
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  
  // User configuration with roles
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
    },
  },
  
  // Trusted origins for CSRF protection
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  ],
  
  // Optional: Add OAuth providers
  // socialProviders: {
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID!,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  //   },
  // },
});

// Export auth types
export type Session = typeof auth.$Infer.Session;
