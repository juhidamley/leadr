import { Link } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import { Avatar } from '@/components/Avatar'
import { useAuth } from '@/features/auth/AuthProvider'
import { useBlockUser, useRemoveFriend } from '@/features/friends/mutations'
import type { Friend } from '@/features/friends/types'
import { useFriendRequests } from '@/features/friends/useFriendRequests'
import { useFriends } from '@/features/friends/useFriends'

function FriendsSkeleton(): React.JSX.Element {
  return (
    <View className="flex-1 gap-3 bg-white px-6 pt-6 dark:bg-black">
      {[0, 1, 2].map((i) => (
        <View className="h-16 rounded-xl bg-gray-200 dark:bg-gray-800" key={i} />
      ))}
    </View>
  )
}

function FriendsError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6 dark:bg-black">
      <Text className="text-center text-base text-red-600 dark:text-red-400">Couldn&apos;t load your friends.</Text>
      <Pressable
        accessibilityLabel="Retry loading friends"
        accessibilityRole="button"
        className="rounded-lg bg-blue-600 px-4 py-2"
        onPress={onRetry}
      >
        <Text className="font-semibold text-white">Retry</Text>
      </Pressable>
    </View>
  )
}

function FriendsEmpty(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white px-6 dark:bg-black">
      <Text className="text-center text-base text-gray-500 dark:text-gray-400">
        No friends yet — find people by @handle to start a leaderboard.
      </Text>
      <Link asChild href="/friends/add">
        <Pressable accessibilityLabel="Find friends" accessibilityRole="button" className="rounded-lg bg-blue-600 px-4 py-2">
          <Text className="font-semibold text-white">Find friends</Text>
        </Pressable>
      </Link>
      <Text className="text-center text-xs text-gray-400 dark:text-gray-500">Invite links are coming soon.</Text>
    </View>
  )
}

type FriendRowProps = {
  friend: Friend
  expanded: boolean
  onLongPress: () => void
  onRemove: () => void
  onBlock: () => void
}

function FriendRow({ friend, expanded, onLongPress, onRemove, onBlock }: FriendRowProps): React.JSX.Element {
  return (
    <View className="rounded-xl border border-gray-200 dark:border-gray-800">
      <Pressable
        accessibilityHint="Long press for more actions"
        accessibilityLabel={`${friend.displayName}, @${friend.handle}, level ${friend.currentLevel}, ${friend.currentStreak} day streak`}
        className="flex-row items-center gap-3 px-4 py-3"
        onLongPress={onLongPress}
      >
        <Avatar label={friend.displayName} size={40} uri={null} />
        <View className="flex-1">
          <Text className="text-base font-medium text-black dark:text-white">{friend.displayName}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">@{friend.handle}</Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-semibold text-black dark:text-white">Lvl {friend.currentLevel}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">{friend.currentStreak}d streak</Text>
        </View>
      </Pressable>

      {expanded ? (
        <View className="flex-row justify-end gap-4 border-t border-gray-100 px-4 py-2 dark:border-gray-900">
          <Pressable accessibilityLabel={`Remove ${friend.displayName}`} accessibilityRole="button" onPress={onRemove}>
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-300">Remove</Text>
          </Pressable>
          <Pressable accessibilityLabel={`Block ${friend.displayName}`} accessibilityRole="button" onPress={onBlock}>
            <Text className="text-sm font-medium text-red-600 dark:text-red-400">Block</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

export default function FriendsScreen(): React.JSX.Element {
  const { user } = useAuth()
  const { data: friends, isLoading, isError, refetch } = useFriends(user?.id)
  const { data: requests } = useFriendRequests(user?.id)
  const removeFriend = useRemoveFriend()
  const blockUser = useBlockUser()

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const incomingCount = requests?.filter((request) => request.direction === 'incoming').length ?? 0

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <View className="flex-row gap-3 px-6 pt-4">
        <Link asChild href="/friends/add">
          <Pressable accessibilityLabel="Add friends" accessibilityRole="button" className="flex-1 rounded-lg bg-blue-600 px-4 py-2">
            <Text className="text-center font-semibold text-white">Add friends</Text>
          </Pressable>
        </Link>
        <Link asChild href="/friends/requests">
          <Pressable
            accessibilityLabel={`Requests${incomingCount > 0 ? `, ${incomingCount} pending` : ''}`}
            accessibilityRole="button"
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700"
          >
            <Text className="text-center font-semibold text-black dark:text-white">Requests</Text>
            {incomingCount > 0 ? (
              <View className="min-w-[18px] items-center rounded-full bg-red-600 px-1.5 py-0.5">
                <Text className="text-xs font-bold text-white">{incomingCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </Link>
      </View>

      {isLoading ? (
        <FriendsSkeleton />
      ) : isError || !friends ? (
        <FriendsError onRetry={() => refetch()} />
      ) : friends.length === 0 ? (
        <FriendsEmpty />
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-2 px-6 py-4">
          {friends.map((friend) => (
            <FriendRow
              expanded={expandedId === friend.id}
              friend={friend}
              key={friend.id}
              onBlock={() => {
                setExpandedId(null)
                blockUser.mutate(friend.id)
              }}
              onLongPress={() => setExpandedId((current) => (current === friend.id ? null : friend.id))}
              onRemove={() => {
                setExpandedId(null)
                removeFriend.mutate(friend.id)
              }}
            />
          ))}
        </ScrollView>
      )}

      {removeFriend.isPending || blockUser.isPending ? (
        <View className="absolute inset-0 items-center justify-center bg-black/10">
          <ActivityIndicator accessibilityLabel="Updating" />
        </View>
      ) : null}
    </View>
  )
}
