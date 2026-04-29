'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export async function deleteSavedSearch(id: string): Promise<void> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/account');

  await supabase
    .from('saved_search')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // belt-and-braces ownership check

  revalidatePath('/account');
}

export async function removeFromWishlist(horseId: string): Promise<void> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/account');

  await supabase
    .from('wishlist')
    .delete()
    .eq('horse_id', horseId)
    .eq('user_id', user.id);

  revalidatePath('/account');
}
