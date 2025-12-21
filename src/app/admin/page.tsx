import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { SignOutButton } from '../dashboard/sign-out-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { UserActions } from './user-actions';

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Verify admin role
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all users
  const allUsers = await db.select().from(users);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Financial Tools
                </span>
              </Link>
              <Badge variant="destructive">Admin</Badge>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage users and site settings.</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold text-foreground">{allUsers.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Admins</p>
            <p className="text-3xl font-bold text-foreground">
              {allUsers.filter((u) => u.role === 'admin').length}
            </p>
          </div>
          <div className="bg-card rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Regular Users</p>
            <p className="text-3xl font-bold text-foreground">
              {allUsers.filter((u) => u.role === 'user').length}
            </p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-card-foreground">All Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {allUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {user.name}
                      {user.id === session.user.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {user.createdAt?.toLocaleDateString() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <UserActions
                        userId={user.id}
                        currentRole={user.role || 'user'}
                        isCurrentUser={user.id === session.user.id}
                        userName={user.name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* First Admin Setup Note */}
        <div className="mt-8 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm text-foreground">
            <strong>Tip:</strong> Use the actions menu (⋮) to promote users to admin or remove admin privileges.
            You cannot demote yourself to prevent accidental lockout.
          </p>
        </div>
      </main>
    </div>
  );
}
