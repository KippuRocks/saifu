import { StyleSheet, Text } from "react-native";
import { Screen } from "./Screen.tsx";

/** While the app reads what the device holds, before it knows which screen to show. */
export function Starting() {
  return (
    <Screen busy id="app.starting">
      <Text style={styles.brand}>Saifu</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 32, fontWeight: "600", padding: 24 },
});
