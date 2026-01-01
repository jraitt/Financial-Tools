import MortgageCalculator from '@/components/mortgage-calculator';
import { Navbar } from '@/components/landing/navbar';
import { PageHero } from '@/components/landing/page-hero';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const metadata = {
  title: 'Mortgage Calculator',
  description: 'Calculate mortgage payments, compare refinancing options, analyze points, and explore paydown strategies',
};

export default async function MortgageCalculatorPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <>
      <Navbar session={session} />
      <PageHero
        title="Mortgage Calculator"
        accentWord="Calculator"
        subtitle="Analyze payments, compare refinancing options, and optimize your mortgage strategy"
      />
      <MortgageCalculator />
    </>
  );
}
