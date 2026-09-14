// The system stack the system tests run against, and the steps of it that are
// not Saifu's: an organiser who signs in to kippu-api and issues a ticket.

import { holderCredential } from "../../src/holder/credential.ts";
import { registerHolderCredential } from "../../src/holder/register.ts";
import { type HolderStore, memoryHolderStore } from "../../src/holder/store.ts";
import { kippuClient } from "../../src/kippu/client.ts";
import { linkHolder } from "../../src/kippu/link.ts";
import { connectLedger } from "../../src/ledger/ticketto.ts";
import { simulatedDevice } from "../holder-device.ts";
import { SoftwareAuthenticator } from "./organiser-authenticator.ts";

const env = process.env;

export const stack = {
  ledgerUrl: env.SAIFU_TEST_LEDGER_URL,
  sponsorUrl: env.SAIFU_TEST_SPONSOR_URL,
  kippuUrl: env.SAIFU_TEST_KIPPU_API_URL,
  rpId: env.SAIFU_TEST_RP_ID ?? "kippu.example",
  organiserOrigin: env.SAIFU_TEST_ORGANISER_ORIGIN ?? "http://localhost:5173",
};

export const stackAvailable =
  stack.ledgerUrl !== undefined && stack.sponsorUrl !== undefined && stack.kippuUrl !== undefined;

export function ledger() {
  return connectLedger({
    ledgerUrl: stack.ledgerUrl as string,
    sponsorUrl: stack.sponsorUrl as string,
    rpId: stack.rpId,
  });
}

/** A holder set up the way Saifu sets one up: provisioned, registered and linked. */
export async function linkedHolder(store: HolderStore = memoryHolderStore()) {
  simulatedDevice(stack.rpId);
  const holder = await holderCredential({ rpId: stack.rpId, store });
  const connected = await ledger();
  if (!connected.ok) throw new Error(`ledger: ${connected.error.code}`);
  const registered = await registerHolderCredential(connected.value, holder, store);
  if (!registered.ok) throw new Error(`registration: ${registered.error.code}`);
  const session = await linkHolder(kippuClient({ url: stack.kippuUrl as string }), holder, store);
  return {
    holder,
    store,
    ledger: connected.value,
    kippu: kippuClient({ url: stack.kippuUrl as string, token: () => session.token }),
  };
}

/** An organiser signed in to kippu-api, as Ibento signs one in. */
export async function organiser() {
  const anonymous = kippuClient({ url: stack.kippuUrl as string });
  const email = `organiser-${crypto.randomUUID()}@organiser.example`;
  const passkey = new SoftwareAuthenticator({ origin: stack.organiserOrigin });
  const signUp = await anonymous.auth.organiser.beginSignUp.mutate({ email });
  const { session } = await anonymous.auth.organiser.completeSignUp.mutate({
    ceremonyId: signUp.ceremonyId,
    credential: passkey.create(signUp.options),
  });
  return kippuClient({ url: stack.kippuUrl as string, token: () => session.token });
}

export const randomId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};
