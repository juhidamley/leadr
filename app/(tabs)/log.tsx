import * as Crypto from 'expo-crypto'
import { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { AnimatedNumber } from '@/components/AnimatedNumber'
import { XpBurst } from '@/components/XpBurst'
import { deriveCapStates, type ActivityCapState } from '@/features/activities/capState'
import { reconcileAward } from '@/features/activities/reconcile'
import type { ActivityTypeViewModel } from '@/features/activities/types'
import { useActivityTypes } from '@/features/activities/useActivityTypes'
import { useLogActivity } from '@/features/activities/useLogActivity'
import { useLogActivityQueue } from '@/features/activities/useLogActivityQueue'
import { useTodayActivityCounts } from '@/features/activities/useTodayActivityCounts'
import { useAuth } from '@/features/auth/AuthProvider'
import { useProfile } from '@/features/profile/useProfile'
import { estimateAward } from '@/features/xp/estimateAward'
import { useIsOnline } from '@/lib/onlineManager'

function LogSkeleton(): React.JSX.Element {
  return (
    <View className="flex-1 gap-3 bg-white px-6 pt-16 dark:bg-black">
      <View className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-800" />
      {[0, 1, 2].map((i) => (
        <View className="h-14 rounded-xl bg-gray-200 dark:bg-gray-800" key={i} />
      ))}
    </View>
  )
}

function LogError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6 dark:bg-black">
      <Text className="text-center text-base text-red-600 dark:text-red-400">Couldn&apos;t load activities.</Text>
      <Pressable
        accessibilityLabel="Retry loading activities"
        accessibilityRole="button"
        className="rounded-lg bg-blue-600 px-4 py-2"
        onPress={onRetry}
      >
        <Text className="font-semibold text-white">Retry</Text>
      </Pressable>
    </View>
  )
}

function LogEmpty(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-white px-6 dark:bg-black">
      <Text className="text-center text-base text-gray-500 dark:text-gray-400">No activities to log yet.</Text>
    </View>
  )
}

type ActiveBurst = { typeId: string; xp: number; burstId: number }

type ActivityChipProps = {
  type: ActivityTypeViewModel
  capState: ActivityCapState | undefined
  queuedCount: number
  expanded: boolean
  noteValue: string
  burst: ActiveBurst | null
  onTap: () => void
  onLongPress: () => void
  onNoteChange: (text: string) => void
  onSubmitNote: () => void
  onCancelNote: () => void
}

