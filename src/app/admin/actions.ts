'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function updateUserRole(userId: string, newRole: 'user' | 'admin') {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Verify the current user is an admin
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  // Prevent admins from demoting themselves
  if (session.user.id === userId && newRole !== 'admin') {
    return { error: 'You cannot demote yourself' };
  }

  try {
    await db.update(users).set({ role: newRole }).where(eq(users.id, userId));
    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { error: 'Failed to update user role' };
  }
}

export async function deleteUser(userId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Verify the current user is an admin
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  // Prevent admins from deleting themselves
  if (session.user.id === userId) {
    return { error: 'You cannot delete yourself' };
  }

  try {
    await db.delete(users).where(eq(users.id, userId));
    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { error: 'Failed to delete user' };
  }
}
