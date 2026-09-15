import { holderAccountId } from "@ticketto/profile-v0";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type HolderPhase, phaseFor } from "./app/holder-state.ts";
import { holderServices } from "./app/services.ts";
import { ledgerTicketDetail } from "./holdings/degraded.ts";
import { ticketDetail } from "./holdings/detail.ts";
import type { LoadedHoldings } from "./holdings/load.ts";
import { passkeysAvailable } from "./passkey/install.ts";
import { Holdings, type OpenedHolding } from "./screens/Holdings.tsx";
import { Onboarding } from "./screens/Onboarding.tsx";
import { useRouter } from "./screens/router.ts";
import { Settings } from "./screens/Settings.tsx";
import { Starting } from "./screens/Starting.tsx";
import { TicketDetail } from "./screens/TicketDetail.tsx";

/** The held ticket a `ticket.detail` location names, from whichever source loaded it. */
function openedHolding(
  loaded: LoadedHoldings | null,
  ticket: string | undefined,
): OpenedHolding | null {
  if (loaded === null || ticket === undefined || loaded.source === "none") return null;
  if (loaded.source === "ledger") {
    const holding = loaded.tickets.find((h) => h.ticket.id === ticket);
    return holding === undefined ? null : { from: "ledger", holding };
  }
  const holding = loaded.entry.read.holdings.find((h) => h.ticket.id === ticket);
  return holding === undefined ? null : { from: "kippu", holding };
}

/** The application shell: onboarding until the holder's credential is registered and linked. */
export function App() {
  const services = useMemo(() => holderServices(), []);
  const [phase, setPhase] = useState<HolderPhase>({ kind: "loading" });
  const [loaded, setLoaded] = useState<LoadedHoldings | null>(null);
  const router = useRouter();
  const { navigate } = router;
  const screen = router.location.screen;

  const refresh = useCallback(async () => {
    const record = await services.store.load();
    const account = record === null ? null : holderAccountId(record.userId);
    setPhase(phaseFor(record, account, Date.now()));
  }, [services]);

  useEffect(() => {
    refresh().catch(() => setPhase({ kind: "onboarding", failed: true }));
  }, [refresh]);

  // The holder's state decides where the app starts, and where setup leads.
  useEffect(() => {
    if (screen === "app.starting" && phase.kind === "onboarding") {
      navigate("app.starting", "holder.onboarding", {});
    } else if (screen === "app.starting" && phase.kind === "ready") {
      navigate("app.starting", "tickets.list", {});
    } else if (screen === "holder.onboarding" && phase.kind === "ready") {
      navigate("holder.onboarding", "tickets.list", {});
    }
  }, [screen, phase.kind, navigate]);

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
  const assurance = loaded !== null && loaded.source !== "none" ? loaded.entry.assurance : null;
  const reload = useCallback(async () => {
    if (account === null) return;
    setLoaded(await services.loadHoldings(account));
  }, [services, account]);

  useEffect(() => {
    reload().catch(() => setLoaded({ source: "none", error: null }));
  }, [reload]);

  const opened = useMemo(
    () => openedHolding(loaded, router.location.params.ticket),
    [loaded, router.location.params.ticket],
  );

  // A ticket that is no longer held, after a refresh, has no detail to show.
  useEffect(() => {
    if (screen === "ticket.detail" && loaded !== null && opened === null) {
      navigate("ticket.detail", "tickets.list", {});
    }
  }, [screen, loaded, opened, navigate]);

  return (
    <View style={styles.root} testID="saifu-root">
      {passkeysAvailable ? (
        <View collapsable={false} style={styles.marker} testID="passkey-bridge-linked" />
      ) : null}
      {screen === "holder.onboarding" ? (
        <Onboarding
          busy={phase.kind === "provisioning"}
          failed={phase.kind === "onboarding" && phase.failed}
          passkeysAvailable={passkeysAvailable}
          onSetUp={setUp}
        />
      ) : screen === "tickets.list" ? (
        <Holdings
          loaded={loaded}
          router={router}
          onRefresh={() => {
            reload().catch(() => {});
          }}
        />
      ) : screen === "ticket.detail" && opened !== null ? (
        <TicketDetail
          detail={
            opened.from === "ledger"
              ? ledgerTicketDetail(opened.holding, assurance)
              : ticketDetail(opened.holding, assurance)
          }
          router={router}
        />
      ) : screen === "settings.main" && account !== null ? (
        <Settings account={account} router={router} />
      ) : (
        <Starting />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 48 },
  marker: { width: 1, height: 1 },
});
