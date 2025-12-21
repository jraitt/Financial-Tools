import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/landing/navbar';

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar session={session} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {session.user.name}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s your financial dashboard.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            { title: 'New Calculation', description: 'Start a new financial analysis', href: '/social-security' },
            { title: 'View History', description: 'See your past calculations', href: '#' },
            { title: 'Settings', description: 'Manage your account', href: '/settings' },
          ].map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="p-6 bg-card rounded-lg border hover:shadow-md hover:border-primary/50 transition-all"
            >
              <h3 className="font-semibold text-card-foreground">{action.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
            </Link>
          ))}
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Recent Activity</h2>
          <p className="text-muted-foreground text-sm">
            No recent calculations. Start a new analysis to see your history here.
          </p>
        </div>
      </main>
    </div>
  );
}
