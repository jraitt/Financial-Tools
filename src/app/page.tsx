import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Navbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { Footer } from '@/components/landing/footer';

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <main className="flex-1">
      <Navbar session={session} />
      <HeroSection isLoggedIn={!!session} />
      <FeaturesSection />
      <Footer />
    </main>
  );
}
