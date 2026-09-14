import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { passkeysAvailable } from "./passkey/install.ts";

/**
 * The application shell. Screens arrive with the tasks that specify them
 * (features/030-saifu/tasks.md); until then the shell only proves that a
 * development build starts, renders, and links the passkey bridge.
 */
export function App() {
  return (
    <View style={styles.container} testID="saifu-root">
      <Text style={styles.title}>Saifu</Text>
      {passkeysAvailable ? (
        <View collapsable={false} style={styles.marker} testID="passkey-bridge-linked" />
      ) : null}
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
  marker: {
    width: 1,
    height: 1,
  },
});
