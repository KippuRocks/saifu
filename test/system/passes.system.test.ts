// T-030-07 and T-030-17 against the real system (see holder.system.test.ts for
// when it runs): the organiser sets an event's pass window in kippu-api, Saifu
// reads it with the holding, and produces a pass with it that profile-v0
// verifies against the registration the ledger records.

import { registrationAccount, verifyPass } from "@ticketto/profile-v0";
import { afterEach, describe, expect, it } from "vitest";
import { holdingsCache, memoryKeyValueStorage } from "../../src/holdings/cache.ts";
import { loadHoldings } from "../../src/holdings/load.ts";
import { produceTicketPass } from "../../src/passes/produce.ts";
import { passWindowFor } from "../../src/passes/window.ts";
import { linkedHolder, organiser, randomId, stack, stackAvailable } from "./stack.ts";

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

describe.skipIf(!stackAvailable)(
  "T-030-17 pass windows against kippu-api and the ledger service",
  () => {
    it("a pass for an event with a 120 s window has a 120 s window; the default stays 60 s", async () => {
      const { holder, kippu, ledger } = await linkedHolder();
      const organiserApi = await organiser();

      const issue = async (windowMs: number | null) => {
        const zone = randomId();
        const { event } = await organiserApi.events.create.mutate({
          zones: [{ id: zone, kind: "Unseated" }],
          capacity: 10,
        });
        if (windowMs !== null) await organiserApi.events.setPassWindow.mutate({ event, windowMs });
        const guests = await organiserApi.events.classes.define.mutate({
          event,
          name: "Guests",
          description: null,
          provenance: "Granted",
          policy: { kind: "Unlimited", until: null },
          restrictions: { cannotResale: true, cannotTransfer: true },
          quota: 5,
        });
        const issued = await organiserApi.events.tickets.issueGranted.mutate({
          event,
          class: guests.id,
          zone,
          placement: { kind: "Unseated" },
          holder: holder.account,
        });
        expect(
          (await kippu.derived.waitFor.query({ cursor: issued.cursor, timeout: 10_000 })).reached,
        ).toBe(true);
        return issued.ticket;
      };
      const configured = await issue(120_000);
      const defaulted = await issue(null);

      const loaded = await loadHoldings({
        kippu,
        cache: holdingsCache(memoryKeyValueStorage()),
        account: holder.account,
        assurance: ledger.assurance(),
        ledger,
      });
      const named = registrationAccount(holder.registration);
      if (!named.ok) throw new Error("no account");
      const registered = await ledger.getCredential(holder.account, named.value.credential);
      if (!registered.ok || registered.value === null) throw new Error("not registered");

      for (const [ticket, expected] of [
        [configured, 120_000],
        [defaulted, 60_000],
      ] as const) {
        const { signed } = await produceTicketPass(ticket, holder.signer, {
          window: passWindowFor(loaded, ticket),
        });
        expect(signed.pass.notAfter - signed.pass.notBefore).toBe(expected);
        expect(
          verifyPass(signed, registered.value, { now: Date.now }, { rpId: stack.rpId }).ok,
        ).toBe(true);
      }
    });
  },
);