function ActivityChip({
  type,
  capState,
  queuedCount,
  expanded,
  noteValue,
  burst,
  onTap,
  onLongPress,
  onNoteChange,
  onSubmitNote,
  onCancelNote,
}: ActivityChipProps): React.JSX.Element {
  const isCapped = capState?.isCapped ?? false

  return (
    <View className="relative">
      <Pressable
        accessibilityHint="Long press to add an optional note before logging"
        accessibilityLabel={`Log ${type.label}${isCapped ? ', daily cap reached' : `, plus ${type.baseXp} XP`}`}
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 active:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:active:bg-gray-900"
        onLongPress={onLongPress}
        onPress={onTap}
      >
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="text-base font-medium text-black dark:text-white">{type.label}</Text>
          {queuedCount > 0 ? (
            <View className="h-1.5 w-1.5 rounded-full bg-amber-500" accessibilityLabel={`${queuedCount} pending sync`} />
          ) : null}
        </View>
        {isCapped ? (
          <Text className="text-xs font-medium text-amber-600 dark:text-amber-400">Capped today</Text>
        ) : (
          <Text className="text-sm font-semibold text-blue-600 dark:text-blue-400">+{type.baseXp} XP</Text>
        )}
      </Pressable>

      {burst ? <XpBurst key={burst.burstId} xp={burst.xp} /> : null}

      {expanded ? (
        <View className="mt-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
          <TextInput
            accessibilityLabel={`Note for ${type.label}`}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black dark:border-gray-700 dark:bg-black dark:text-white"
            multiline
            onChangeText={onNoteChange}
            placeholder="Add a note (optional)"
            placeholderTextColor="#9ca3af"
            value={noteValue}
          />
          <View className="flex-row justify-end gap-2">
            <Pressable accessibilityLabel="Cancel note" accessibilityRole="button" onPress={onCancelNote}>
              <Text className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Log ${type.label} with note`}
              accessibilityRole="button"
              className="rounded-lg bg-blue-600 px-4 py-2"
              onPress={onSubmitNote}
            >
              <Text className="text-sm font-semibold text-white">Log with note</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  )
}

export default function LogScreen(): React.JSX.Element {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const { data: groups, isLoading, isError, refetch } = useActivityTypes()
  const { data: countsByTypeId } = useTodayActivityCounts(user?.id, profile?.timezone)
  const logActivity = useLogActivity()
  const queue = useLogActivityQueue(user?.id)
  const isOnline = useIsOnline()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [burst, setBurst] = useState<ActiveBurst | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const burstCounter = useRef(0)

  if (isLoading) {
    return <LogSkeleton />
  }

  if (isError || !groups) {
    return <LogError onRetry={() => refetch()} />
  }

  if (groups.length === 0) {
    return <LogEmpty />
  }

  const allTypes = groups.flatMap((group) => group.types)
  const capStates = deriveCapStates(allTypes, countsByTypeId ?? {})
  const hasLoggedToday = Object.values(countsByTypeId ?? {}).some((count) => count > 0)
  const currentStreak = profile?.currentStreak ?? 0
  const streakAfterEstimate = hasLoggedToday ? currentStreak : currentStreak + 1

  async function handleLog(type: ActivityTypeViewModel, note?: string): Promise<void> {
    if (!user) {
      return
    }

    setExpandedId(null)
    setToast(null)

    const capState = capStates[type.id]
    const knownCapped = capState?.isCapped ?? false
    const estimatedXp = knownCapped ? 0 : estimateAward({ baseXp: type.baseXp, streakAfter: streakAfterEstimate })
    burstCounter.current += 1
    setBurst({ typeId: type.id, xp: estimatedXp, burstId: burstCounter.current })

    try {
      // Minted here, at tap time — not inside logActivity — so a retry or
      // an app-restart resume of this exact mutation replays with the
      // same client_id and occurred_at instead of re-deriving them.
      const result = await logActivity.mutateAsync({
        userId: user.id,
        clientId: Crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        activityType: type,
        note,
        estimatedXp,
      })
      const outcome = reconcileAward(estimatedXp, result)
      if (outcome.cappedMessage) {
        setToast(outcome.cappedMessage)
      }
    } catch {
      // A merely-offline tap pauses rather than rejecting, so reaching
      // here means a genuine terminal failure (not just "no connection").
      setToast("Couldn't log that — check your connection and try again.")
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <View className="border-b border-gray-100 px-6 pb-4 pt-16 dark:border-gray-900">
        <Text className="text-2xl font-bold text-black dark:text-white">Log an activity</Text>
        {profile ? (
          <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <Text className="text-sm text-gray-500 dark:text-gray-400">Level {profile.currentLevel} ·</Text>
            <AnimatedNumber className="text-sm text-gray-500 dark:text-gray-400" value={profile.totalXp} />
            <Text className="text-sm text-gray-500 dark:text-gray-400">XP · {profile.currentStreak} day streak</Text>
            {queue.queuedXp > 0 ? (
              <Text className="text-sm font-medium text-amber-600 dark:text-amber-400">+{queue.queuedXp} pending</Text>
            ) : null}
          </View>
        ) : null}

        {!isOnline || queue.queuedCount > 0 || queue.failedCount > 0 ? (
          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            {!isOnline ? (
              <View className="rounded-full bg-gray-200 px-3 py-1 dark:bg-gray-800">
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">Offline — will sync</Text>
              </View>
            ) : null}
            {queue.queuedCount > 0 ? (
              <View className="flex-row items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 dark:bg-blue-950">
                <ActivityIndicator accessibilityLabel="Syncing" size="small" />
                <Text className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  Syncing {queue.queuedCount}…
                </Text>
              </View>
            ) : null}
            {queue.failedCount > 0 ? (
              <View className="rounded-full bg-red-100 px-3 py-1 dark:bg-red-950">
                <Text className="text-xs font-medium text-red-700 dark:text-red-300">
                  {queue.failedCount} couldn&apos;t sync
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {toast ? (
        <View accessibilityLiveRegion="polite" accessibilityRole="alert" className="bg-gray-900 px-6 py-2 dark:bg-gray-100">
          <Text className="text-center text-sm text-white dark:text-black">{toast}</Text>
        </View>
      ) : null}

      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-6">
        {groups.map((group) => (
          <View className="gap-2" key={group.category}>
            <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {group.category}
            </Text>
            <View className="gap-2">
              {group.types.map((type) => (
                <ActivityChip
                  burst={burst?.typeId === type.id ? burst : null}
                  capState={capStates[type.id]}
                  expanded={expandedId === type.id}
                  key={type.id}
                  noteValue={noteDraft}
                  onCancelNote={() => {
                    setExpandedId(null)
                    setNoteDraft('')
                  }}
                  onLongPress={() => {
                    setNoteDraft('')
                    setExpandedId((current) => (current === type.id ? null : type.id))
                  }}
                  onNoteChange={setNoteDraft}
                  onSubmitNote={() => {
                    const trimmed = noteDraft.trim()
                    setNoteDraft('')
                    void handleLog(type, trimmed.length > 0 ? trimmed : undefined)
                  }}
                  onTap={() => {
                    if (expandedId === type.id) {
                      setExpandedId(null)
                      return
                    }
                    void handleLog(type)
                  }}
                  queuedCount={queue.entries.filter((entry) => entry.activityTypeId === type.id && entry.status === 'queued').length}
                  type={type}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
