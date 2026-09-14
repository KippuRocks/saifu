import { describe, expect, it } from "vitest";
import { ACCOUNT, holdingsRead, pressPass } from "../../test/holdings-fixture.ts";
import { holdingsCache, memoryKeyValueStorage } from "./cache.ts";
import { loadHoldings } from "./load.ts";

const api = (read: ReturnType<typeof holdingsRead> | Error) => ({
  derived: {
    holdings: {
      mine: {
        query: async () => {
          if (read instanceof Error) throw read;
          return read;
        },
      },
    },
  },
});

describe("T-030-05 holdings and device cache", () => {
  it("reads Kippu's copy and caches it on the device", async () => {
    const cache = holdingsCache(memoryKeyValueStorage());
    const read = holdingsRead([pressPass()]);
    const loaded = await loadHoldings({
      kippu: api(read),
      cache,
      account: ACCOUNT,
      assurance: null,
      now: () => 42,
    });
    expect(loaded.source).toBe("kippu");
    expect(await cache.load(ACCOUNT)).toEqual({
      account: ACCOUNT,
      read,
      assurance: null,
      savedAt: 42,
    });
  });

  it("shows the cached tickets when Kippu does not answer", async () => {
    const cache = holdingsCache(memoryKeyValueStorage());
    const read = holdingsRead([pressPass()]);
    await loadHoldings({ kippu: api(read), cache, account: ACCOUNT, assurance: null });
    const offline = await loadHoldings({
      kippu: api(new Error("unreachable")),
      cache,
      account: ACCOUNT,
      assurance: null,
    });
    expect(offline.source).toBe("cache");
    expect(offline.source === "cache" && offline.entry.read).toEqual(read);
  });

  it("keeps each account's cache apart", async () => {
    const cache = holdingsCache(memoryKeyValueStorage());
    await loadHoldings({
      kippu: api(holdingsRead([pressPass()])),
      cache,
      account: ACCOUNT,
      assurance: null,
    });
    expect(await cache.load("b2".repeat(32))).toBeNull();
    const none = await loadHoldings({
      kippu: api(new Error("unreachable")),
      cache,
      account: "b2".repeat(32),
      assurance: null,
    });
    expect(none.source).toBe("none");
  });
});
