import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/AuthProvider'
import type { ProfileViewModel } from '@/features/profile/mapProfile'
import { profileQueryKey } from '@/features/profile/useProfile'
import { estimateAward } from '@/features/xp/estimateAward'
import { levelForXp } from '@/features/xp/levels'

import { logActivity } from './logActivity'
import { reconcileAward, reconcileFailure, type ReconcileOutcome, type ReconcileSnapshot } from './reconcile'
import type { ActivityTypeViewModel, AwardXpResponse } from './types'

export type LogActivityVars = {
  activityType: ActivityTypeViewModel
  note?: string
  /**
   * Best-effort guess at the post-award streak, used only to compute the
   * optimistic estimate (e.g. current streak if already logged today,
   * current streak + 1 for a fresh consecutive day). The server's real
   * streak transition (freeze/reset/etc.) always wins on reconcile.
   */
  streakAfterEstimate: number
  /**
   * True when the client already knows (from today's local activity
   * counts) that this tap will hit the daily cap. Skips the optimistic
   * estimate in favor of showing 0 immediately, so a known-capped tap
   * never shows a gain that then visibly corrects down — the server
   * still confirms via `capped` in the response.
   */
  knownCapped?: boolean
}

export type LogActivityMutationContext = {
  previous: ProfileViewModel | undefined
  optimisticXpDelta: number
}

function snapshotOf(previous: ProfileViewModel | undefined): ReconcileSnapshot {
  return {
    totalXp: previous?.totalXp ?? 0,
    currentLevel: previous?.currentLevel ?? 1,
    currentStreak: previous?.currentStreak ?? 0,
    longestStreak: previous?.longestStreak ?? 0,
  }
}

export function useLogActivity(): UseMutationResult<AwardXpResponse, Error, LogActivityVars, LogActivityMutationContext> {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = profileQueryKey(user?.id)

  function applyOutcome(outcome: ReconcileOutcome): void {
    queryClient.setQueryData<ProfileViewModel>(queryKey, (old: ProfileViewModel | undefined) =>
      old
        ? {
            ...old,
            totalXp: outcome.after.totalXp,
            currentLevel: outcome.after.currentLevel,
            currentStreak: outcome.after.currentStreak,
            longestStreak: outcome.after.longestStreak,
          }
        : old,
    )
  }

  return useMutation({
    mutationFn: async (vars: LogActivityVars) => logActivity({ activityTypeKey: vars.activityType.key, note: vars.note }),

    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ProfileViewModel>(queryKey)
      const optimisticXpDelta = vars.knownCapped
        ? 0
        : estimateAward({ baseXp: vars.activityType.baseXp, streakAfter: vars.streakAfterEstimate })

      if (previous) {
        const optimisticTotalXp = previous.totalXp + optimisticXpDelta
        queryClient.setQueryData<ProfileViewModel>(queryKey, {
          ...previous,
          totalXp: optimisticTotalXp,
          currentLevel: levelForXp(optimisticTotalXp),
          currentStreak: vars.streakAfterEstimate,
          longestStreak: Math.max(previous.longestStreak, vars.streakAfterEstimate),
        })
      }

      return { previous, optimisticXpDelta }
    },

    onSuccess: (server, _vars, context) => {
      applyOutcome(reconcileAward({ optimisticXpDelta: context.optimisticXpDelta, before: snapshotOf(context.previous) }, server))
    },

    onError: (_error, _vars, context) => {
      if (!context) {
        return
      }
      applyOutcome(reconcileFailure({ optimisticXpDelta: context.optimisticXpDelta, before: snapshotOf(context.previous) }))
    },
  })
}
