import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

/**
 * The application shell. Screens arrive with the tasks that specify them
 * (features/030-saifu/tasks.md); until then the shell only proves that a
 * development build starts and renders.
 */
export function App() {
  return (
    <View style={styles.container} testID="saifu-root">
      <Text style={styles.title}>Saifu</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
  },
});
