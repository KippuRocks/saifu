import { afterEach, describe, expect, it } from "vitest";
import { simulatedDevice } from "../../test/holder-device.ts";
import { ACCOUNT, holdingsRead, pressPass } from "../../test/holdings-fixture.ts";
import { holderCredential } from "../holder/credential.ts";
import { memoryHolderStore } from "../holder/store.ts";
import { holdingsCache, memoryKeyValueStorage } from "../holdings/cache.ts";
import type { LoadedHoldings } from "../holdings/load.ts";
import { loadHoldings } from "../holdings/load.ts";
import { produceTicketPass, refreshAt } from "./produce.ts";
import { passWindowFor } from "./window.ts";

const RP_ID = "kippu.example";
const TICKET = "11".repeat(32);

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

const fromKippu = (windowMs: number, isDefault = false): LoadedHoldings => ({
  source: "kippu",
  entry: {
    account: ACCOUNT,
    read: holdingsRead([pressPass({ id: TICKET }, { windowMs, isDefault })]),
    assurance: null,
    savedAt: 0,
  },
});

async function signer() {
  simulatedDevice(RP_ID);
  return (await holderCredential({ rpId: RP_ID, store: memoryHolderStore() })).signer;
}

describe("T-030-17 passes use the event's configured window (NFR-5)", () => {
  it("a pass for an event with a 120 s window has a 120 s window", async () => {
    const window = passWindowFor(fromKippu(120_000), TICKET);
    const { signed } = await produceTicketPass(TICKET, await signer(), { window, now: () => 0 });
    expect(signed.pass.notAfter - signed.pass.notBefore).toBe(120_000);
    expect(refreshAt(signed)).toBe(110_000);
  });

  it("the default stays 60 s", async () => {
    for (const loaded of [
      fromKippu(60_000, true),
      null,
      { source: "none", error: null } as const,
    ]) {
      const window = passWindowFor(loaded, TICKET);
      const { signed } = await produceTicketPass(TICKET, await signer(), { window, now: () => 0 });
      expect(signed.pass.notAfter - signed.pass.notBefore).toBe(60_000);
    }
    // A ticket the device knows nothing about, and a window that is not usable.
    expect(passWindowFor(fromKippu(120_000), "22".repeat(32))).toBe(60_000);
    expect(passWindowFor(fromKippu(0), TICKET)).toBe(60_000);
    expect(passWindowFor(fromKippu(10 * 60_000), TICKET)).toBe(60_000);
  });

  it("offline, the last window Saifu read is kept with the cached holding", async () => {
    const cache = holdingsCache(memoryKeyValueStorage());
    const read = holdingsRead([pressPass({ id: TICKET }, { windowMs: 90_000, isDefault: false })]);
    const kippu = (answer: "ok" | "down") => ({
      derived: {
        holdings: {
          mine: {
            query: async () => {
              if (answer === "down") throw new Error("unreachable");
              return read;
            },
          },
        },
      },
    });
    await loadHoldings({ kippu: kippu("ok"), cache, account: ACCOUNT, assurance: null });
    const offline = await loadHoldings({
      kippu: kippu("down"),
      cache,
      account: ACCOUNT,
      assurance: null,
    });
    expect(offline.source).toBe("cache");
    expect(passWindowFor(offline, TICKET)).toBe(90_000);
  });

  it("refreshes 10 s before the window closes, or halfway through a window of 20 s or less", async () => {
    const s = await signer();
    const at = async (window: number) =>
      refreshAt((await produceTicketPass(TICKET, s, { window, now: () => 0 })).signed);
    expect(await at(60_000)).toBe(50_000);
    expect(await at(300_000)).toBe(290_000);
    expect(await at(20_000)).toBe(10_000);
    expect(await at(10_000)).toBe(5_000);
  });
});
