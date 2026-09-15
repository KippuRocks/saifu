// The holder services the app's screens use (T-030-03): the build's
// configuration (app.config.ts), the device's secure storage, and the ledger
// and Kippu clients over them.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Result, Ticketto } from "@ticketto/sdk";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { type HandoffOutcome, linkCheckoutHandoff } from "../handoff/checkout.ts";
import { type InvitationOutcome, redeemInvitation } from "../handoff/invitation.ts";
import { type HolderCredential, holderCredential } from "../holder/credential.ts";
import { registerHolderCredential } from "../holder/register.ts";
import { type HolderStore, secureHolderStore } from "../holder/store.ts";
import { type HoldingsCache, holdingsCache } from "../holdings/cache.ts";
import { type LoadedHoldings, loadHoldings } from "../holdings/load.ts";
import { type KippuClient, kippuClient } from "../kippu/client.ts";
import { linkHolder } from "../kippu/link.ts";
import { connectLedger } from "../ledger/ticketto.ts";
import { exchangedAccounts } from "../transfer/exchanged.ts";
import { checkReceiver, type ReceiverCheck } from "../transfer/receiver.ts";
import {
  type TransferFlow,
  type TransferRequest,
  type TransferStep,
  transferFlow,
} from "../transfer/transfer.ts";

export interface BuildConfig {
  readonly rpId: string;
  /** The https origin of links into Saifu (src/links/links.ts). */
  readonly linkBase: string;
  readonly ledgerUrl: string;
  readonly sponsorUrl: string;
  readonly kippuApiUrl: string;
}

export function buildConfig(): BuildConfig {
  const extra = Constants.expoConfig?.extra as
    | {
        passkey?: { rpId?: string };
        endpoints?: { ledgerUrl?: string; sponsorUrl?: string; kippuApiUrl?: string };
        links?: { linkBase?: string };
      }
    | undefined;
  const rpId = extra?.passkey?.rpId;
  const endpoints = extra?.endpoints;
  const linkBase = extra?.links?.linkBase;
  if (
    rpId === undefined ||
    linkBase === undefined ||
    endpoints?.ledgerUrl === undefined ||
    endpoints.sponsorUrl === undefined ||
    endpoints.kippuApiUrl === undefined
  ) {
    throw new Error("the build is missing its passkey or endpoint configuration (app.config.ts)");
  }
  return {
    rpId,
    linkBase,
    ledgerUrl: endpoints.ledgerUrl,
    sponsorUrl: endpoints.sponsorUrl,
    kippuApiUrl: endpoints.kippuApiUrl,
  };
}

export interface HolderServices {
  readonly config: BuildConfig;
  readonly store: HolderStore;
  /** Loads the holder credential, provisioning a passkey on first use. */
  credential(): Promise<HolderCredential>;
  ledger(): Promise<Result<Ticketto>>;
  kippu(): Promise<KippuClient>;
  readonly holdings: HoldingsCache;
  /** The linked holder's tickets: Kippu's copy, else the device cache. */
  loadHoldings(account: string): Promise<LoadedHoldings>;
  /** Registers the credential on the ledger if needed, then links it to Kippu. */
  provisionAndLink(): Promise<Result<HolderCredential>>;
  /** Forgets a Kippu session kippu-api no longer accepts, so setup links again. */
  endSession(): Promise<void>;
  /** Links the holder's account to an Ichiba checkout, and gets the pairing code. */
  linkCheckout(handoffToken: string): Promise<HandoffOutcome>;
  /** Checks who would receive a ticket: a scanned code or a typed account. */
  checkReceiver(input: string, holder: string): Promise<ReceiverCheck>;
  /**
   * A transfer of a held ticket: signed with the passkey, sponsored through the
   * relay, submitted directly to the ledger, then Kippu's copy awaited.
   * `seenCursor` is the copy's cursor when the holdings were read.
   */
  transfer(
    request: TransferRequest,
    holder: string,
    seenCursor: string | undefined,
    onStep: (step: TransferStep) => void,
  ): Promise<TransferFlow | { readonly failed: string }>;
  /** Redeems an invitation for the holder, and waits for Kippu's copy to show the ticket. */
  redeemInvitation(token: string): Promise<InvitationOutcome>;
}

export function holderServices(config: BuildConfig = buildConfig()): HolderServices {
  const store = secureHolderStore(SecureStore);
  const credential = () => holderCredential({ rpId: config.rpId, store });
  const ledger = () =>
    connectLedger({
      ledgerUrl: config.ledgerUrl,
      sponsorUrl: config.sponsorUrl,
      rpId: config.rpId,
    });
  const kippu = async () => {
    const record = await store.load();
    return kippuClient({ url: config.kippuApiUrl, token: () => record?.kippuSession?.token });
  };
  const cache = holdingsCache(AsyncStorage);
  return {
    config,
    store,
    credential,
    ledger,
    kippu,
    holdings: cache,
    async loadHoldings(account) {
      const [client, connected] = await Promise.all([kippu(), ledger().catch(() => null)]);
      return loadHoldings({
        kippu: client,
        cache,
        account,
        assurance: connected?.ok ? connected.value.assurance() : null,
        ledger: connected?.ok ? connected.value : null,
      });
    },
    async provisionAndLink() {
      const holder = await credential();
      const connected = await ledger();
      if (!connected.ok) return connected;
      const registered = await registerHolderCredential(connected.value, holder, store);
      if (!registered.ok) return registered;
      const record = await store.load();
      const session = record?.kippuSession;
      if (session === undefined || session.expiresAt <= Date.now()) {
        await linkHolder(kippuClient({ url: config.kippuApiUrl }), holder, store);
      }
      return { ok: true, value: holder };
    },
    async endSession() {
      const record = await store.load();
      if (record === null) return;
      const { kippuSession: _, ...rest } = record;
      await store.save(rest);
    },
    async checkReceiver(input, holder) {
      const connected = await ledger().catch(() => null);
      return checkReceiver(input, holder, connected?.ok ? connected.value : null);
    },
    async transfer(request, holder, seenCursor, onStep) {
      const connected = await connectLedger({
        ledgerUrl: config.ledgerUrl,
        sponsorUrl: config.sponsorUrl,
        rpId: config.rpId,
        receiptCursor: () => (seenCursor === "" ? undefined : seenCursor),
      }).catch(() => null);
      if (connected === null || !connected.ok) return { failed: "ERR-LedgerUnavailable" };
      const [signer, client] = await Promise.all([credential(), kippu()]);
      return transferFlow(request, {
        ledger: connected.value,
        signer: signer.signer,
        exchanged: exchangedAccounts(AsyncStorage, holder),
        copy: {
          async waitFor(cursor) {
            for (let i = 0; i < 3; i++) {
              if ((await client.derived.waitFor.query({ cursor, timeout: 10_000 })).reached)
                return true;
            }
            return false;
          },
        },
        onStep,
      });
    },
    async linkCheckout(handoffToken) {
      return linkCheckoutHandoff(await kippu(), handoffToken);
    },
    async redeemInvitation(token) {
      return redeemInvitation(await kippu(), token);
    },
  };
}
