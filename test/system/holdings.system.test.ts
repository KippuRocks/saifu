// T-030-05 against the real system (see holder.system.test.ts for when it runs).

import { afterEach, describe, expect, it } from "vitest";
import { holdingsCache, memoryKeyValueStorage } from "../../src/holdings/cache.ts";
import { ticketDetail } from "../../src/holdings/detail.ts";
import { loadHoldings } from "../../src/holdings/load.ts";
import { linkedHolder, organiser, randomId, stackAvailable } from "./stack.ts";

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

describe.skipIf(!stackAvailable)(
  "T-030-05 holdings against kippu-api and the ledger service",
  () => {
    it("AC-B2.6: a press pass is legible as one", async () => {
      const { holder, kippu, ledger } = await linkedHolder();
      const organiserApi = await organiser();

      const stalls = randomId();
      const { event } = await organiserApi.events.create.mutate({
        zones: [{ id: stalls, kind: "Seated" }],
        capacity: 100,
      });
      await organiserApi.events.zones.addSeatPositions.mutate({
        event,
        zone: stalls,
        positions: ["A-1"],
      });
      const press = await organiserApi.events.classes.define.mutate({
        event,
        name: "Press",
        description: null,
        provenance: "Granted",
        policy: { kind: "Single" },
        restrictions: { cannotResale: true, cannotTransfer: true },
        quota: 10,
      });
      const { ticket, cursor } = await organiserApi.events.tickets.issueGranted.mutate({
        event,
        class: press.id,
        zone: stalls,
        placement: { kind: "Seated", position: "A-1" },
        holder: holder.account,
      });
      expect((await kippu.derived.waitFor.query({ cursor, timeout: 10_000 })).reached).toBe(true);

      const cache = holdingsCache(memoryKeyValueStorage());
      const loaded = await loadHoldings({
        kippu,
        cache,
        account: holder.account,
        assurance: ledger.assurance(),
      });
      if (loaded.source !== "kippu") throw new Error(`holdings from ${loaded.source}`);
      const holding = loaded.entry.read.holdings.find((h) => h.ticket.id === ticket);
      if (holding === undefined) throw new Error("the issued ticket is not among the holdings");

      const detail = ticketDetail(holding, loaded.entry.assurance);
      expect(detail).toMatchObject({
        title: "Press",
        place: "Seat A-1",
        provenance: "Granted by the organiser",
        restrictions: "Cannot be transferred or resold",
        policy: "Admits once",
        attendances: "Not used yet",
      });
      expect(detail.assurance?.enforced.length).toBeGreaterThan(0);
      expect(detail.assurance?.attested.length).toBeGreaterThan(0);
      // The cache now holds it for when Kippu is unreachable.
      expect((await cache.load(holder.account))?.read.holdings.map((h) => h.ticket.id)).toContain(
        ticket,
      );
    });
  },
);
