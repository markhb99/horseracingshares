import { Display, Body, Small } from '@/components/typography';
import { LoginForm } from '@/components/auth/LoginForm';
import { SilksQuadrant } from '@/components/icons';

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export const metadata = {
  title: 'Log in',
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 flex justify-center">
          <SilksQuadrant size={40} />
        </div>

        {/* Heading */}
        <Display as="h1" className="text-center text-h1 mb-2">
          Log in
        </Display>

        <Body className="text-center text-muted-foreground mb-8">
          Magic link in your inbox in seconds.
        </Body>

        {/* Error banner (e.g. from failed callback) */}
        {error && (
          <Small className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-destructive text-center">
            {decodeURIComponent(error).replace(/_/g, ' ')}
          </Small>
        )}

        <LoginForm next={next} />

        <Small className="mt-8 text-center">
          No account yet?{' '}
          <a href="/signup" className="underline underline-offset-4 hover:text-foreground">
            Create one for free.
          </a>
        </Small>
      </div>
    </main>
  );
}
