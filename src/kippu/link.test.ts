import type { Signer } from "@ticketto/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { simulatedDevice } from "../../test/holder-device.ts";
import { LinkRefused, linkVerifier } from "../../test/kippu-link-verifier.ts";
import { memoryLedger } from "../../test/memory-ledger.ts";
import { holderCredential } from "../holder/credential.ts";
import { registerHolderCredential } from "../holder/register.ts";
import { memoryHolderStore } from "../holder/store.ts";
import { linkHolder } from "./link.ts";

const RP_ID = "kippu.example";

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

async function registeredHolder(ledger: ReturnType<typeof memoryLedger>) {
  simulatedDevice(RP_ID);
  const store = memoryHolderStore();
  const holder = await holderCredential({ rpId: RP_ID, store });
  const registered = await registerHolderCredential(ledger, holder, store);
  if (!registered.ok) throw new Error(registered.error.code);
  return { holder: await holderCredential({ rpId: RP_ID, store }), store };
}

describe("T-030-03 Kippu account linking", () => {
  it("a signed proof-of-control challenge links the account, and the session is kept", async () => {
    const ledger = memoryLedger(RP_ID);
    const { holder, store } = await registeredHolder(ledger);
    const kippu = linkVerifier(ledger, RP_ID);

    const session = await linkHolder(kippu.api, holder, store);

    expect(kippu.linked).toEqual([holder.account]);
    expect((await store.load())?.kippuSession).toEqual(session);
  });

  it("linking fails with another account's credential", async () => {
    const ledger = memoryLedger(RP_ID);
    const { holder, store } = await registeredHolder(ledger);
    const { holder: other } = await registeredHolder(ledger);
    const kippu = linkVerifier(ledger, RP_ID);
    // The other holder's passkey answers a challenge naming this holder's account.
    const impostor = {
      ...holder,
      signer: { account: holder.account, sign: other.signer.sign } satisfies Signer,
    };

    await expect(linkHolder(kippu.api, impostor, store)).rejects.toThrow(LinkRefused);
    expect(kippu.linked).toEqual([]);
    expect((await store.load())?.kippuSession).toBeUndefined();
  });

  it("linking fails before the credential is on the ledger", async () => {
    const ledger = memoryLedger(RP_ID);
    simulatedDevice(RP_ID);
    const store = memoryHolderStore();
    const holder = await holderCredential({ rpId: RP_ID, store });
    await expect(linkHolder(linkVerifier(ledger, RP_ID).api, holder, store)).rejects.toThrow(
      /unregistered/,
    );
  });
});
