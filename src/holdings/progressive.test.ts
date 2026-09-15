import type { AccountId } from "@ticketto/sdk";
import { describe, expect, it } from "vitest";
import { holdingsRead, pressPass } from "../../test/holdings-fixture.ts";
import { grantTicket, memoryLedger } from "../../test/memory-ledger.ts";
import { holdingsCache, memoryKeyValueStorage } from "./cache.ts";
import { type LoadedHoldings, loadHoldingsProgressively } from "./load.ts";

const RP_ID = "kippu.example";
const HOLDER = "d4".repeat(32) as AccountId;

function kippu(answer: "answers" | "fails") {
  const calls: number[] = [];
  return {
    calls,
    api: {
      derived: {
        holdings: {
          mine: {
            query: async () => {
              calls.push(1);
              if (answer === "fails") throw new Error("kippu-api is not answering");
              return holdingsRead([pressPass({ holder: HOLDER })]);
            },
          },
        },
      },
    },
  };
}

async function cachedTicket() {
  const ledger = memoryLedger(RP_ID);
  const { event, ticket } = await grantTicket(ledger, HOLDER, {
    cannotResale: false,
    cannotTransfer: false,
  });
  const cache = holdingsCache(memoryKeyValueStorage());
  await cache.save({
    account: HOLDER,
    read: holdingsRead([pressPass({ id: ticket, event, holder: HOLDER })]),
    assurance: null,
    savedAt: 1,
  });
  return { ledger, cache, ticket };
}

/** A ledger connection the test settles when it chooses. */
function pending<T>() {
  let settle: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

describe("T-030-19 holdings with no network", () => {
  it("NFR-3: offline, the cached tickets are answered at once, and read from the ledger once it connects", async () => {
    const { ledger, cache, ticket } = await cachedTicket();
    const server = kippu("answers");
    const connection = pending<typeof ledger | null>();
    const updates: LoadedHoldings[] = [];

    const first = await loadHoldingsProgressively({
      kippu: server.api,
      cache,
      account: HOLDER,
      ledger: connection.promise,
      offline: true,
      onUpdate: (loaded) => updates.push(loaded),
    });
    expect(first.source).toBe("cache");
    expect(server.calls).toHaveLength(0);
    expect(updates).toHaveLength(0);

    connection.settle(ledger);
    await expect.poll(() => updates.length).toBe(1);
    const [update] = updates;
    expect(update?.source === "ledger" && update.tickets.map((t) => t.ticket.id)).toEqual([ticket]);
  });

  it("when Kippu does not answer, the cache is answered without waiting for the ledger", async () => {
    const { cache } = await cachedTicket();
    const updates: LoadedHoldings[] = [];
    const first = await loadHoldingsProgressively({
      kippu: kippu("fails").api,
      cache,
      account: HOLDER,
      ledger: new Promise(() => {}),
      offline: false,
      onUpdate: (loaded) => updates.push(loaded),
    });
    expect(first.source).toBe("cache");
    expect(updates).toEqual([]);
  });

  it("online, Kippu's copy answers as before", async () => {
    const { ledger, cache } = await cachedTicket();
    const loaded = await loadHoldingsProgressively({
      kippu: kippu("answers").api,
      cache,
      account: HOLDER,
      ledger: Promise.resolve(ledger),
      offline: false,
      onUpdate: () => {},
    });
    expect(loaded.source).toBe("kippu");
  });
});
