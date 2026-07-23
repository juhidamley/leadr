import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'

type ProgressBarProps = {
  progress: number
  accessibilityLabel: string
}

export function ProgressBar({ progress, accessibilityLabel }: ProgressBarProps): React.JSX.Element {
  const reducedMotion = useReducedMotion()
  const widthPercent = useSharedValue(0)
  const clamped = Math.max(0, Math.min(1, progress)) * 100

  useEffect(() => {
    widthPercent.value = reducedMotion ? clamped : withTiming(clamped, { duration: 400 })
  }, [clamped, reducedMotion, widthPercent])

  const animatedStyle = useAnimatedStyle(() => ({ width: `${widthPercent.value}%` }))

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
    >
      <Animated.View className="h-full rounded-full bg-blue-600" style={animatedStyle} />
    </View>
  )
}
