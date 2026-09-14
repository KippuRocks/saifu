// The holder services the app's screens use (T-030-03): the build's
// configuration (app.config.ts), the device's secure storage, and the ledger
// and Kippu clients over them.

import type { Result, Ticketto } from "@ticketto/sdk";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { type HolderCredential, holderCredential } from "../holder/credential.ts";
import { registerHolderCredential } from "../holder/register.ts";
import { type HolderStore, secureHolderStore } from "../holder/store.ts";
import { type KippuClient, kippuClient } from "../kippu/client.ts";
import { linkHolder } from "../kippu/link.ts";
import { connectLedger } from "../ledger/ticketto.ts";

export interface BuildConfig {
  readonly rpId: string;
  readonly ledgerUrl: string;
  readonly sponsorUrl: string;
  readonly kippuApiUrl: string;
}

export function buildConfig(): BuildConfig {
  const extra = Constants.expoConfig?.extra as
    | {
        passkey?: { rpId?: string };
        endpoints?: { ledgerUrl?: string; sponsorUrl?: string; kippuApiUrl?: string };
      }
    | undefined;
  const rpId = extra?.passkey?.rpId;
  const endpoints = extra?.endpoints;
  if (
    rpId === undefined ||
    endpoints?.ledgerUrl === undefined ||
    endpoints.sponsorUrl === undefined ||
    endpoints.kippuApiUrl === undefined
  ) {
    throw new Error("the build is missing its passkey or endpoint configuration (app.config.ts)");
  }
  return {
    rpId,
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
  /** Registers the credential on the ledger if needed, then links it to Kippu. */
  provisionAndLink(): Promise<Result<HolderCredential>>;
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
  return {
    config,
    store,
    credential,
    ledger,
    kippu,
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
  };
}
