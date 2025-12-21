'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, TrendingUp, User, LogOut, LayoutDashboard, ShieldCheck, ChevronDown, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth-client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.refresh();
  };

  return (
    <nav
      className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
      style={{ overflowAnchor: 'none' }}
    >
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
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 flex items-center gap-2 pr-1 hover:bg-accent/50 transition-colors">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                        {session.user.name}
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2 animate-in fade-in-0 zoom-in-95">
                    <DropdownMenuLabel className="font-normal border-b pb-2 mb-1">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{session.user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground mt-1">{session.user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard" className="flex items-center w-full">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/settings" className="flex items-center w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Account Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    {session.user.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link href="/admin" className="flex items-center w-full text-amber-600 dark:text-amber-400">
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            <span>Admin Console</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:bg-destructive/10 cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden lg:flex items-center gap-2 border-border/50 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
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
                <SheetHeader>
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Navigate through the application.
                  </SheetDescription>
                </SheetHeader>
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
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 px-2 py-1 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <User className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                          <p className="font-semibold text-foreground leading-tight">{session.user.name}</p>
                          <p className="text-xs text-muted-foreground">{session.user.email}</p>
                        </div>
                      </div>
                      <Button asChild variant="ghost" className="justify-start px-2 font-medium">
                        <Link href="/dashboard" className="flex items-center gap-2">
                          <LayoutDashboard className="h-5 w-5" />
                          Dashboard
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" className="justify-start px-2 font-medium">
                        <Link href="/settings" className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Account Settings
                        </Link>
                      </Button>
                      {session.user.role === 'admin' && (
                        <Button asChild variant="ghost" className="justify-start px-2 font-medium text-amber-600 dark:text-amber-400">
                          <Link href="/admin" className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" />
                            Admin Console
                          </Link>
                        </Button>
                      )}
                      <hr className="my-1 border-border/50" />
                      <Button
                        variant="ghost"
                        className="justify-start px-2 font-medium text-destructive hover:text-destructive hover:bg-destructive/5"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Sign Out
                      </Button>
                    </div>
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
