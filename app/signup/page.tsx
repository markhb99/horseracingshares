import { Display, Body, Small } from '@/components/typography';
import { LoginForm } from '@/components/auth/LoginForm';
import { SilksQuadrant } from '@/components/icons';

interface SignupPageProps {
  searchParams: Promise<{ next?: string }>;
}

export const metadata = {
  title: 'Create your account',
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 flex justify-center">
          <SilksQuadrant size={40} />
        </div>

        {/* Heading */}
        <Display as="h1" className="text-center text-h1 mb-2">
          Create your account
        </Display>

        <Body className="text-center text-muted-foreground mb-8">
          We&apos;ll send you a sign-in link. No password required.
        </Body>

        <LoginForm next={next ?? '/account'} />

        <Small className="mt-8 text-center">
          Already have an account?{' '}
          <a href="/login" className="underline underline-offset-4 hover:text-foreground">
            Log in.
          </a>
        </Small>
      </div>
    </main>
  );
}
