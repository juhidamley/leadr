import { Stack } from 'expo-router'

import { OnboardingFormProvider } from '@/features/onboarding/OnboardingFormProvider'

export default function OnboardingLayout(): React.JSX.Element {
  return (
    <OnboardingFormProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingFormProvider>
  )
}
