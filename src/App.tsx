import { holderAccountFromHashedUserId } from "@ticketto/profile-v0";
import type { AccountId } from "@ticketto/sdk";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type HolderPhase, phaseFor } from "./app/holder-state.ts";
import { holderServices } from "./app/services.ts";
import { PENDING_LINK_COPY } from "./copy/links.ts";
import type { AddDeviceFlow, AddDeviceStep } from "./devices/add.ts";
import type { RestoreOutcome } from "./holder/credential.ts";
import { fromHex } from "./holder/credential.ts";
import { ledgerTicketDetail } from "./holdings/degraded.ts";
import { ticketDetail } from "./holdings/detail.ts";
import type { LoadedHoldings } from "./holdings/load.ts";
import type { SaifuLink } from "./links/links.ts";
import { produceTicketPass } from "./passes/produce.ts";
import { passWindowFor } from "./passes/window.ts";
import { passkeysAvailable } from "./passkey/install";
import { onReconnect } from "./platform/network";
import { CheckoutLink } from "./screens/CheckoutLink.tsx";
import { DeviceAdd } from "./screens/DeviceAdd.tsx";
import { DeviceAddConfirm } from "./screens/DeviceAddConfirm.tsx";
import { DeviceJoin } from "./screens/DeviceJoin.tsx";
import { useIncomingLinks } from "./screens/deep-links";
import { Holdings, type OpenedHolding } from "./screens/Holdings.tsx";
import { InvitationRedeem } from "./screens/InvitationRedeem.tsx";
import { Onboarding } from "./screens/Onboarding.tsx";
import { Receive } from "./screens/Receive.tsx";
import { useRouter } from "./screens/router.ts";
import { Settings } from "./screens/Settings.tsx";
import { Starting } from "./screens/Starting.tsx";
import { TicketDetail } from "./screens/TicketDetail.tsx";
import { TicketPass } from "./screens/TicketPass.tsx";
import { TicketTransfer } from "./screens/TicketTransfer.tsx";
import { TransferSending } from "./screens/TransferSending.tsx";
import { TransferWarning } from "./screens/TransferWarning.tsx";
import type { TransferFlow, TransferStep } from "./transfer/transfer.ts";

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

  const [userHandle, setUserHandle] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const record = await services.store.load();
    setUserHandle(record?.userHandle ?? null);
    const account =
      record === null ? null : holderAccountFromHashedUserId(fromHex(record.userHandle));
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
    } else if (screen === "device.join" && phase.kind === "ready") {
      navigate("device.join", "tickets.list", {});
    }
  }, [screen, phase.kind, pending, navigate]);

  const sessionEnded = useCallback(() => {
    setPhase({ kind: "onboarding", failed: false });
    services.endSession().catch(() => {});
  }, [services]);

  const setUp = useCallback(async () => {
    // A phone joining another's account is set up by that phone, not by itself.
    if ((await services.joiningDevice().catch(() => null)) !== null) {
      navigate("holder.onboarding", "device.join", {});
      return;
    }
    setPhase({ kind: "provisioning" });
    try {
      const done = await services.provisionAndLink();
      if (!done.ok) throw new Error(done.error.code);
      await refresh();
    } catch {
      setPhase({ kind: "onboarding", failed: true });
    }
  }, [services, refresh, navigate]);

  // Adding a device from this phone (T-030-13).
  const [adding, setAdding] = useState<{
    readonly flow: AddDeviceFlow | null;
    readonly step: AddDeviceStep | null;
  }>({ flow: null, step: null });

  const joinDevice = useCallback((id: string) => services.joinDevice(id), [services]);
  const resumeJoin = useCallback(() => services.joiningDevice(), [services]);
  const waitForJoin = useCallback(
    (cancelled: () => boolean) => services.waitForJoin(cancelled),
    [services],
  );
  const loadDevices = useCallback(() => services.listDevices(), [services]);

  const joined = useCallback(async () => {
    const done = await services.provisionAndLink().catch(() => null);
    if (done?.ok) await refresh();
    else navigate("device.join", "holder.onboarding", {});
  }, [services, refresh, navigate]);

  // Restoring from a synced passkey (T-030-19): why the last attempt failed.
  const [restoreFailure, setRestoreFailure] = useState<
    Exclude<RestoreOutcome, { ok: true }>["failure"] | null
  >(null);
  const restore = useCallback(async () => {
    setPhase({ kind: "provisioning" });
    setRestoreFailure(null);
    const restored = await services
      .restore()
      .catch((): RestoreOutcome => ({ ok: false, failure: "unavailable" }));
    if (!restored.ok) setRestoreFailure(restored.failure);
    await refresh().catch(() => setPhase({ kind: "onboarding", failed: false }));
  }, [services, refresh]);

  const account = phase.kind === "ready" ? phase.account : null;
  const assurance = loaded !== null && loaded.source !== "none" ? loaded.entry.assurance : null;
  // Only the latest load may update what is shown: a slow ledger read of an
  // earlier one never replaces a newer answer.
  const loads = useRef(0);
  const reload = useCallback(async () => {
    if (account === null) return;
    const load = ++loads.current;
    const current = (next: LoadedHoldings) => {
      if (load === loads.current) setLoaded(next);
    };
    current(await services.loadHoldings(account, current));
  }, [services, account]);
  const linkCheckout = useCallback((token: string) => services.linkCheckout(token), [services]);
  const redeem = useCallback((token: string) => services.redeemInvitation(token), [services]);

  useEffect(() => {
    reload().catch(() => setLoaded({ source: "none", error: null }));
  }, [reload]);

  // Back online: read Kippu's copy again.
  useEffect(
    () =>
      onReconnect(() => {
        reload().catch(() => {});
      }),
    [reload],
  );

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
  // Its window is the event's, as last read, or the default (T-030-17).
  const producePass = useCallback(
    async (ticket: string) =>
      produceTicketPass(ticket, (await services.credential()).signer, {
        window: passWindowFor(loaded, ticket),
      }),
    [services, loaded],
  );

  // A transfer (T-030-08): the flow outlives the screens it passes through.
  const [transfer, setTransfer] = useState<{
    readonly flow: TransferFlow | null;
    readonly step: TransferStep | null;
  }>({ flow: null, step: null });

  const beginTransfer = useCallback(
    async (receiver: AccountId) => {
      if (detail === null || account === null) return;
      const ticket = detail.id;
      const seen =
        loaded !== null && loaded.source !== "none"
          ? loaded.entry.read.freshness.cursor
          : undefined;
      setTransfer({ flow: null, step: null });
      const flow = await services.transfer(
        { ticket, event: detail.eventId, receiver },
        account,
        seen,
        (step) => {
          if (step.kind === "done") {
            // The copy has caught up: refresh the holdings before saying it is done.
            reload()
              .catch(() => {})
              .then(() => setTransfer((current) => ({ ...current, step })));
            return;
          }
          setTransfer((current) => ({ ...current, step }));
          if (step.kind === "warning") {
            navigate("ticket.transfer", "ticket.transfer.warning", { ticket, receiver });
          } else if (step.kind === "signing") {
            navigate("ticket.transfer", "ticket.transfer.sending", { ticket, receiver });
          }
        },
      );
      if ("failed" in flow) {
        setTransfer({ flow: null, step: { kind: "failed", code: flow.failed } });
        navigate("ticket.transfer", "ticket.transfer.sending", { ticket, receiver });
        return;
      }
      setTransfer((current) => ({ ...current, flow }));
      await flow.begin();
    },
    [detail, account, loaded, services, navigate, reload],
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
          onRestore={restore}
          onSetUp={setUp}
          router={router}
          restoreFailure={restoreFailure}
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
      ) : screen === "ticket.transfer" &&
        detail !== null &&
        detail.transferable &&
        account !== null ? (
        <TicketTransfer
          check={(input) => services.checkReceiver(input, account)}
          onReceiver={(receiver) => {
            beginTransfer(receiver).catch(() => {});
          }}
          router={router}
          ticket={detail.id}
          title={detail.title}
        />
      ) : screen === "ticket.transfer.warning" && router.location.params.receiver !== undefined ? (
        <TransferWarning
          onCancel={() =>
            navigate("ticket.transfer.warning", "ticket.detail", {
              ticket: router.location.params.ticket as string,
            })
          }
          onConfirm={() => {
            navigate("ticket.transfer.warning", "ticket.transfer.sending", {
              ticket: router.location.params.ticket as string,
              receiver: router.location.params.receiver as string,
            });
            transfer.flow?.confirm().catch(() => {});
          }}
          receiver={router.location.params.receiver}
        />
      ) : screen === "ticket.transfer.sending" ? (
        <TransferSending
          onFailed={() =>
            navigate("ticket.transfer.sending", "ticket.detail", {
              ticket: router.location.params.ticket as string,
            })
          }
          onFinish={() => navigate("ticket.transfer.sending", "tickets.list", {})}
          step={transfer.step}
        />
      ) : screen === "tickets.receive" && account !== null ? (
        <Receive account={account} router={router} />
      ) : screen === "settings.main" && account !== null ? (
        <Settings account={account} loadDevices={loadDevices} router={router} />
      ) : screen === "device.add" && account !== null && userHandle !== null ? (
        <DeviceAdd
          onRegistration={(registration) => {
            setAdding({ flow: null, step: null });
            navigate("device.add", "device.add.confirm", {});
            services
              .addDevice(account, registration, (step) =>
                setAdding((current) => ({ ...current, step })),
              )
              .then((flow) => {
                if ("failed" in flow) {
                  setAdding({ flow: null, step: { kind: "failed", code: flow.failed } });
                  return;
                }
                setAdding((current) => ({ ...current, flow }));
                return flow.begin();
              })
              .catch(() =>
                setAdding({ flow: null, step: { kind: "failed", code: "ERR-LedgerUnavailable" } }),
              );
          }}
          parse={(text) => services.parseDeviceRegistration(text, account)}
          router={router}
          userHandle={userHandle}
        />
      ) : screen === "device.add.confirm" ? (
        <DeviceAddConfirm
          onClose={() => navigate("device.add.confirm", "settings.main", {})}
          onConfirm={() => {
            adding.flow?.confirm().catch(() => {});
          }}
          step={adding.step}
        />
      ) : screen === "device.join" ? (
        <DeviceJoin
          join={joinDevice}
          onJoined={() => {
            joined().catch(() => {});
          }}
          resume={resumeJoin}
          router={router}
          waitForRegistration={waitForJoin}
        />
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
