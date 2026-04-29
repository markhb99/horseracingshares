import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Display, Body } from '@/components/typography';
import { SilksQuadrant } from '@/components/icons';

export const metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <SilksQuadrant size={40} />
        </div>
        <Display as="h1" className="text-center text-h1 mb-2">
          Reset password
        </Display>
        <Body className="text-center text-muted-foreground mb-8">
          Enter your email and we&apos;ll send you a reset link.
        </Body>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
