import { verify } from "@ticketto/profile-v0";
import type { Result, Ticketto } from "@ticketto/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { simulatedDevice } from "../../test/holder-device.ts";
import { memoryLedger } from "../../test/memory-ledger.ts";
import { holderCredential, restoreHolderCredential } from "./credential.ts";
import { registerHolderCredential } from "./register.ts";
import { memoryHolderStore } from "./store.ts";

const RP_ID = "kippu.example";

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

const connected = (ledger: Ticketto) => async (): Promise<Result<Ticketto>> => ({
  ok: true,
  value: ledger,
});

describe("T-030-19 restore from a synced passkey", () => {
  it("REQ-CP-6: a device with no record reads the passkey's user handle, and resumes the registered account without a new passkey", async () => {
    const { bridge } = simulatedDevice(RP_ID);
    const ledger = memoryLedger(RP_ID);
    const first = memoryHolderStore();
    const original = await holderCredential({ rpId: RP_ID, store: first });
    expect((await registerHolderCredential(ledger, original, first)).ok).toBe(true);

    // Site storage cleared: nothing on the device but the synced passkey.
    const store = memoryHolderStore();
    const restored = await restoreHolderCredential({
      rpId: RP_ID,
      store,
      ledger: connected(ledger),
    });
    if (!restored.ok) throw new Error(restored.failure);

    expect(bridge.creates).toHaveLength(1);
    expect(bridge.gets.at(-1)).toMatchObject({ rpId: RP_ID, allowCredentialIds: [] });
    expect(restored.credential.account).toBe(original.account);
    expect(await store.load()).toEqual({
      userHandle: original.record.userHandle,
      credentialIds: original.record.credentialIds,
      registration: original.record.registration,
      registered: true,
    });

    // The restored credential signs exactly as the original: same handle, same bytes.
    const payload = new TextEncoder().encode("after restore");
    const authorisation = await restored.credential.signer.sign(payload);
    expect(verify(original.registration, payload, authorisation, { rpId: RP_ID })).toBe(true);
  });

  it("refuses a passkey the ledger has no registration for, and keeps what the device holds", async () => {
    simulatedDevice(RP_ID);
    const ledger = memoryLedger(RP_ID);
    const store = memoryHolderStore();
    const unregistered = await holderCredential({ rpId: RP_ID, store });
    expect(
      await restoreHolderCredential({ rpId: RP_ID, store, ledger: connected(ledger) }),
    ).toEqual({ ok: false, failure: "not-registered" });
    expect(await store.load()).toEqual(unregistered.record);
  });

  it("reports a dismissed prompt, and an unreachable ledger", async () => {
    const { bridge } = simulatedDevice(RP_ID);
    const ledger = memoryLedger(RP_ID);
    const store = memoryHolderStore();
    const holder = await holderCredential({ rpId: RP_ID, store });
    await registerHolderCredential(ledger, holder, store);

    bridge.cancelNextGet = true;
    expect(
      await restoreHolderCredential({
        rpId: RP_ID,
        store: memoryHolderStore(),
        ledger: connected(ledger),
      }),
    ).toEqual({ ok: false, failure: "cancelled" });
    expect(
      await restoreHolderCredential({
        rpId: RP_ID,
        store: memoryHolderStore(),
        ledger: async () => ({ ok: false, error: { code: "ERR-LedgerUnavailable" } }),
      }),
    ).toEqual({ ok: false, failure: "unavailable" });
  });
});
