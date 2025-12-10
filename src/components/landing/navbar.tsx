'use client';

import Link from 'next/link';
import { Menu, TrendingUp } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

interface NavbarProps {
  session: {
    user: {
      name: string;
      email: string;
      role: string;
    };
  } | null;
}

export function Navbar({ session }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Financial Tools
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/social-security"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              SS Calculator
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Tools
            </Link>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {session ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {session.user.name}
                </span>
                <Button asChild variant="default" size="sm">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                {session.user.role === 'admin' && (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin">Admin</Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-4 mt-8">
                  <Link
                    href="/social-security"
                    className="text-lg font-medium hover:text-primary transition-colors"
                  >
                    SS Calculator
                  </Link>
                  <Link
                    href="#features"
                    className="text-lg font-medium hover:text-primary transition-colors"
                  >
                    Tools
                  </Link>
                  <hr className="my-2" />
                  {session ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Signed in as {session.user.name}
                      </p>
                      <Button asChild className="w-full">
                        <Link href="/dashboard">Dashboard</Link>
                      </Button>
                      {session.user.role === 'admin' && (
                        <Button asChild variant="outline" className="w-full">
                          <Link href="/admin">Admin</Link>
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/login">Sign In</Link>
                      </Button>
                      <Button asChild className="w-full">
                        <Link href="/register">Get Started</Link>
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
