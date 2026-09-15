import { decodePass, registrationAccount, verifyPass } from "@ticketto/profile-v0";
import jsQR from "jsqr";
import { afterEach, describe, expect, it, vi } from "vitest";
import { simulatedDevice } from "../../test/holder-device.ts";
import { holderCredential } from "../holder/credential.ts";
import { memoryHolderStore } from "../holder/store.ts";
import { type PassState, passCycle, type Timers } from "./cycle.ts";
import { produceTicketPass, REFRESH_MARGIN_MS, refreshAt } from "./produce.ts";
import { passQr, qrPath } from "./qr.ts";

const RP_ID = "kippu.example";
const TICKET = "11".repeat(32);

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
  vi.unstubAllGlobals();
});

async function holder() {
  simulatedDevice(RP_ID);
  const store = memoryHolderStore();
  return { credential: await holderCredential({ rpId: RP_ID, store }), store };
}

describe("T-030-07 offline pass production", () => {
  it("AC-E1.1: a pass is signed by the holder's passkey and bounded by a short window", async () => {
    const { credential } = await holder();
    const produced = await produceTicketPass(TICKET, credential.signer, { now: () => 1_000_000 });
    const { pass } = produced.signed;
    expect(pass).toMatchObject({
      ticket: TICKET,
      holder: credential.account,
      notBefore: 1_000_000,
    });
    expect(pass.notAfter - pass.notBefore).toBe(60_000);
    expect(pass.id).toMatch(/^[0-9a-f]{32}$/);

    const verified = verifyPass(
      produced.signed,
      credential.registration,
      { now: () => 1_030_000 },
      { rpId: RP_ID },
    );
    expect(verified.ok).toBe(true);
    // Its QR bytes decode to the same signed pass.
    const decoded = decodePass(produced.bytes);
    expect(decoded.ok && decoded.value.pass).toEqual(pass);
  });

  it("NFR-3: with every network path failing, a pass is produced from what the device holds, and verifies", async () => {
    const { credential, store } = await holder();
    const offline = () => {
      throw new Error("airplane mode: no network");
    };
    vi.stubGlobal("fetch", vi.fn(offline));
    vi.stubGlobal("XMLHttpRequest", vi.fn(offline));
    vi.stubGlobal("WebSocket", vi.fn(offline));

    // The device holds the holder record and a cached ticket id: nothing else.
    const record = await store.load();
    if (record === null) throw new Error("no holder record");
    const reloaded = await holderCredential({ rpId: RP_ID, store });
    const produced = await produceTicketPass(TICKET, reloaded.signer);

    expect(fetch).not.toHaveBeenCalled();
    const named = registrationAccount(credential.registration);
    expect(named.ok).toBe(true);
    expect(
      verifyPass(produced.signed, credential.registration, { now: Date.now }, { rpId: RP_ID }).ok,
    ).toBe(true);
  });

  it("REQ-AP-4: each pass for a ticket has its own id", async () => {
    const { credential } = await holder();
    const ids = new Set<string>();
    for (let i = 0; i < 3; i++)
      ids.add((await produceTicketPass(TICKET, credential.signer)).signed.pass.id);
    expect(ids.size).toBe(3);
  });

  it("REQ-AP-1: only the holder's own credential signs a pass for the holder", async () => {
    const { credential } = await holder();
    const other = await holder();
    await expect(
      produceTicketPass(TICKET, {
        account: credential.account,
        sign: other.credential.signer.sign,
      }),
    ).resolves.toBeDefined();
    const impostor = await produceTicketPass(TICKET, {
      account: credential.account,
      sign: other.credential.signer.sign,
    });
    expect(
      verifyPass(impostor.signed, credential.registration, { now: Date.now }, { rpId: RP_ID }),
    ).toMatchObject({ ok: false, error: { code: "ERR-InvalidPass" } });
  });
});

