import { Text, View } from 'react-native'

type PlaceholderScreenProps = {
  label: string
}

export function PlaceholderScreen({ label }: PlaceholderScreenProps): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <Text className="text-xl font-semibold text-black dark:text-white">{label}</Text>
    </View>
  )
}
