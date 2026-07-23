import * as AppleAuthentication from 'expo-apple-authentication'
import { GoogleSignin } from '@react-native-google-signin/google-signin'

import {
  signInWithApple,
  signInWithGoogle,
  signInWithPhone,
  signOut,
  verifyPhoneOtp,
} from '@/features/auth/api'
import { ensureUserRow } from '@/features/auth/ensureUserRow'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))

jest.mock('@/features/auth/ensureUserRow', () => ({
  ensureUserRow: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}))

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn() },
  isSuccessResponse: (response: { type: string }) => response.type === 'success',
}))

beforeEach(() => {
  jest.clearAllMocks()
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client-id'
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-client-id'
})

describe('signInWithPhone', () => {
  it('calls signInWithOtp with the phone number', async () => {
    ;(supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null })

    await signInWithPhone('+15551234567')

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ phone: '+15551234567' })
  })

  it('throws the Supabase error on failure', async () => {
    ;(supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: new Error('rate limited') })

    await expect(signInWithPhone('+15551234567')).rejects.toThrow('rate limited')
  })
})

describe('verifyPhoneOtp', () => {
  it('calls verifyOtp with type sms and ensures the user row', async () => {
    ;(supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    await verifyPhoneOtp('+15551234567', '123456')

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      phone: '+15551234567',
      token: '123456',
      type: 'sms',
    })
    expect(ensureUserRow).toHaveBeenCalledWith('user-1')
  })

  it('throws on an invalid code and does not ensure the user row', async () => {
    ;(supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: new Error('invalid code'),
    })

    await expect(verifyPhoneOtp('+15551234567', '000000')).rejects.toThrow('invalid code')
    expect(ensureUserRow).not.toHaveBeenCalled()
  })
})

describe('signInWithApple', () => {
  it('exchanges the identity token and ensures the user row', async () => {
    ;(AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: 'apple-id-token' })
    ;(supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-2' } },
      error: null,
    })

    await signInWithApple()

    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'apple-id-token',
    })
    expect(ensureUserRow).toHaveBeenCalledWith('user-2')
  })

  it('throws when Apple returns no identity token', async () => {
    ;(AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: null })

    await expect(signInWithApple()).rejects.toThrow('identity token')
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled()
  })
})

describe('signInWithGoogle', () => {
  it('exchanges the Google ID token and ensures the user row', async () => {
    ;(GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token', user: {} },
    })
    ;(supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-3' } },
      error: null,
    })

    await signInWithGoogle()

    expect(GoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'web-client-id',
      iosClientId: 'ios-client-id',
    })
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'google-id-token',
    })
    expect(ensureUserRow).toHaveBeenCalledWith('user-3')
  })

  it('does nothing when the user cancels', async () => {
    ;(GoogleSignin.signIn as jest.Mock).mockResolvedValue({ type: 'cancelled' })

    await signInWithGoogle()

    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled()
    expect(ensureUserRow).not.toHaveBeenCalled()
  })

  it('throws a clear error when the web client id is not configured', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

    await expect(signInWithGoogle()).rejects.toThrow('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID')
    expect(GoogleSignin.signIn).not.toHaveBeenCalled()
  })
})

describe('signOut', () => {
  it('calls supabase.auth.signOut', async () => {
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null })

    await signOut()

    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('throws on failure', async () => {
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: new Error('network error') })

    await expect(signOut()).rejects.toThrow('network error')
  })
})
