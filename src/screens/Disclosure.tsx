import { StyleSheet, Text, View } from "react-native";
import { RECOVERY_DISCLOSURE } from "../copy/recovery";

/** The recovery disclosure, as onboarding and settings both show it. */
export function Disclosure() {
  return (
    <View style={styles.box} testID="recovery-disclosure">
      <Text style={styles.title}>{RECOVERY_DISCLOSURE.title}</Text>
      {RECOVERY_DISCLOSURE.paragraphs.map((paragraph) => (
        <Text key={paragraph} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  title: { fontSize: 22, fontWeight: "600" },
  paragraph: { fontSize: 16, lineHeight: 22 },
});
