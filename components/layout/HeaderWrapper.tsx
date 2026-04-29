import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { Header } from '@/components/layout/Header';

export async function HeaderWrapper() {
  let isLoggedIn = false;
  let userInitials: string | undefined;
  let userRole: string | undefined;

  try {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      isLoggedIn = true;
      const email = data.user.email ?? '';
      const name =
        (data.user.user_metadata?.full_name as string | undefined) ?? '';

      if (name) {
        const parts = name.trim().split(/\s+/);
        userInitials =
          parts.length >= 2
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
      } else if (email) {
        userInitials = email[0].toUpperCase();
      }

      // Fetch role from user_profile (use service client to bypass RLS)
      const db = createServiceClient();
      const { data: profile } = await db
        .from('user_profile')
        .select('role')
        .eq('id', data.user.id)
        .single();
      userRole = profile?.role ?? 'buyer';
    }
  } catch {
    // Supabase unavailable during build or pre-render — degrade gracefully.
  }

  return <Header isLoggedIn={isLoggedIn} userInitials={userInitials} userRole={userRole} />;
}
