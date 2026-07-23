import * as AppleAuthentication from 'expo-apple-authentication'
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin'
import { Platform } from 'react-native'

import { supabase } from '@/lib/supabase'

import { ensureUserRow } from './ensureUserRow'

function configureGoogleSignIn(): void {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

  if (!webClientId) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. Set it in .env (see .env.example) before using Google sign-in.',
    )
  }

  GoogleSignin.configure({ webClientId, iosClientId })
}

export async function signInWithApple(): Promise<void> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
  })

  if (!credential.identityToken) {
    throw new Error('Apple sign-in did not return an identity token.')
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  })

  if (error) {
    throw error
  }

  await ensureUserRow(data.user.id)
}

export async function signInWithGoogle(): Promise<void> {
  configureGoogleSignIn()

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
  }

  const response = await GoogleSignin.signIn()

  if (!isSuccessResponse(response)) {
    return
  }

  const idToken = response.data.idToken

  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.')
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  })

  if (error) {
    throw error
  }

  await ensureUserRow(data.user.id)
}

export async function signInWithPhone(phone: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone })

  if (error) {
    throw error
  }
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<void> {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error('Phone verification did not return a user.')
  }

  await ensureUserRow(data.user.id)
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