describe("T-030-07 QR code", () => {
  it("AD-13: carries the signed pass's bytes in binary mode, which a scanner reads back exactly", async () => {
    const { credential } = await holder();
    const { bytes } = await produceTicketPass(TICKET, credential.signer);
    const matrix = passQr(bytes);
    expect(matrix.version).toBeLessThanOrEqual(17);

    // Rasterise with a quiet zone, 4 px per module, and scan it.
    const quiet = 4;
    const scale = 4;
    const side = (matrix.size + 2 * quiet) * scale;
    const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
    for (let row = 0; row < matrix.size; row++) {
      for (let col = 0; col < matrix.size; col++) {
        if (!matrix.dark[row * matrix.size + col]) continue;
        for (let y = 0; y < scale; y++) {
          for (let x = 0; x < scale; x++) {
            const at = (((row + quiet) * scale + y) * side + (col + quiet) * scale + x) * 4;
            pixels.fill(0, at, at + 3);
          }
        }
      }
    }
    const scanned = jsQR(pixels, side, side);
    expect(scanned).not.toBeNull();
    expect(Uint8Array.from(scanned?.binaryData ?? [])).toEqual(bytes);
    expect(qrPath(matrix)).toMatch(/^M\d+ \d+h\d+v1h-\d+z/);
  });
});

describe("T-030-07 refreshing before the window closes (NFR-5)", () => {
  function fakeTimers() {
    let clock = 0;
    const pending: { at: number; run: () => void; id: number }[] = [];
    let ids = 0;
    const timers: Timers = {
      setTimeout: (run, ms) => {
        const id = ++ids;
        pending.push({ at: clock + ms, run, id });
        return id;
      },
      clearTimeout: (id) => {
        const i = pending.findIndex((p) => p.id === id);
        if (i >= 0) pending.splice(i, 1);
      },
    };
    const advance = async (ms: number) => {
      clock += ms;
      for (
        let next = pending.findIndex((p) => p.at <= clock);
        next >= 0;
        next = pending.findIndex((p) => p.at <= clock)
      ) {
        const [due] = pending.splice(next, 1);
        due?.run();
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));
      }
      await new Promise((r) => setImmediate(r));
    };
    return { timers, advance, now: () => clock, pending };
  }

  it("replaces the pass before its window closes, one assertion per pass", async () => {
    const { credential } = await holder();
    const t = fakeTimers();
    const states: PassState[] = [];
    let produced = 0;
    const cycle = passCycle({
      produce: () => {
        produced++;
        return produceTicketPass(TICKET, credential.signer, { now: t.now });
      },
      onState: (state) => states.push(state),
      now: t.now,
      timers: t.timers,
    });
    cycle.start();
    await t.advance(0);
    const first = states.findLast((s) => s.kind === "showing");
    if (first?.kind !== "showing") throw new Error("no pass shown");
    expect(refreshAt(first.pass.signed)).toBe(first.pass.signed.pass.notAfter - REFRESH_MARGIN_MS);

    await t.advance(49_999);
    expect(produced).toBe(1);
    await t.advance(1);
    expect(produced).toBe(2);
    const second = states.findLast((s) => s.kind === "showing");
    if (second?.kind !== "showing") throw new Error("no second pass");
    expect(second.pass.signed.pass.notBefore).toBeLessThan(first.pass.signed.pass.notAfter);
    expect(second.pass.signed.pass.id).not.toBe(first.pass.signed.pass.id);

    cycle.stop();
    await t.advance(120_000);
    expect(produced).toBe(2);
    expect(states.at(-1)).toMatchObject({ kind: "stopped", failed: false });
  });

  it("stops, without prompting again, when the holder dismisses a prompt", async () => {
    const t = fakeTimers();
    const states: PassState[] = [];
    let produced = 0;
    const cycle = passCycle({
      produce: async () => {
        produced++;
        throw new Error("the passkey request was cancelled");
      },
      onState: (state) => states.push(state),
      now: t.now,
      timers: t.timers,
    });
    cycle.start();
    await t.advance(0);
    await t.advance(300_000);
    expect(produced).toBe(1);
    expect(states.at(-1)).toMatchObject({ kind: "stopped", failed: true });
  });
});
