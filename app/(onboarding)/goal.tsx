import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import { StepIndicator } from '@/components/StepIndicator'
import { useOnboardingForm } from '@/features/onboarding/OnboardingFormProvider'

export default function GoalStep(): React.JSX.Element {
  const router = useRouter()
  const { form, setForm } = useOnboardingForm()
  const [careerGoal, setCareerGoal] = useState(form.careerGoal)
  const [targetRole, setTargetRole] = useState(form.targetRole)

  const canProceed = careerGoal.trim().length > 0 && targetRole.trim().length > 0

  function handleNext(): void {
    setForm((prev) => ({ ...prev, careerGoal, targetRole }))
    router.push('/(onboarding)/invite')
  }

  return (
    <View className="flex-1 justify-center gap-6 bg-white px-6 dark:bg-black">
      <StepIndicator step={3} totalSteps={4} />

      <View className="gap-1">
        <Text className="text-center text-2xl font-bold text-black dark:text-white">What&apos;s your goal?</Text>
        <Text className="text-center text-base text-gray-500 dark:text-gray-400">
          We&apos;ll tailor your feed around this.
        </Text>
      </View>

      <View className="gap-3">
        <TextInput
          accessibilityLabel="Career goal"
          className="rounded-lg border border-gray-300 px-4 py-3 text-black dark:border-gray-700 dark:text-white"
          onChangeText={setCareerGoal}
          placeholder="e.g. Land my first PM role"
          placeholderTextColor="#9ca3af"
          value={careerGoal}
        />
        <TextInput
          accessibilityLabel="Target role"
          className="rounded-lg border border-gray-300 px-4 py-3 text-black dark:border-gray-700 dark:text-white"
          onChangeText={setTargetRole}
          placeholder="e.g. Product Manager"
          placeholderTextColor="#9ca3af"
          value={targetRole}
        />
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
