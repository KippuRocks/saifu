import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Disclosure } from "./Disclosure.tsx";

export interface SettingsProps {
  readonly account: string;
  readonly onClose: () => void;
}

/** Settings (T-030-04): the recovery disclosure again, and the holder's account. */
export function Settings({ account, onClose }: SettingsProps) {
  return (
    <ScrollView contentContainerStyle={styles.page} testID="settings">
      <Pressable accessibilityRole="button" onPress={onClose} testID="settings-close">
        <Text style={styles.link}>Back</Text>
      </Pressable>
      <Text style={styles.heading}>Settings</Text>
      <Disclosure />
      <Text style={styles.label}>Your account</Text>
      <Text selectable style={styles.account}>
        {account}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 16 },
  link: { fontSize: 16, color: "#1f5fbf" },
  heading: { fontSize: 28, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  account: { fontSize: 13, fontFamily: "Courier" },
});
