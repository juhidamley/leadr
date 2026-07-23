import { Stack } from 'expo-router'

export default function FriendsLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Friends' }} />
      <Stack.Screen name="add" options={{ title: 'Add friends' }} />
      <Stack.Screen name="requests" options={{ title: 'Requests' }} />
    </Stack>
  )
}
