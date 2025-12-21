import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

// Export commonly used hooks and utilities
export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient;

// Password management - use authClient directly in components
// authClient.forgetPassword({ email, redirectTo })
// authClient.resetPassword({ newPassword, token })
// authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions })
