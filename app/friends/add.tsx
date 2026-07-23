import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { Avatar } from '@/components/Avatar'
import { describeRelationshipAction } from '@/features/friends/relationshipAction'
import type { SearchResult } from '@/features/friends/types'
import { useSendFriendRequest } from '@/features/friends/mutations'
import { useSearchUsers } from '@/features/friends/useSearchUsers'

type ResultRowProps = {
  result: SearchResult
  onAdd: () => void
  pending: boolean
}

function ResultRow({ result, onAdd, pending }: ResultRowProps): React.JSX.Element {
  const action = describeRelationshipAction(result.relationship)

  function handlePress(): void {
    if (action.kind === 'add') {
      onAdd()
      return
    }
    if (action.kind === 'respond') {
      router.push('/friends/requests')
    }
  }

  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
      <Avatar label={result.displayName} size={40} uri={null} />
      <View className="flex-1">
        <Text className="text-base font-medium text-black dark:text-white">{result.displayName}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">@{result.handle}</Text>
      </View>
      <Pressable
        accessibilityLabel={`${action.label} ${result.displayName}`}
        accessibilityRole="button"
        className={`rounded-lg px-3 py-2 ${action.disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-blue-600'}`}
        disabled={action.disabled || pending}
        onPress={handlePress}
      >
        <Text className={`text-sm font-semibold ${action.disabled ? 'text-gray-500 dark:text-gray-400' : 'text-white'}`}>
          {pending ? '…' : action.label}
        </Text>
      </Pressable>
    </View>
  )
}

export default function AddFriendsScreen(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const { data: results, isLoading, isError, isFetching } = useSearchUsers(query)
  const sendRequest = useSendFriendRequest()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function handleAdd(id: string): Promise<void> {
    setPendingId(id)
    try {
      await sendRequest.mutateAsync(id)
    } finally {
      setPendingId(null)
    }
  }

  const trimmed = query.trim()

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <View className="gap-2 px-6 pt-4">
        <TextInput
          accessibilityLabel="Search by handle"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-lg border border-gray-300 px-3 py-2 text-black dark:border-gray-700 dark:text-white"
          onChangeText={setQuery}
          placeholder="Search by @handle"
          placeholderTextColor="#9ca3af"
          value={query}
        />
      </View>

      {trimmed.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-gray-500 dark:text-gray-400">
            Type a handle to find people to add.
          </Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-red-600 dark:text-red-400">Search failed. Try again.</Text>
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator accessibilityLabel="Searching" />
        </View>
      ) : !results || results.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-gray-500 dark:text-gray-400">
            No one found for &quot;{trimmed}&quot;.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-2 px-6 py-4">
          {isFetching ? <ActivityIndicator accessibilityLabel="Refreshing results" size="small" /> : null}
          {results.map((result) => (
            <ResultRow
              key={result.id}
              onAdd={() => void handleAdd(result.id)}
              pending={pendingId === result.id}
              result={result}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
}
