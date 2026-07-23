import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

import { normalizeHandle } from './handleValidation'

export class HandleTakenError extends Error {
  constructor() {
    super('That handle was just taken. Please choose another.')
    this.name = 'HandleTakenError'
  }
}

const UNIQUE_VIOLATION = '23505'

export async function checkHandleAvailability(candidate: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_handle_available', { candidate })

  if (error) {
    throw error
  }

  return data
}

export async function linkPhone(phone: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ phone })

  if (error) {
    throw error
  }
}

export async function verifyPhoneChangeOtp(phone: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'phone_change' })

  if (error) {
    throw error
  }
}

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

type OnboardingFormInput = {
  handle: string
  careerGoal: string
  targetRole: string
  phone: string | null
}

export function buildOnboardingPatch(input: OnboardingFormInput): Database['public']['Tables']['users']['Update'] {
  return {
    handle: normalizeHandle(input.handle),
    career_goal: input.careerGoal,
    target_role: input.targetRole,
    timezone: getDeviceTimezone(),
    onboarded: true,
    ...(input.phone ? { phone: input.phone } : {}),
  }
}

export async function finishOnboarding(userId: string, input: OnboardingFormInput): Promise<void> {
  const patch = buildOnboardingPatch(input)
  const { error } = await supabase.from('users').update(patch).eq('id', userId)

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new HandleTakenError()
    }
    throw error
  }
}
