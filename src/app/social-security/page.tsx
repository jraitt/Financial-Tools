import SocialSecurityCalculator from '@/components/social-security-calculator';
import { Navbar } from '@/components/landing/navbar';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const metadata = {
  title: 'Social Security Estimator',
  description: 'Calculate and optimize your Social Security benefits',
};

export default async function CalculatorPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <>
      <Navbar session={session} />
      <SocialSecurityCalculator />
    </>
  );
}
