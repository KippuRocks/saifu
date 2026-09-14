import { registrationAccount } from "@ticketto/profile-v0";
import type { Signer } from "@ticketto/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { simulatedDevice } from "../../test/holder-device.ts";
import { memoryLedger } from "../../test/memory-ledger.ts";
import { holderCredential, toHex } from "./credential.ts";
import { registerHolderCredential } from "./register.ts";
import { memoryHolderStore } from "./store.ts";

const RP_ID = "kippu.example";

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

describe("T-030-03 register_credential", () => {
  it("registers the passkey on the ledger, signed by the credential it registers", async () => {
    const { bridge } = simulatedDevice(RP_ID);
    const ledger = memoryLedger(RP_ID);
    const store = memoryHolderStore();
    const holder = await holderCredential({ rpId: RP_ID, store });

    const registered = await registerHolderCredential(ledger, holder, store);
    expect(registered.ok).toBe(true);
    expect(bridge.gets).toHaveLength(1);
    expect((await store.load())?.registered).toBe(true);

    const named = registrationAccount(holder.registration);
    if (!named.ok) throw new Error("registration does not name an account");
    const onLedger = await ledger.getCredential(holder.account, named.value.credential);
    expect(onLedger.ok && onLedger.value !== null && toHex(onLedger.value)).toBe(
      toHex(holder.registration),
    );
  });

  it("does not register again once the ledger has accepted it", async () => {
    const { bridge } = simulatedDevice(RP_ID);
    const ledger = memoryLedger(RP_ID);
    const store = memoryHolderStore();
    const holder = await holderCredential({ rpId: RP_ID, store });
    await registerHolderCredential(ledger, holder, store);
    const again = await registerHolderCredential(ledger, holder, store);
    expect(again).toEqual({ ok: true, value: null });
    expect(bridge.gets).toHaveLength(1);
  });

  it("retries an interrupted registration with the same passkey", async () => {
    simulatedDevice(RP_ID);
    const ledger = memoryLedger(RP_ID);
    const store = memoryHolderStore();
    const holder = await holderCredential({ rpId: RP_ID, store });
    expect((await registerHolderCredential(ledger, holder, store)).ok).toBe(true);
    // The device lost the acknowledgement: the ledger accepts the same credential again.
    await store.save({ ...holder.record, registered: false });
    const reloaded = await holderCredential({ rpId: RP_ID, store });
    expect((await registerHolderCredential(ledger, reloaded, store)).ok).toBe(true);
  });

  it("ERR-InvalidAuthorisation: another account's credential cannot register this one", async () => {
    simulatedDevice(RP_ID);
    const ledger = memoryLedger(RP_ID);
    const holder = await holderCredential({ rpId: RP_ID, store: memoryHolderStore() });
    simulatedDevice(RP_ID);
    const other = await holderCredential({ rpId: RP_ID, store: memoryHolderStore() });
    const impostor: Signer = { account: holder.account, sign: other.signer.sign };

    const refused = await ledger.registerCredential(impostor, {
      account: holder.account,
      registration: holder.registration,
    });
    expect(refused.ok).toBe(false);
    expect(!refused.ok && refused.error.code).toBe("ERR-InvalidAuthorisation");
  });
});
