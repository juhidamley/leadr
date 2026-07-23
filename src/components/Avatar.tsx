import { Image, Text, View } from 'react-native'

type AvatarProps = {
  uri: string | null
  label: string
  size?: number
}

export function Avatar({ uri, label, size = 80 }: AvatarProps): React.JSX.Element {
  if (uri) {
    return (
      <Image
        accessibilityLabel="Profile photo"
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    )
  }

  const initials = label.slice(0, 2).toUpperCase()

  return (
    <View
      accessibilityLabel="Profile photo placeholder"
      className="items-center justify-center rounded-full bg-blue-600"
      style={{ width: size, height: size }}
    >
      <Text className="font-semibold text-white" style={{ fontSize: size / 2.5 }}>
        {initials}
      </Text>
    </View>
  )
}
