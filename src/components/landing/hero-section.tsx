'use client';

import Link from 'next/link';
import { ArrowRight, Calculator, PiggyBank, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  isLoggedIn: boolean;
}

function GeometricComposition() {
  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-[500px]">
      {/* Main glow backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />

      {/* Primary circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 backdrop-blur-sm border border-foreground/10 animate-float" />

      {/* Secondary ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border-2 border-primary/20 animate-rotate-slow" />

      {/* Accent shapes */}
      <div className="absolute top-[20%] right-[15%] w-16 h-16 rounded-xl bg-accent/20 backdrop-blur-sm border border-accent/30 rotate-12 animate-float-delayed" />
      <div className="absolute bottom-[25%] left-[10%] w-12 h-12 rounded-full bg-primary/25 backdrop-blur-sm border border-primary/30 animate-float" />
      <div className="absolute top-[60%] right-[20%] w-8 h-8 rounded-lg bg-foreground/10 backdrop-blur-sm border border-foreground/20 -rotate-12 animate-float-delayed" />

      {/* Decorative lines */}
      <div className="absolute top-[30%] left-[20%] w-24 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent rotate-45" />
      <div className="absolute bottom-[35%] right-[25%] w-20 h-[2px] bg-gradient-to-r from-transparent via-accent/40 to-transparent -rotate-12" />

      {/* Small dots */}
      <div className="absolute top-[15%] left-[30%] w-2 h-2 rounded-full bg-primary/60" />
      <div className="absolute bottom-[20%] right-[30%] w-3 h-3 rounded-full bg-accent/50" />
      <div className="absolute top-[45%] left-[5%] w-2 h-2 rounded-full bg-foreground/40" />
    </div>
  );
}

export function HeroSection({ isLoggedIn }: HeroSectionProps) {
  return (
    <section className="relative bg-gradient-to-b from-background via-muted/50 to-background overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Diagonal accent line */}
      <div className="absolute top-0 right-0 w-1/2 h-full overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-full h-[150%] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent transform rotate-12 origin-top-right" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20 lg:pt-28 lg:pb-28">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-8 items-center">
          {/* Content - Left Side (3 columns) */}
          <div className="lg:col-span-3 text-center lg:text-left">
            {/* Eyebrow text */}
            <p className="text-sm font-medium uppercase tracking-widest text-primary mb-6">
              Smart Financial Planning
            </p>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
              Take Control of Your{' '}
              <span className="text-accent">
                Financial Future
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              Powerful calculators for Social Security optimization, retirement planning, and smart financial decisions.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="bg-accent hover:bg-accent/90 text-slate-950 font-semibold text-base px-8 h-12 rounded-lg shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 transition-all"
              >
                <Link href="/social-security">
                  Try SS Calculator
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              {!isLoggedIn && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-border text-foreground hover:bg-muted hover:border-border font-medium text-base px-8 h-12 rounded-lg transition-all"
                >
                  <Link href="/register">Create Free Account</Link>
                </Button>
              )}
              {isLoggedIn && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-border text-foreground hover:bg-muted hover:border-border font-medium text-base px-8 h-12 rounded-lg transition-all"
                >
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Visual - Right Side (2 columns) */}
          <div className="lg:col-span-2 hidden lg:block">
            <GeometricComposition />
          </div>
        </div>

        {/* Feature highlights - Bottom bar */}
        <div className="mt-20 lg:mt-28 pt-10 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Smart Calculators</p>
                <p className="text-sm text-muted-foreground">Precision tools for every decision</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 shadow-lg shadow-accent/10">
                <PiggyBank className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Free to Use</p>
                <p className="text-sm text-muted-foreground">No subscription required</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Expert Analysis</p>
                <p className="text-sm text-muted-foreground">Built with industry knowledge</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
