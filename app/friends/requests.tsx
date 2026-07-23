import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import { Avatar } from '@/components/Avatar'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCancelFriendRequest, useRespondToRequest } from '@/features/friends/mutations'
import { splitFriendRequests } from '@/features/friends/requestLists'
import type { FriendRequest } from '@/features/friends/types'
import { useFriendRequests } from '@/features/friends/useFriendRequests'

function RequestsError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6 dark:bg-black">
      <Text className="text-center text-base text-red-600 dark:text-red-400">Couldn&apos;t load requests.</Text>
      <Pressable
        accessibilityLabel="Retry loading requests"
        accessibilityRole="button"
        className="rounded-lg bg-blue-600 px-4 py-2"
        onPress={onRetry}
      >
        <Text className="font-semibold text-white">Retry</Text>
      </Pressable>
    </View>
  )
}

type RequestRowProps = {
  request: FriendRequest
  pending: boolean
  children: React.ReactNode
}

function RequestRow({ request, pending, children }: RequestRowProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
      <Avatar label={request.displayName} size={40} uri={null} />
      <View className="flex-1">
        <Text className="text-base font-medium text-black dark:text-white">{request.displayName}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">@{request.handle}</Text>
      </View>
      {pending ? <ActivityIndicator accessibilityLabel="Updating" size="small" /> : <View className="flex-row gap-2">{children}</View>}
    </View>
  )
}

export default function FriendRequestsScreen(): React.JSX.Element {
  const { user } = useAuth()
  const { data: requests, isLoading, isError, refetch } = useFriendRequests(user?.id)
  const respond = useRespondToRequest()
  const cancel = useCancelFriendRequest()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function handleAccept(userId: string): Promise<void> {
    setPendingId(userId)
    try {
      await respond.mutateAsync({ requester: userId, accept: true })
    } finally {
      setPendingId(null)
    }
  }

  async function handleDecline(userId: string): Promise<void> {
    setPendingId(userId)
    try {
      await respond.mutateAsync({ requester: userId, accept: false })
    } finally {
      setPendingId(null)
    }
  }

  async function handleCancel(userId: string): Promise<void> {
    setPendingId(userId)
    try {
      await cancel.mutateAsync(userId)
    } finally {
      setPendingId(null)
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator accessibilityLabel="Loading requests" />
      </View>
    )
  }

  if (isError || !requests) {
    return <RequestsError onRetry={() => refetch()} />
  }

  const { incoming, outgoing } = splitFriendRequests(requests)

  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6 bg-white dark:bg-black">
        <Text className="text-center text-base text-gray-500 dark:text-gray-400">No pending requests.</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="gap-6 px-6 py-4">
      {incoming.length > 0 ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Incoming</Text>
          {incoming.map((request) => (
            <RequestRow key={request.userId} pending={pendingId === request.userId} request={request}>
              <Pressable
                accessibilityLabel={`Accept ${request.displayName}`}
                accessibilityRole="button"
                className="rounded-lg bg-blue-600 px-3 py-2"
                onPress={() => void handleAccept(request.userId)}
              >
                <Text className="text-sm font-semibold text-white">Accept</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Decline ${request.displayName}`}
                accessibilityRole="button"
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700"
                onPress={() => void handleDecline(request.userId)}
              >
                <Text className="text-sm font-semibold text-black dark:text-white">Decline</Text>
              </Pressable>
            </RequestRow>
          ))}
        </View>
      ) : null}

      {outgoing.length > 0 ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Outgoing</Text>
          {outgoing.map((request) => (
            <RequestRow key={request.userId} pending={pendingId === request.userId} request={request}>
              <Pressable
                accessibilityLabel={`Cancel request to ${request.displayName}`}
                accessibilityRole="button"
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700"
                onPress={() => void handleCancel(request.userId)}
              >
                <Text className="text-sm font-semibold text-black dark:text-white">Cancel</Text>
              </Pressable>
            </RequestRow>
          ))}
        </View>
      ) : null}
    </ScrollView>
  )
}
