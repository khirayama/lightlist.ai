import { StyleSheet, View as RNView, Text as RNText } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';

export default function TabOneScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      
      {/* NativeWind テスト */}
      <RNView className="mt-6 p-4 bg-primary-500 rounded-lg">
        <RNText className="text-white text-center font-bold">
          NativeWind テスト
        </RNText>
        <RNText className="text-white text-center mt-2">
          Tailwind クラスが動作しています！
        </RNText>
      </RNView>
      
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
