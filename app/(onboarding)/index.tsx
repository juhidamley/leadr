import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import { StepIndicator } from '@/components/StepIndicator'
import { checkHandleAvailability } from '@/features/onboarding/api'
import { useOnboardingForm } from '@/features/onboarding/OnboardingFormProvider'
import { validateHandleFormat } from '@/features/onboarding/handleValidation'

type CheckResult = { handle: string; status: 'available' | 'taken' | 'error' }

const DEBOUNCE_MS = 400

export default function HandleStep(): React.JSX.Element {
  const router = useRouter()
  const { handleTaken } = useLocalSearchParams<{ handleTaken?: string }>()
  const { form, setForm } = useOnboardingForm()
  const [handle, setHandle] = useState(form.handle)
  const [result, setResult] = useState<CheckResult | null>(
    handleTaken === '1' && form.handle ? { handle: form.handle, status: 'taken' } : null,
  )

  const formatResult = validateHandleFormat(handle)
  const isChecking = formatResult.valid && result?.handle !== handle

  useEffect(() => {
    if (!formatResult.valid) {
      return
    }

    const timeout = setTimeout(() => {
      checkHandleAvailability(handle)
        .then((available) => setResult({ handle, status: available ? 'available' : 'taken' }))
        .catch(() => setResult({ handle, status: 'error' }))
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeout)
    // formatResult is derived from handle each render; depending on handle alone is correct here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle])

  function handleNext(): void {
    setForm((prev) => ({ ...prev, handle }))
    router.push('/(onboarding)/phone')
  }

  const canProceed = formatResult.valid && !isChecking && result?.status === 'available'

  return (
    <View className="flex-1 justify-center gap-6 bg-white px-6 dark:bg-black">
      <StepIndicator step={1} totalSteps={4} />

      <View className="gap-1">
        <Text className="text-center text-2xl font-bold text-black dark:text-white">Choose your @handle</Text>
        <Text className="text-center text-base text-gray-500 dark:text-gray-400">
          This is how friends will find you on the leaderboard.
        </Text>
      </View>

      <View className="gap-2">
        <TextInput
          accessibilityLabel="Handle"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-lg border border-gray-300 px-4 py-3 text-black dark:border-gray-700 dark:text-white"
          onChangeText={setHandle}
          placeholder="yourhandle"
          placeholderTextColor="#9ca3af"
          value={handle}
        />

        {!formatResult.valid && handle.length > 0 ? (
          <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">
            {formatResult.error}
          </Text>
        ) : null}
        {formatResult.valid && isChecking ? (
          <Text className="text-sm text-gray-500 dark:text-gray-400">Checking availability…</Text>
        ) : null}
        {formatResult.valid && !isChecking && result?.status === 'available' ? (
          <Text className="text-sm text-green-600 dark:text-green-400">@{handle} is available</Text>
        ) : null}
        {formatResult.valid && !isChecking && result?.status === 'taken' ? (
          <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">
            @{handle} is already taken
          </Text>
        ) : null}
        {formatResult.valid && !isChecking && result?.status === 'error' ? (
          <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">
            Couldn&apos;t check availability. Try again.
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityLabel="Continue"
        accessibilityRole="button"
        className="items-center rounded-lg bg-blue-600 py-3 disabled:opacity-50"
        disabled={!canProceed}
        onPress={handleNext}
      >
        <Text className="font-semibold text-white">Continue</Text>
      </Pressable>
    </View>
  )
}
