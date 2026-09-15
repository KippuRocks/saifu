import { registrationAccount, verifyPass } from "@ticketto/profile-v0";
import type { AccountId, Signer } from "@ticketto/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { simulatedDevice } from "../../test/holder-device.ts";
import { grantTicket, memoryLedger } from "../../test/memory-ledger.ts";
import { holderCredential } from "../holder/credential.ts";
import { registerHolderCredential, waitForJoinedRegistration } from "../holder/register.ts";
import { memoryHolderStore } from "../holder/store.ts";
import { produceTicketPass } from "../passes/produce.ts";
import { type AddDeviceStep, addDeviceFlow } from "./add.ts";
import {
  addDeviceCode,
  deviceRegistrationCode,
  registrationFromDeviceCode,
  shortCode,
  userIdFromAddDeviceCode,
} from "./codes.ts";

const RP_ID = "kippu.example";

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

/** A signer that uses `device` for its ceremonies, whichever device was set up last. */
const on = (device: { install: () => void }, signer: Signer): Signer => ({
  account: signer.account,
  sign: async (payload) => {
    device.install();
    return signer.sign(payload);
  },
});

async function existingPhone(ledger: ReturnType<typeof memoryLedger>) {
  const device = simulatedDevice(RP_ID);
  const store = memoryHolderStore();
  const holder = await holderCredential({ rpId: RP_ID, store });
  const registered = await registerHolderCredential(ledger, holder, store);
  if (!registered.ok) throw new Error(registered.error.code);
  return { device, store, holder, signer: on(device, holder.signer) };
}

