import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { DEVICES_COPY } from "../copy/devices.ts";
import { ONBOARDING_COPY } from "../copy/onboarding";
import { Disclosure } from "./Disclosure.tsx";
import type { Router } from "./router.ts";
import { Screen } from "./Screen.tsx";

export interface OnboardingProps {
  readonly busy: boolean;
  readonly failed: boolean;
  readonly passkeysAvailable: boolean;
  readonly onSetUp: () => void;
  readonly router: Router;
  /** Restores the holder from a synced passkey, where Saifu offers it (T-030-19). */
  readonly onRestore?: () => void;
  /** Why the last restore failed. */
  readonly restoreFailure?: keyof typeof ONBOARDING_COPY.restoreFailed | null;
  /** Why setup is needed now: a link into Saifu is waiting for it. */
  readonly pendingNotice?: string | null;
}

/**
 * First run (T-030-04): the recovery disclosure comes before the holder creates
 * a passkey, so nobody provisions a credential without having read it.
 */
export function Onboarding({
  busy,
  failed,
  passkeysAvailable,
  onSetUp,
  router,
  onRestore,
  restoreFailure = null,
  pendingNotice = null,
}: OnboardingProps) {
  return (
    <Screen id="holder.onboarding" busy={busy}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.brand}>Saifu</Text>
        {pendingNotice === null ? null : (
          <Text style={styles.pending} testID="holder.onboarding.pending-link">
            {pendingNotice}
          </Text>
        )}
        <Disclosure />
        {passkeysAvailable ? null : (
          <Text style={styles.notice}>{ONBOARDING_COPY.passkeysUnavailable}</Text>
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
          <Pressable
            accessibilityRole="button"
            disabled={busy || !passkeysAvailable}
            onPress={() => router.navigate("holder.onboarding", "device.join", {})}
            testID="onboarding-join"
          >
            <Text style={styles.link}>{DEVICES_COPY.joinOffer}</Text>
          </Pressable>
          {ONBOARDING_COPY.restoreOffer === null || onRestore === undefined ? null : (
            <Pressable
              accessibilityRole="button"
              disabled={busy || !passkeysAvailable}
              onPress={onRestore}
              testID="onboarding-restore"
            >
              <Text style={styles.link}>{ONBOARDING_COPY.restoreOffer}</Text>
            </Pressable>
          )}
          {restoreFailure === null ? null : (
            <Text style={styles.notice} testID="onboarding-restore-failed">
              {ONBOARDING_COPY.restoreFailed[restoreFailure]}
            </Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 24 },
  brand: { fontSize: 32, fontWeight: "600" },
  pending: { fontSize: 16, fontWeight: "600" },
  notice: { fontSize: 15, color: "#8a1c1c" },
  actions: { gap: 12 },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonDim: { opacity: 0.6 },
  link: { fontSize: 16, color: "#1f5fbf", textAlign: "center", paddingVertical: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
