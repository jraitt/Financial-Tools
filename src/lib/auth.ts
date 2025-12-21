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
    // Password reset configuration
    sendResetPassword: async ({ user, url }) => {
      // For now, log the reset URL (in production, integrate with an email service)
      console.log(`Password reset requested for ${user.email}: ${url}`);
      // TODO: Integrate with email service (e.g., Resend, SendGrid, Nodemailer)
      // Example:
      // await sendEmail({
      //   to: user.email,
      //   subject: 'Reset your password',
      //   html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`
      // });
    },
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
