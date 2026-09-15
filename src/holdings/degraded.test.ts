import { createMemoryBackend } from "@ticketto/backend-memory";
import { createProfileV0 } from "@ticketto/profile-v0";
import { softwareP256Signer } from "@ticketto/profile-v0/testing";
import type { AccountId, ClassId, Position, Ticketto, ZoneId } from "@ticketto/sdk";
import { describe, expect, it } from "vitest";
import { holdingsRead, pressPass } from "../../test/holdings-fixture.ts";
import { localSponsor } from "../../test/memory-ledger.ts";
import { saifuTicketto } from "../ledger/ticketto.ts";
import { holdingsCache, memoryKeyValueStorage } from "./cache.ts";
import { ledgerTicketDetail } from "./degraded.ts";
import { loadHoldings } from "./load.ts";

const RP_ID = "kippu.example";
const HOLDER = "c3".repeat(32) as AccountId;
const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

/** An organiser's event with one press pass issued to HOLDER, on backend-memory. */
async function ledgerWithPressPass() {
  const profile = createProfileV0({ rpId: RP_ID });
  const backend = createMemoryBackend({ profile });
  const ledger = saifuTicketto({ backend, sponsor: localSponsor(), rpId: RP_ID });
  const organiser = softwareP256Signer();
  const ok = async <T>(p: PromiseLike<{ ok: boolean; error?: { code: string } } & T>) => {
    const r = await p;
    if (!r.ok) throw new Error(r.error?.code);
    return r;
  };
  await ok(
    ledger.registerCredential(organiser.signer, {
      account: organiser.signer.account,
      registration: organiser.registration,
    }),
  );
  const zone = "44".repeat(32) as ZoneId;
  const created = ledger.createEvent(organiser.signer, {
    salt: crypto.getRandomValues(new Uint8Array(32)),
    capacity: 10,
    zones: [{ id: zone, kind: "Seated" }],
    metadata: "https://meta.kippu.rocks/v0/events/x.json",
  });
  await ok(created.submission);
  const issued = ledger.issueTicket(organiser.signer, {
    event: created.id,
    class: "33".repeat(32) as ClassId,
    holder: HOLDER,
    zone,
    placement: { kind: "Seated", position: hex(new TextEncoder().encode("A-1")) as Position },
    policy: { kind: "Multiple", max: 2, until: null },
    restrictions: { cannotResale: true, cannotTransfer: true },
    provenance: "Granted",
    metadata: null,
  });
  await ok(issued.submission);
  return { ledger, backend, event: created.id, ticket: issued.id };
}

const unreachable = {
  derived: {
    holdings: {
      mine: {
        query: async (): Promise<never> => {
          throw new Error("kippu-api is not answering");
        },
      },
    },
  },
};

describe("T-030-06 degraded rendering from the ledger", () => {
  it("REQ-MD-2: with Kippu unreachable, cached tickets render from ledger state", async () => {
    const { ledger, backend, event, ticket } = await ledgerWithPressPass();
    const cache = holdingsCache(memoryKeyValueStorage());
    // What Kippu's copy said when it last answered: including Kippu-only data.
    const cachedView = pressPass({ id: ticket, event, holder: HOLDER, attendances: 0 });
    await cache.save({
      account: HOLDER,
      read: holdingsRead([cachedView]),
      assurance: backend.assurance,
      savedAt: 1,
    });

    const loaded = await loadHoldings({
      kippu: unreachable,
      cache,
      account: HOLDER,
      assurance: null,
      ledger,
    });

    expect(loaded.source).toBe("ledger");
    if (loaded.source !== "ledger") return;
    expect(loaded.tickets.map((h) => h.ticket.id)).toEqual([ticket]);
    const detail = ledgerTicketDetail(
      loaded.tickets[0] as (typeof loaded.tickets)[number],
      loaded.entry.assurance,
    );
    expect(detail).toMatchObject({
      id: ticket,
      title: "Granted ticket",
      eventStatus: "Active",
      place: "Seat A-1",
      provenance: "Granted by the organiser",
      policy: "Admits up to 2 times",
      restrictions: "Cannot be transferred or resold",
      attendances: "Not used yet",
    });
    expect(detail.assurance?.attested.length).toBeGreaterThan(0);
  });

  it("REQ-MD-3: renders from ledger-native fields alone, never from Kippu's cached metadata", async () => {
    const { ledger, event, ticket } = await ledgerWithPressPass();
    const cache = holdingsCache(memoryKeyValueStorage());
    // The cache says a different policy and a class name; the ledger's facts win, and no name shows.
    const cachedView = pressPass({ id: ticket, event, holder: HOLDER, policy: { kind: "Single" } });
    await cache.save({
      account: HOLDER,
      read: holdingsRead([cachedView]),
      assurance: null,
      savedAt: 1,
    });
    const loaded = await loadHoldings({
      kippu: unreachable,
      cache,
      account: HOLDER,
      assurance: null,
      ledger,
    });
    if (loaded.source !== "ledger") throw new Error(loaded.source);
    const detail = ledgerTicketDetail(loaded.tickets[0] as (typeof loaded.tickets)[number], null);
    expect(detail.policy).toBe("Admits up to 2 times");
    expect(JSON.stringify(detail)).not.toMatch(/Press|Opening night/);
    expect(detail.event).toBe(`Event ${event.slice(0, 8)}…`);
  });

  it("leaves out a cached ticket the ledger no longer shows as the holder's", async () => {
    const { ledger, event, ticket } = await ledgerWithPressPass();
    const other = "d4".repeat(32);
    const cache = holdingsCache(memoryKeyValueStorage());
    await cache.save({
      account: other,
      read: holdingsRead([pressPass({ id: ticket, event, holder: other })]),
      assurance: null,
      savedAt: 1,
    });
    const loaded = await loadHoldings({
      kippu: unreachable,
      cache,
      account: other,
      assurance: null,
      ledger,
    });
    expect(loaded.source === "ledger" && loaded.tickets).toEqual([]);
  });

  it("shows the cache as it was when the ledger cannot be read either", async () => {
    const cache = holdingsCache(memoryKeyValueStorage());
    await cache.save({
      account: HOLDER,
      read: holdingsRead([pressPass()]),
      assurance: null,
      savedAt: 1,
    });
    const down: Pick<Ticketto, "getTicket" | "getEvent"> = {
      getTicket: async () => ({ ok: false, error: { code: "ERR-LedgerUnavailable" } }) as never,
      getEvent: async () => ({ ok: false, error: { code: "ERR-LedgerUnavailable" } }) as never,
    };
    const loaded = await loadHoldings({
      kippu: unreachable,
      cache,
      account: HOLDER,
      assurance: null,
      ledger: down,
    });
    expect(loaded.source).toBe("cache");
  });
});
