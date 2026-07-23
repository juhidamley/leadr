import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'

import { StepIndicator } from '@/components/StepIndicator'
import { useAuth } from '@/features/auth/AuthProvider'
import { useShareInvite } from '@/features/invites/useShareInvite'
import { finishOnboarding, HandleTakenError } from '@/features/onboarding/api'
import { useOnboardingForm } from '@/features/onboarding/OnboardingFormProvider'
import { useProfile } from '@/features/profile/useProfile'

export default function InviteStep(): React.JSX.Element {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { form } = useOnboardingForm()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The handle a link should point at is whatever's actually saved right
  // now (public.users.handle) — form.handle is only committed to the DB
  // by handleFinish below, so sharing before tapping Finish still needs
  // to resolve to *this* account, even via the temporary signup handle.
  const { data: profile } = useProfile(user?.id)
  const shareInvite = useShareInvite(profile?.handle)

  async function handleFinish(): Promise<void> {
    if (!user) {
      return
    }

    // Defends a web deep-link/refresh landing directly on this step (or a
    // killed-and-relaunched session) with an in-memory form that never got
    // filled — send them back to redo the required steps instead of
    // submitting blank/invalid fields.
    if (!form.handle || !form.careerGoal || !form.targetRole) {
      router.replace('/(onboarding)')
      return
    }

    setError(null)
    setPending(true)
    try {
      // user.phone covers sign-in-via-phone users who skipped the phone step;
      // form.phone covers users who linked one during onboarding.
      await finishOnboarding(user.id, { ...form, phone: user.phone || form.phone })
      await queryClient.invalidateQueries({ queryKey: ['users', user.id, 'onboarded'] })
      // Stack.Protected's guard flip isn't always reflected in time to evict
      // a screen the user is already deep-navigated into — force it too.
      router.replace('/(tabs)')
    } catch (err) {
      if (err instanceof HandleTakenError) {
        router.replace({ pathname: '/(onboarding)', params: { handleTaken: '1' } })
        return
      }
      setError(err instanceof Error ? err.message : 'Could not finish onboarding.')
      setPending(false)
    }
  }

  return (
    <View className="flex-1 justify-center gap-6 bg-white px-6 dark:bg-black">
      <StepIndicator step={4} totalSteps={4} />

      <View className="gap-1">
        <Text className="text-center text-2xl font-bold text-black dark:text-white">Invite friends</Text>
        <Text className="text-center text-base text-gray-500 dark:text-gray-400">
          Leadr is more fun with friends on your leaderboard.
        </Text>
      </View>

      {error || shareInvite.error ? (
        <Text accessibilityRole="alert" className="text-center text-sm text-red-600 dark:text-red-400">
          {error ?? shareInvite.error}
        </Text>
      ) : null}

      <Pressable
        accessibilityLabel="Invite friends"
        accessibilityRole="button"
        className="items-center rounded-lg border border-blue-600 py-3 disabled:opacity-50"
        disabled={shareInvite.isPending || !profile}
        onPress={() => void shareInvite.share()}
      >
        <Text className="font-semibold text-blue-600 dark:text-blue-400">
          {shareInvite.isPending ? 'Preparing link…' : 'Invite friends'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityLabel="Finish onboarding"
        accessibilityRole="button"
        className="items-center rounded-lg bg-blue-600 py-3 disabled:opacity-50"
        disabled={pending}
        onPress={handleFinish}
      >
        <Text className="font-semibold text-white">{pending ? 'Finishing…' : "I'll do this later / Finish"}</Text>
      </Pressable>
    </View>
  )
}
