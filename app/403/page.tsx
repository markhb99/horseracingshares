import Link from 'next/link';
import { H1, Body, Small } from '@/components/typography';

export const metadata = {
  title: 'Access denied',
};

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16 text-center">
      <H1 className="mb-4">You don&apos;t have access.</H1>
      <Body className="text-muted-foreground max-w-sm mb-8">
        If you think this is wrong, email{' '}
        <a
          href="mailto:support@horseracingshares.com"
          className="underline underline-offset-4 hover:text-foreground"
        >
          support@horseracingshares.com
        </a>
      </Body>
      <Small>
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          Back to home
        </Link>
      </Small>
    </main>
  );
}