describe("T-030-13 adding a second device", () => {
  it("REQ-CP-6: a second device registers, authorised by the first, and can produce passes; losing the first loses no ticket", async () => {
    const ledger = memoryLedger(RP_ID);
    const a = await existingPhone(ledger);
    const { ticket, event } = await grantTicket(ledger, a.holder.account, {
      cannotResale: false,
      cannotTransfer: false,
    });

    // 1. The existing phone shows its user id; the new phone scans it and creates its passkey.
    const scanned = userIdFromAddDeviceCode(addDeviceCode(a.holder.record.userId));
    if (scanned === null) throw new Error("the add-device code did not scan");
    const bDevice = simulatedDevice(RP_ID);
    const bStore = memoryHolderStore();
    const b = await holderCredential({ rpId: RP_ID, store: bStore, joinUserId: scanned });
    expect(b.account).toBe(a.holder.account);
    expect(b.record.joining).toBe(true);
    await expect(registerHolderCredential(ledger, b, bStore)).rejects.toThrow(/other device/);

    // 2. The new phone shows its registration and short code; 3. the existing phone scans it.
    const registration = registrationFromDeviceCode(
      deviceRegistrationCode(b.registration),
      a.holder.account,
    );
    if (registration === null) throw new Error("the registration code did not scan");
    const steps: AddDeviceStep[] = [];
    let signatures = 0;
    const flow = addDeviceFlow(a.holder.account as AccountId, registration, {
      ledger,
      signer: {
        account: a.signer.account,
        sign: async (payload) => {
          signatures++;
          return a.signer.sign(payload);
        },
      },
      onStep: (step) => steps.push(step),
    });
    await flow.begin();
    // The confirmation, with the same short code the new phone shows, before anything is signed.
    expect(steps).toEqual([{ kind: "confirm", shortCode: shortCode(b.registration) }]);
    expect(signatures).toBe(0);

    // 4. Confirmed: the existing phone signs registerCredential; the new phone waits for it.
    await flow.confirm();
    expect(signatures).toBe(1);
    expect(steps.at(-1)?.kind).toBe("done");
    expect(await waitForJoinedRegistration(ledger, b, bStore, { attempts: 1 })).toBe(true);
    expect(await bStore.load()).toMatchObject({ registered: true });
    expect((await bStore.load())?.joining).toBeUndefined();

    // The new phone produces a pass the profile verifies against its own registration.
    const bSigner = on(bDevice, b.signer);
    const pass = await produceTicketPass(ticket, bSigner);
    const named = registrationAccount(b.registration);
    if (!named.ok) throw new Error("no account");
    const onLedger = await ledger.getCredential(b.account, named.value.credential);
    if (!onLedger.ok || onLedger.value === null) throw new Error("not on the ledger");
    expect(verifyPass(pass.signed, onLedger.value, { now: Date.now }, { rpId: RP_ID }).ok).toBe(
      true,
    );

    // DEF-7: without the first phone, the new one still controls the tickets.
    const moved = await ledger.transferTicket(bSigner, {
      event: event as never,
      ticket: ticket as never,
      receiver: "d4".repeat(32) as AccountId,
    });
    expect(moved.ok).toBe(true);
  });

  it("refuses a registration for another account, and one already registered", async () => {
    const ledger = memoryLedger(RP_ID);
    const a = await existingPhone(ledger);
    const other = await existingPhone(ledger);
    expect(
      registrationFromDeviceCode(
        deviceRegistrationCode(other.holder.registration),
        a.holder.account,
      ),
    ).toBeNull();

    const steps: AddDeviceStep[] = [];
    const flow = addDeviceFlow(a.holder.account as AccountId, a.holder.registration, {
      ledger,
      signer: a.signer,
      onStep: (step) => steps.push(step),
    });
    await flow.begin();
    expect(steps).toEqual([{ kind: "failed", code: "already-registered" }]);
    await flow.confirm();
    expect(steps).toHaveLength(1);
  });

  it("scans only codes of the right kind", () => {
    const userId = "ab".repeat(32);
    expect(userIdFromAddDeviceCode(`saifu:add-device:${userId}`)).toBe(userId);
    for (const text of [
      userId,
      `ticketto:account:${userId}`,
      `saifu:add-device:${userId.slice(1)}`,
      "saifu:device-registration:AAAA",
    ]) {
      expect(userIdFromAddDeviceCode(text), text).toBeNull();
    }
    expect(
      registrationFromDeviceCode("saifu:device-registration:!!!", userId as AccountId),
    ).toBeNull();
    expect(
      registrationFromDeviceCode(`saifu:add-device:${userId}`, userId as AccountId),
    ).toBeNull();
  });

  it("derives the six-digit short code from a domain-tagged BLAKE2b-256", () => {
    const code = shortCode(new Uint8Array([1, 2, 3]));
    expect(code).toMatch(/^\d{6}$/);
    expect(shortCode(new Uint8Array([1, 2, 3]))).toBe(code);
    expect(shortCode(new Uint8Array([1, 2, 4]))).not.toBe(code);
  });

  it("stops waiting when the registration never comes", async () => {
    const ledger = memoryLedger(RP_ID);
    const a = await existingPhone(ledger);
    simulatedDevice(RP_ID);
    const bStore = memoryHolderStore();
    const b = await holderCredential({
      rpId: RP_ID,
      store: bStore,
      joinUserId: a.holder.record.userId,
    });
    let slept = 0;
    const found = await waitForJoinedRegistration(ledger, b, bStore, {
      attempts: 3,
      sleep: async () => {
        slept++;
      },
    });
    expect(found).toBe(false);
    expect(slept).toBe(2);
    expect(await bStore.load()).toMatchObject({ registered: false, joining: true });
  });
});

describe("T-030-13 devices in Settings", () => {
  it("lists every credential of the account from Kippu's read, marking this phone", async () => {
    const { listDevices } = await import("./list.ts");
    const read = {
      credentials: [
        {
          authoritative: false as const,
          sequence: 3,
          credential: "aa".repeat(32),
          registeredAt: 1_000,
          linkedThisSession: false,
        },
        {
          authoritative: false as const,
          sequence: 9,
          credential: "bb".repeat(32),
          registeredAt: 2_000,
          linkedThisSession: true,
        },
      ],
      freshness: { cursor: "9", records: 9, lastRecordedAt: 2_000 },
    };
    expect(
      await listDevices({ derived: { credentials: { mine: { query: async () => read } } } }),
    ).toEqual([
      { credential: "aa".repeat(32), registeredAt: 1_000, thisDevice: false },
      { credential: "bb".repeat(32), registeredAt: 2_000, thisDevice: true },
    ]);
    expect(
      await listDevices({
        derived: {
          credentials: {
            mine: {
              query: async () => {
                throw new Error("unreachable");
              },
            },
          },
        },
      }),
    ).toBeNull();
  });
});
