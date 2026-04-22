import { redirect } from 'next/navigation';
import { H1, Body } from '@/components/typography';
import { Button } from '@/components/ui/button';
import { createServerClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';

export const metadata = {
  title: 'My account',
};

export default async function AccountPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/account');
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <H1 className="mb-2">Welcome back</H1>
          <Body className="text-muted-foreground">
            Signed in as {user.email}
          </Body>
        </div>

        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
