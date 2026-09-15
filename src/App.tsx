import { holderAccountId } from "@ticketto/profile-v0";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type HolderPhase, phaseFor } from "./app/holder-state.ts";
import { holderServices } from "./app/services.ts";
import { PENDING_LINK_COPY } from "./copy/links.ts";
import { ledgerTicketDetail } from "./holdings/degraded.ts";
import { ticketDetail } from "./holdings/detail.ts";
import type { LoadedHoldings } from "./holdings/load.ts";
import type { SaifuLink } from "./links/links.ts";
import { produceTicketPass } from "./passes/produce.ts";
import { passkeysAvailable } from "./passkey/install.ts";
import { CheckoutLink } from "./screens/CheckoutLink.tsx";
import { useIncomingLinks } from "./screens/deep-links.ts";
import { Holdings, type OpenedHolding } from "./screens/Holdings.tsx";
import { InvitationRedeem } from "./screens/InvitationRedeem.tsx";
import { Onboarding } from "./screens/Onboarding.tsx";
import { useRouter } from "./screens/router.ts";
import { Settings } from "./screens/Settings.tsx";
import { Starting } from "./screens/Starting.tsx";
import { TicketDetail } from "./screens/TicketDetail.tsx";
import { TicketPass } from "./screens/TicketPass.tsx";

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
  const { navigate, enter } = router;
  const screen = router.location.screen;
  const incoming = useIncomingLinks({ linkBase: services.config.linkBase, scheme: "saifu" });
  /** A link into Saifu that waits for the holder to be set up. */
  const [pending, setPending] = useState<SaifuLink | null>(null);

  const refresh = useCallback(async () => {
    const record = await services.store.load();
    const account = record === null ? null : holderAccountId(record.userId);
    setPhase(phaseFor(record, account, Date.now()));
  }, [services]);

  useEffect(() => {
    refresh().catch(() => setPhase({ kind: "onboarding", failed: true }));
  }, [refresh]);

  // A link into Saifu enters its screen once the holder is set up and linked;
  // until then it waits, and setup continues to it.
  useEffect(() => {
    if (incoming !== null) setPending(incoming.link);
  }, [incoming]);

  useEffect(() => {
    if (pending === null || phase.kind === "loading") return;
    if (phase.kind !== "ready") return;
    if (screen === "holder.onboarding") {
      if (pending.kind === "checkout") {
        navigate("holder.onboarding", "checkout.link", { handoffToken: pending.handoffToken });
      } else {
        navigate("holder.onboarding", "invitation.redeem", { token: pending.token });
      }
    } else if (pending.kind === "checkout") {
      enter("checkout.link", { handoffToken: pending.handoffToken });
    } else {
      enter("invitation.redeem", { token: pending.token });
    }
    setPending(null);
  }, [pending, phase.kind, screen, navigate, enter]);

  // The holder's state decides where the app starts, and where setup leads.
  useEffect(() => {
    if (screen === "app.starting" && phase.kind === "onboarding") {
      navigate("app.starting", "holder.onboarding", {});
    } else if (screen === "app.starting" && phase.kind === "ready" && pending === null) {
      navigate("app.starting", "tickets.list", {});
    } else if (screen === "holder.onboarding" && phase.kind === "ready" && pending === null) {
      navigate("holder.onboarding", "tickets.list", {});
    }
  }, [screen, phase.kind, pending, navigate]);

  const sessionEnded = useCallback(() => {
    setPhase({ kind: "onboarding", failed: false });
    services.endSession().catch(() => {});
  }, [services]);

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
  const linkCheckout = useCallback((token: string) => services.linkCheckout(token), [services]);
  const redeem = useCallback((token: string) => services.redeemInvitation(token), [services]);

  useEffect(() => {
    reload().catch(() => setLoaded({ source: "none", error: null }));
  }, [reload]);

  const opened = useMemo(
    () => openedHolding(loaded, router.location.params.ticket),
    [loaded, router.location.params.ticket],
  );

  const detail = useMemo(
    () =>
      opened === null
        ? null
        : opened.from === "ledger"
          ? ledgerTicketDetail(opened.holding, assurance)
          : ticketDetail(opened.holding, assurance),
    [opened, assurance],
  );

  // A pass is produced on the device from the stored credential: no network (NFR-3).
  const producePass = useCallback(
    async (ticket: string) => produceTicketPass(ticket, (await services.credential()).signer),
    [services],
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
          pendingNotice={pending === null ? null : PENDING_LINK_COPY[pending.kind]}
        />
      ) : screen === "checkout.link" && router.location.params.handoffToken !== undefined ? (
        <CheckoutLink
          handoffToken={router.location.params.handoffToken}
          link={linkCheckout}
          onSessionEnded={() => {
            setPending({
              kind: "checkout",
              handoffToken: router.location.params.handoffToken as string,
            });
            sessionEnded();
            navigate("checkout.link", "holder.onboarding", {});
          }}
          router={router}
        />
      ) : screen === "invitation.redeem" && router.location.params.token !== undefined ? (
        <InvitationRedeem
          onSessionEnded={() => {
            setPending({ kind: "invitation", token: router.location.params.token as string });
            sessionEnded();
            navigate("invitation.redeem", "holder.onboarding", {});
          }}
          redeem={redeem}
          reloadHoldings={reload}
          router={router}
          token={router.location.params.token}
        />
      ) : screen === "tickets.list" ? (
        <Holdings
          loaded={loaded}
          router={router}
          onRefresh={() => {
            reload().catch(() => {});
          }}
        />
      ) : screen === "ticket.detail" && detail !== null ? (
        <TicketDetail detail={detail} router={router} />
      ) : screen === "ticket.pass" && detail !== null ? (
        <TicketPass
          assurance={detail.assurance}
          produce={producePass}
          router={router}
          ticket={detail.id}
          title={detail.title}
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
