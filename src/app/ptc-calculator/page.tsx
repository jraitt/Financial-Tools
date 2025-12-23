import AcaPtcCalculator from '@/components/aca-ptc-calculator';
import { Navbar } from '@/components/landing/navbar';
import { PageHero } from '@/components/landing/page-hero';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const metadata = {
  title: 'ACA Premium Tax Credit Calculator',
  description: 'Estimate your ACA health insurance premium tax credit based on household income and family size',
};

export default async function PtcCalculatorPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <>
      <Navbar session={session} />
      <PageHero
        title="Premium Tax Credit Calculator"
        accentWord="Calculator"
        subtitle="Estimate your ACA health insurance subsidy based on household income"
      />
      <AcaPtcCalculator />
    </>
  );
}
