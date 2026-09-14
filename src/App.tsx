import { holderAccountId } from "@ticketto/profile-v0";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { type HolderPhase, phaseFor } from "./app/holder-state.ts";
import { holderServices } from "./app/services.ts";
import { ticketDetail } from "./holdings/detail.ts";
import type { LoadedHoldings } from "./holdings/load.ts";
import type { HoldingView } from "./holdings/types.ts";
import { passkeysAvailable } from "./passkey/install.ts";
import { Holdings } from "./screens/Holdings.tsx";
import { Onboarding } from "./screens/Onboarding.tsx";
import { Settings } from "./screens/Settings.tsx";
import { TicketDetail } from "./screens/TicketDetail.tsx";

/** The application shell: onboarding until the holder's credential is registered and linked. */
export function App() {
  const services = useMemo(() => holderServices(), []);
  const [phase, setPhase] = useState<HolderPhase>({ kind: "loading" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loaded, setLoaded] = useState<LoadedHoldings | null>(null);
  const [open, setOpen] = useState<HoldingView | null>(null);

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

  const account = phase.kind === "ready" ? phase.account : null;
  const reload = useCallback(async () => {
    if (account === null) return;
    setLoaded(await services.loadHoldings(account));
  }, [services, account]);

  useEffect(() => {
    reload().catch(() => setLoaded({ source: "none", error: null }));
  }, [reload]);

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
        ) : open !== null ? (
          <TicketDetail
            detail={ticketDetail(
              open,
              loaded !== null && loaded.source !== "none" ? loaded.entry.assurance : null,
            )}
            onClose={() => setOpen(null)}
          />
        ) : (
          <Holdings
            loaded={loaded}
            onOpen={setOpen}
            onRefresh={() => {
              reload().catch(() => {});
            }}
            onSettings={() => setSettingsOpen(true)}
          />
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
  marker: { width: 1, height: 1 },
});
