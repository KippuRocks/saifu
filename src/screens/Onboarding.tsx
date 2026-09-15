import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Disclosure } from "./Disclosure.tsx";
import { Screen } from "./Screen.tsx";

export interface OnboardingProps {
  readonly busy: boolean;
  readonly failed: boolean;
  readonly passkeysAvailable: boolean;
  readonly onSetUp: () => void;
}

/**
 * First run (T-030-04): the recovery disclosure comes before the holder creates
 * a passkey, so nobody provisions a credential without having read it.
 */
export function Onboarding({ busy, failed, passkeysAvailable, onSetUp }: OnboardingProps) {
  return (
    <Screen id="holder.onboarding" busy={busy}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.brand}>Saifu</Text>
        <Disclosure />
        {passkeysAvailable ? null : (
          <Text style={styles.notice}>
            This phone cannot create passkeys, so Saifu cannot be set up on it.
          </Text>
        )}
        {failed ? (
          <Text style={styles.notice} testID="onboarding-failed">
            Setup did not finish. Try again.
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy || !passkeysAvailable}
            onPress={onSetUp}
            style={({ pressed }) => [styles.button, (busy || pressed) && styles.buttonDim]}
            testID="onboarding-set-up"
          >
            <Text style={styles.buttonText}>
              {busy ? "Setting up…" : "I understand, set up Saifu"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 24 },
  brand: { fontSize: 32, fontWeight: "600" },
  notice: { fontSize: 15, color: "#8a1c1c" },
  actions: { gap: 12 },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonDim: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
