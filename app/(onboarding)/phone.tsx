import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import { StepIndicator } from '@/components/StepIndicator'
import { useAuth } from '@/features/auth/AuthProvider'
import { linkPhone, verifyPhoneChangeOtp } from '@/features/onboarding/api'
import { useOnboardingForm } from '@/features/onboarding/OnboardingFormProvider'

type Step = 'phone' | 'otp'

export default function PhoneStep(): React.JSX.Element | null {
  const router = useRouter()
  const { user } = useAuth()
  const { setForm } = useOnboardingForm()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const alreadyVerified = Boolean(user?.phone)

  useEffect(() => {
    if (alreadyVerified) {
      router.replace('/(onboarding)/goal')
    }
  }, [alreadyVerified, router])

  if (alreadyVerified) {
    return null
  }

  function goToGoal(): void {
    router.push('/(onboarding)/goal')
  }

  async function handleSendCode(): Promise<void> {
    setError(null)
    setPending(true)
    try {
      await linkPhone(phone)
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.')
    } finally {
      setPending(false)
    }
  }

  async function handleVerify(): Promise<void> {
    setError(null)
    setPending(true)
    try {
      await verifyPhoneChangeOtp(phone, code)
      setForm((prev) => ({ ...prev, phone }))
      goToGoal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.')
    } finally {
      setPending(false)
    }
  }

  return (
    <View className="flex-1 justify-center gap-6 bg-white px-6 dark:bg-black">
      <StepIndicator step={2} totalSteps={4} />

      <View className="gap-1">
        <Text className="text-center text-2xl font-bold text-black dark:text-white">Verify your phone</Text>
        <Text className="text-center text-base text-gray-500 dark:text-gray-400">
          Optional — helps friends find you. You can skip this.
        </Text>
      </View>

      {error ? (
        <Text accessibilityRole="alert" className="text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </Text>
      ) : null}

      {step === 'phone' ? (
        <View className="gap-3">
          <TextInput
            accessibilityLabel="Phone number"
            autoComplete="tel"
            className="rounded-lg border border-gray-300 px-4 py-3 text-black dark:border-gray-700 dark:text-white"
            editable={!pending}
            keyboardType="phone-pad"
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor="#9ca3af"
            value={phone}
          />
          <Pressable
            accessibilityLabel="Send verification code"
            accessibilityRole="button"
            className="items-center rounded-lg bg-blue-600 py-3 disabled:opacity-50"
            disabled={pending || phone.length === 0}
            onPress={handleSendCode}
          >
            <Text className="font-semibold text-white">{pending ? 'Sending…' : 'Send code'}</Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-3">
          <TextInput
            accessibilityLabel="Verification code"
            autoComplete="sms-otp"
            className="rounded-lg border border-gray-300 px-4 py-3 text-black dark:border-gray-700 dark:text-white"
            editable={!pending}
            keyboardType="number-pad"
            onChangeText={setCode}
            placeholder="6-digit code"
            placeholderTextColor="#9ca3af"
            value={code}
          />
          <Pressable
            accessibilityLabel="Verify code"
            accessibilityRole="button"
            className="items-center rounded-lg bg-blue-600 py-3 disabled:opacity-50"
            disabled={pending || code.length === 0}
            onPress={handleVerify}
          >
            <Text className="font-semibold text-white">{pending ? 'Verifying…' : 'Verify'}</Text>
          </Pressable>
        </View>
      )}

      <Pressable accessibilityLabel="Skip phone verification" accessibilityRole="button" disabled={pending} onPress={goToGoal}>
        <Text className="text-center text-sm text-blue-600 dark:text-blue-400">Skip for now</Text>
      </Pressable>
    </View>
  )
}
