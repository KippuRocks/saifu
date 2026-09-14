import { holderAccountId } from "@ticketto/profile-v0";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type HolderPhase, phaseFor } from "./app/holder-state.ts";
import { holderServices } from "./app/services.ts";
import { passkeysAvailable } from "./passkey/install.ts";
import { Onboarding } from "./screens/Onboarding.tsx";
import { Settings } from "./screens/Settings.tsx";

/** The application shell: onboarding until the holder's credential is registered and linked. */
export function App() {
  const services = useMemo(() => holderServices(), []);
  const [phase, setPhase] = useState<HolderPhase>({ kind: "loading" });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refresh = useCallback(async () => {
    const record = await services.store.load();
    const account = record === null ? null : holderAccountId(record.userId);
    setPhase(phaseFor(record, account, Date.now()));
  }, [services]);

  useEffect(() => {
    refresh().catch(() => setPhase({ kind: "onboarding", failed: true }));
  }, [refresh]);

  const setUp = useCallback(async () => {
    setPhase({ kind: "provisioning" });
    try {
      const done = await services.provisionAndLink();
      if (!done.ok) throw new Error(done.error.code);
      await refresh();
    } catch {
      setPhase({ kind: "onboarding", failed: true });
    }
  }, [services, refresh]);

  return (
    <View style={styles.root} testID="saifu-root">
      {passkeysAvailable ? (
        <View collapsable={false} style={styles.marker} testID="passkey-bridge-linked" />
      ) : null}
      {phase.kind === "loading" ? (
        <Text style={styles.brand}>Saifu</Text>
      ) : phase.kind === "ready" ? (
        settingsOpen ? (
          <Settings account={phase.account} onClose={() => setSettingsOpen(false)} />
        ) : (
          <View style={styles.home} testID="home">
            <Text style={styles.brand}>Saifu</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSettingsOpen(true)}
              testID="open-settings"
            >
              <Text style={styles.link}>Settings</Text>
            </Pressable>
          </View>
        )
      ) : (
        <Onboarding
          busy={phase.kind === "provisioning"}
          failed={phase.kind === "onboarding" && phase.failed}
          passkeysAvailable={passkeysAvailable}
          onSetUp={setUp}
        />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 48 },
  brand: { fontSize: 32, fontWeight: "600", padding: 24 },
  home: { flex: 1 },
  link: { fontSize: 16, color: "#1f5fbf", paddingHorizontal: 24 },
  marker: { width: 1, height: 1 },
});
