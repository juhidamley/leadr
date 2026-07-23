import { type PropsWithChildren } from 'react'
import { Text, View } from 'react-native'

type PlaceholderScreenProps = PropsWithChildren<{
  label: string
}>

export function PlaceholderScreen({ label, children }: PlaceholderScreenProps): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-white dark:bg-black">
      <Text className="text-xl font-semibold text-black dark:text-white">{label}</Text>
      {children}
    </View>
  )
}
