import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { Avatar } from '@/components/Avatar'
import { ProgressBar } from '@/components/ProgressBar'
import { useAuth } from '@/features/auth/AuthProvider'
import { signOut } from '@/features/auth/api'
import { useUpdateDisplayName, useUploadAvatar } from '@/features/profile/mutations'
import { useProfile } from '@/features/profile/useProfile'
import { levelProgress } from '@/features/xp/levels'

function ProfileSkeleton(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6 dark:bg-black">
      <View className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
      <View className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
      <View className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800" />
    </View>
  )
}

function ProfileError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6 dark:bg-black">
      <Text className="text-center text-base text-red-600 dark:text-red-400">Couldn&apos;t load your profile.</Text>
      <Pressable
        accessibilityLabel="Retry loading profile"
        accessibilityRole="button"
        className="rounded-lg bg-blue-600 px-4 py-2"
        onPress={onRetry}
      >
        <Text className="font-semibold text-white">Retry</Text>
      </Pressable>
    </View>
  )
}

export default function ProfileScreen(): React.JSX.Element {
  const { user } = useAuth()
  const { data: profile, isLoading, isError, refetch } = useProfile(user?.id)
  const updateDisplayName = useUpdateDisplayName(user?.id)
  const uploadAvatar = useUploadAvatar(user?.id)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [avatarError, setAvatarError] = useState<string | null>(null)

  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (isError || !profile) {
    return <ProfileError onRetry={() => refetch()} />
  }

  const currentDisplayName = profile.displayName
  const progress = levelProgress(profile.totalXp)

  function startEditingName(): void {
    setNameInput(currentDisplayName)
    setEditingName(true)
  }

  function saveName(): void {
    const trimmed = nameInput.trim()
    setEditingName(false)
    if (trimmed.length > 0 && trimmed !== currentDisplayName) {
      updateDisplayName.mutate(trimmed)
    }
  }

  async function handlePickAvatar(): Promise<void> {
    setAvatarError(null)

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setAvatarError('Photo library access is needed to set an avatar.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (result.canceled) {
      return
    }

    const asset = result.assets[0]
    if (!asset?.base64) {
      setAvatarError('Could not read the selected image.')
      return
    }

    const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg'
    const contentType = asset.mimeType ?? 'image/jpeg'

    uploadAvatar.mutate(
      { base64: asset.base64, extension, contentType },
      { onError: () => setAvatarError('Upload failed. Try again.') },
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      contentContainerClassName="items-center gap-6 px-6 py-10"
    >
      <Pressable accessibilityLabel="Change profile photo" accessibilityRole="button" onPress={handlePickAvatar}>
        <Avatar label={profile.displayName} size={96} uri={profile.avatarUrl} />
        {uploadAvatar.isPending ? (
          <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
            <ActivityIndicator accessibilityLabel="Uploading photo" color="#fff" />
          </View>
        ) : null}
      </Pressable>
      {avatarError ? (
        <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">
          {avatarError}
        </Text>
      ) : null}

      <View className="items-center gap-1">
        {editingName ? (
          <View className="flex-row items-center gap-2">
            <TextInput
              accessibilityLabel="Display name"
              autoFocus
              className="rounded-lg border border-gray-300 px-3 py-1 text-black dark:border-gray-700 dark:text-white"
              onBlur={saveName}
              onChangeText={setNameInput}
              onSubmitEditing={saveName}
              value={nameInput}
            />
          </View>
        ) : (
          <Pressable accessibilityLabel="Edit display name" accessibilityRole="button" onPress={startEditingName}>
            <Text className="text-xl font-bold text-black dark:text-white">{profile.displayName}</Text>
          </Pressable>
        )}
        <Text className="text-base text-gray-500 dark:text-gray-400">@{profile.handle}</Text>
      </View>

      <View className="w-full gap-2">
        <View className="flex-row justify-between">
          <Text className="text-sm font-medium text-black dark:text-white">Level {profile.currentLevel}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">{profile.totalXp} XP</Text>
        </View>
        <ProgressBar
          accessibilityLabel={`Progress to level ${profile.currentLevel + 1}`}
          progress={progress.progress}
        />
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {progress.xpIntoLevel} / {progress.xpForNextLevel} XP to next level
        </Text>
      </View>

      <View className="w-full flex-row justify-around">
        <View className="items-center">
          <Text className="text-2xl font-bold text-black dark:text-white">{profile.currentStreak}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">Current streak</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-bold text-black dark:text-white">{profile.longestStreak}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">Longest streak</Text>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Sign out"
        accessibilityRole="button"
        className="rounded-lg border border-red-600 px-4 py-2"
        onPress={() => signOut()}
      >
        <Text className="font-semibold text-red-600 dark:text-red-400">Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}
