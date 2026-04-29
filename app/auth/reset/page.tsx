import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Display, Body } from '@/components/typography';
import { SilksQuadrant } from '@/components/icons';

export const metadata = { title: 'Set new password' };

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <SilksQuadrant size={40} />
        </div>
        <Display as="h1" className="text-center text-h1 mb-2">
          Set new password
        </Display>
        <Body className="text-center text-muted-foreground mb-8">
          Choose a strong password.
        </Body>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
