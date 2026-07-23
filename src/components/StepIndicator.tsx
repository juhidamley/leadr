import { Text, View } from 'react-native'

type StepIndicatorProps = {
  step: number
  totalSteps: number
}

export function StepIndicator({ step, totalSteps }: StepIndicatorProps): React.JSX.Element {
  return (
    <View accessibilityLabel={`Step ${step} of ${totalSteps}`} className="flex-row items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          className={`h-2 w-2 rounded-full ${index < step ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
        />
      ))}
      <Text className="ml-2 text-xs text-gray-500 dark:text-gray-400">
        Step {step} of {totalSteps}
      </Text>
    </View>
  )
}
