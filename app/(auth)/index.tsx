import * as AppleAuthentication from 'expo-apple-authentication'
import { GoogleSigninButton } from '@react-native-google-signin/google-signin'
import { useState } from 'react'
import { Platform, Pressable, Text, TextInput, View } from 'react-native'

import { signInWithApple, signInWithGoogle, signInWithPhone, verifyPhoneOtp } from '@/features/auth/api'

type PendingAction = 'apple' | 'google' | 'phone' | 'otp' | null

type Step = 'phone' | 'otp'

export default function SignInScreen(): React.JSX.Element {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState<PendingAction>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleApple(): Promise<void> {
    setError(null)
    setPending('apple')
    try {
      await signInWithApple()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apple sign-in failed.')
    } finally {
      setPending(null)
    }
  }

  async function handleGoogle(): Promise<void> {
    setError(null)
    setPending('google')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.')
    } finally {
      setPending(null)
    }
  }

  async function handleSendCode(): Promise<void> {
    setError(null)
    setPending('phone')
    try {
      await signInWithPhone(phone)
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.')
    } finally {
      setPending(null)
    }
  }

  async function handleVerifyCode(): Promise<void> {
    setError(null)
    setPending('otp')
    try {
      await verifyPhoneOtp(phone, code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.')
    } finally {
      setPending(null)
    }
  }

  const isBusy = pending !== null

  return (
    <View className="flex-1 justify-center gap-6 bg-white px-6 dark:bg-black">
      <View className="gap-1">
        <Text className="text-center text-3xl font-bold text-black dark:text-white">Leadr</Text>
        <Text className="text-center text-base text-gray-500 dark:text-gray-400">
          Sign in to start logging your job search.
        </Text>
      </View>

      {error ? (
        <Text accessibilityRole="alert" className="text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </Text>
      ) : null}

      {Platform.OS === 'ios' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={{ height: 48, width: '100%', opacity: isBusy ? 0.5 : 1 }}
          onPress={handleApple}
        />
      ) : null}

      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Dark}
        disabled={isBusy}
        onPress={handleGoogle}
        style={{ alignSelf: 'stretch', height: 48 }}
      />

      <View className="h-px bg-gray-200 dark:bg-gray-800" />

      {step === 'phone' ? (
        <View className="gap-3">
          <TextInput
            accessibilityLabel="Phone number"
            autoComplete="tel"
            className="rounded-lg border border-gray-300 px-4 py-3 text-black dark:border-gray-700 dark:text-white"
            editable={!isBusy}
            keyboardType="phone-pad"
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor="#9ca3af"
            textContentType="telephoneNumber"
            value={phone}
          />
          <Pressable
            accessibilityLabel="Send verification code"
            accessibilityRole="button"
            className="items-center rounded-lg bg-blue-600 py-3 disabled:opacity-50"
            disabled={isBusy || phone.length === 0}
            onPress={handleSendCode}
          >
            <Text className="font-semibold text-white">{pending === 'phone' ? 'Sending…' : 'Send code'}</Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-3">
          <Text className="text-center text-sm text-gray-500 dark:text-gray-400">Code sent to {phone}</Text>
          <TextInput
            accessibilityLabel="Verification code"
            autoComplete="sms-otp"
            className="rounded-lg border border-gray-300 px-4 py-3 text-black dark:border-gray-700 dark:text-white"
            editable={!isBusy}
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
            disabled={isBusy || code.length === 0}
            onPress={handleVerifyCode}
          >
            <Text className="font-semibold text-white">{pending === 'otp' ? 'Verifying…' : 'Verify'}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Edit phone number"
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => {
              setStep('phone')
              setCode('')
              setError(null)
            }}
          >
            <Text className="text-center text-sm text-blue-600 dark:text-blue-400">Use a different number</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
