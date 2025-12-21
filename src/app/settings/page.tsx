import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/landing/navbar';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SettingsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <Navbar session={session} />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Account Settings</h1>
                    <p className="text-muted-foreground mt-2">Manage your account information and preferences.</p>
                </div>

                <div className="grid gap-8">
                    {/* Profile Section */}
                    <Card className="border-border/60 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/50 border-b">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle>Profile Information</CardTitle>
                                    <CardDescription>Your personal information and how it appears to others.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid gap-6">
                                <div className="grid sm:grid-cols-3 items-center gap-4">
                                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <User className="h-4 w-4" /> Full Name
                                    </div>
                                    <div className="sm:col-span-2 text-sm font-semibold text-foreground bg-muted/30 px-3 py-2 rounded-md border border-border/40">
                                        {session.user.name}
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-3 items-center gap-4">
                                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Mail className="h-4 w-4" /> Email Address
                                    </div>
                                    <div className="sm:col-span-2 text-sm font-semibold text-foreground bg-muted/30 px-3 py-2 rounded-md border border-border/40">
                                        {session.user.email}
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-3 items-center gap-4">
                                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Shield className="h-4 w-4" /> Account Role
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${session.user.role === 'admin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                            }`}>
                                            {session.user.role}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security & Activity */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Recent Activity</CardTitle>
                                <CardDescription>View your latest tool usages and history.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg border-border/40">
                                    No recent activity found.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-border/60 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Security</CardTitle>
                                <CardDescription>Update your password and security settings.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <button className="w-full text-left text-sm font-medium text-primary hover:underline py-2">
                                    Change Password →
                                </button>
                                <button className="w-full text-left text-sm font-medium text-primary hover:underline py-2">
                                    Manage Two-Factor Authentication →
                                </button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
