'use client';

import Link from 'next/link';
import {
  Calculator,
  Home,
  Landmark,
  PiggyBank,
  Receipt,
  Wallet,
  ArrowRight,
  Heart,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const tools = [
  {
    title: 'Social Security Optimizer',
    description: 'Maximize your benefits with comprehensive claiming strategy analysis for singles and couples.',
    icon: Landmark,
    href: '/social-security',
    status: 'live',
    color: 'primary',
  },
  {
    title: 'ACA Premium Tax Credit',
    description: 'Estimate your health insurance subsidy based on household income and family size.',
    icon: Heart,
    href: '/ptc-calculator',
    status: 'live',
    color: 'accent',
  },
  {
    title: 'Mortgage Calculator',
    description: 'Calculate monthly payments, compare rates, and explore different loan scenarios.',
    icon: Home,
    href: '#',
    status: 'coming-soon',
    color: 'accent',
  },
  {
    title: 'Loan Calculator',
    description: 'Analyze personal loans, auto loans, and understand your total cost of borrowing.',
    icon: Wallet,
    href: '#',
    status: 'coming-soon',
    color: 'primary',
  },
  {
    title: 'Retirement Planner',
    description: 'Plan your retirement with dynamic spending projections and withdrawal strategies.',
    icon: PiggyBank,
    href: '#',
    status: 'coming-soon',
    color: 'accent',
  },
  {
    title: 'Tax Optimization',
    description: 'Explore tax-efficient strategies including Roth conversions and capital gains planning.',
    icon: Receipt,
    href: '#',
    status: 'coming-soon',
    color: 'primary',
  },
  {
    title: 'Budget Analyzer',
    description: 'Track spending patterns, set goals, and optimize your monthly cash flow.',
    icon: Calculator,
    href: '#',
    status: 'coming-soon',
    color: 'accent',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Powerful{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Financial Tools
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to make informed financial decisions.
            From retirement planning to everyday calculations.
          </p>
        </div>

        {/* Tools grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isLive = tool.status === 'live';
            const colorClass = tool.color === 'primary' ? 'text-primary bg-primary/10' : 'text-accent bg-accent/10';

            const cardContent = (
              <Card className={`h-full transition-all duration-300 ${isLive ? 'hover:shadow-lg hover:border-primary/50 hover:-translate-y-1' : 'opacity-75'}`}>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className={`h-12 w-12 rounded-xl ${colorClass} flex items-center justify-center transition-transform ${isLive ? 'group-hover:scale-110' : ''}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    {isLive ? (
                      <Badge className="bg-accent/10 text-accent hover:bg-accent/20 border-0">
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Coming Soon</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{tool.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {tool.description}
                  </CardDescription>
                  {isLive && (
                    <div className="mt-4 flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                      <span>Try it now</span>
                      <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );

            if (isLive) {
              return (
                <Link
                  key={tool.title}
                  href={tool.href}
                  className="group block cursor-pointer"
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <div key={tool.title} className="group block cursor-default">
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
