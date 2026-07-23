import { useEffect, useState } from 'react'
import { AccessibilityInfo, Text } from 'react-native'

type AnimatedNumberProps = {
  value: number
  durationMs?: number
  className?: string
}

/**
 * Tweens displayed text from the previous value to `value` on change —
 * used to converge an optimistic XP estimate to the server's
 * authoritative number without a jarring snap. Skips the animation
 * entirely (snaps) when the OS reduced-motion setting is on.
 */
export function AnimatedNumber({ value, durationMs = 500, className }: AnimatedNumberProps): React.JSX.Element {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [tracked, setTracked] = useState({ forValue: value, displayed: value })

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReducedMotion(enabled)
      }
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion)
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  // Reduced motion snaps straight to the new value — adjusted during render
  // (React's documented pattern for resetting state on a prop change)
  // rather than in an effect, so there's no intermediate stale-value frame.
  if (reducedMotion && tracked.forValue !== value) {
    setTracked({ forValue: value, displayed: value })
  }

  useEffect(() => {
    if (reducedMotion) {
      return
    }

    // Starts from whatever is currently on screen, so a second value change
    // mid-tween redirects smoothly instead of restarting from the original.
    const from = tracked.displayed
    const to = value
    if (from === to) {
      return
    }

    const start = Date.now()
    let frame: number

    const tick = (): void => {
      const elapsed = Date.now() - start
      const t = Math.min(1, elapsed / durationMs)
      const eased = 1 - (1 - t) * (1 - t)
      setTracked({ forValue: value, displayed: Math.round(from + (to - from) * eased) })

      if (t < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // Deliberately excludes `tracked` — reading `tracked.displayed` once per
    // effect run (as the tween's start point) is intended; depending on it
    // would restart the effect every animation frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs, reducedMotion])

  return <Text className={className}>{tracked.displayed}</Text>
}
