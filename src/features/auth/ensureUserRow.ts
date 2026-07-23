import { supabase } from '@/lib/supabase'

function generateTempHandle(userId: string): string {
  return `user_${userId.replace(/-/g, '').slice(0, 8)}`
}

/**
 * Creates the public.users row for a newly authenticated user if it doesn't
 * already exist. Safe to call on every sign-in. The generated handle is a
 * placeholder; Task 7 onboarding replaces it.
 */
export async function ensureUserRow(userId: string): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (selectError) {
    throw selectError
  }

  if (existing) {
    return
  }

  const { error: insertError } = await supabase
    .from('users')
    .insert({ id: userId, handle: generateTempHandle(userId) })

  if (insertError) {
    throw insertError
  }
}
