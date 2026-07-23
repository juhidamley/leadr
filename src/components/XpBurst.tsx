import * as Haptics from 'expo-haptics'
import { useEffect } from 'react'
import { AccessibilityInfo } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated'

type XpBurstProps = {
  xp: number
}

/**
 * A single fire-and-forget burst — mount fresh (e.g. via `key={tapCount}`)
 * to replay it on each tap. Reduced-motion swaps the rise+hold+fade for a
 * plain fade and skips haptics entirely.
 */
export function XpBurst({ xp }: XpBurstProps): React.JSX.Element {
  const reducedMotion = useReducedMotion()
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(0)

  useEffect(() => {
    const label = xp > 0 ? `Plus ${xp} XP` : 'Activity logged'
    AccessibilityInfo.announceForAccessibility(label)

    if (!reducedMotion) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    }

    const duration = reducedMotion ? 250 : 700
    opacity.value = withSequence(
      withTiming(1, { duration: duration * 0.2 }),
      withTiming(1, { duration: duration * 0.5 }),
      withTiming(0, { duration: duration * 0.3 }),
    )
    if (!reducedMotion) {
      translateY.value = withTiming(-24, { duration })
    }
    // Fires once per mount (replay via remount with a fresh `key`), not on every prop change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View className="absolute inset-x-0 top-0 items-center" pointerEvents="none" style={style}>
      <Animated.Text className="text-2xl font-bold text-green-500">{xp > 0 ? `+${xp} XP` : 'Logged'}</Animated.Text>
    </Animated.View>
  )
}
