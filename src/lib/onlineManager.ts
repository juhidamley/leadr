import NetInfo from '@react-native-community/netinfo'
import { onlineManager } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

let wired = false

/**
 * Wires TanStack Query's connectivity signal to the device's real network
 * state via NetInfo — without this, `onlineManager.isOnline()` never
 * changes and paused mutations would never know it's safe to resume.
 * Idempotent and cheap to call repeatedly; only wires the listener once
 * per process.
 */
export function wireOnlineManager(): void {
  if (wired) {
    return
  }
  wired = true

  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(state.isConnected === true && state.isInternetReachable !== false)
    })
  })
}

export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(onlineManager.isOnline())

  useEffect(() => onlineManager.subscribe(() => setIsOnline(onlineManager.isOnline())), [])

  return isOnline
}
