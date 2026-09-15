// T-030-08 against the real system (see holder.system.test.ts for when it runs):
// a transfer signed in Saifu, sponsored by the relay, submitted directly to the
// ledger service, and reflected in Kippu's copy.

import { afterEach, describe, expect, it } from "vitest";
import { holdingsCache, memoryKeyValueStorage } from "../../src/holdings/cache.ts";
import { ticketDetail } from "../../src/holdings/detail.ts";
import { loadHoldings } from "../../src/holdings/load.ts";
import { connectLedger } from "../../src/ledger/ticketto.ts";
import { receiveCode } from "../../src/receive/receive-code.ts";
import { exchangedAccounts } from "../../src/transfer/exchanged.ts";
import { checkReceiver } from "../../src/transfer/receiver.ts";
import { type TransferStep, transferFlow } from "../../src/transfer/transfer.ts";
import { linkedHolder, organiser, randomId, stack, stackAvailable } from "./stack.ts";

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

describe.skipIf(!stackAvailable)(
  "T-030-08 transfer against the relay and the ledger service",
  () => {
    it("US-D1: a warned transfer to an unknown account moves the ticket, and Kippu's copy shows it gone", async () => {
      // The simulated passkey device is global: the receiver sets up first, and the
      // sender's device is the one in place when the sender signs.
      const receiver = await linkedHolder();
      const sender = await linkedHolder();
      const organiserApi = await organiser();
      const zone = randomId();
      const { event } = await organiserApi.events.create.mutate({
        zones: [{ id: zone, kind: "Unseated" }],
        capacity: 10,
      });
      const make = (name: string, cannotTransfer: boolean) =>
        organiserApi.events.classes.define.mutate({
          event,
          name,
          description: null,
          provenance: "Granted",
          policy: { kind: "Single" },
          restrictions: { cannotResale: true, cannotTransfer },
          quota: 5,
        });
      const [guests, press] = [await make("Guests", false), await make("Press", true)];
      const issue = (classId: string) =>
        organiserApi.events.tickets.issueGranted.mutate({
          event,
          class: classId,
          zone,
          placement: { kind: "Unseated" },
          holder: sender.holder.account,
        });
      const movable = await issue(guests.id);
      const pressPass = await issue(press.id);
      await sender.kippu.derived.waitFor.query({ cursor: pressPass.cursor, timeout: 10_000 });

      const cache = holdingsCache(memoryKeyValueStorage());
      const before = await loadHoldings({
        kippu: sender.kippu,
        cache,
        account: sender.holder.account,
        assurance: null,
      });
      if (before.source !== "kippu") throw new Error(before.source);
      const detailOf = (ticket: string) => {
        const holding = before.entry.read.holdings.find((h) => h.ticket.id === ticket);
        if (holding === undefined) throw new Error("ticket not held");
        return ticketDetail(holding, null);
      };
      // AC-B3.3: the press pass offers no transfer; the guest ticket does.
      expect(detailOf(pressPass.ticket).transferable).toBe(false);
      expect(detailOf(movable.ticket).transferable).toBe(true);

      // The receiver shows their receive code; the sender's Saifu reads it.
      const connected = await connectLedger({
        ledgerUrl: stack.ledgerUrl as string,
        sponsorUrl: stack.sponsorUrl as string,
        rpId: stack.rpId,
        receiptCursor: () => before.entry.read.freshness.cursor || undefined,
      });
      if (!connected.ok) throw new Error(connected.error.code);
      const chosen = await checkReceiver(
        receiveCode(receiver.holder.account),
        sender.holder.account,
        connected.value,
      );
      if (!chosen.ok) throw new Error(chosen.problem);

      const steps: TransferStep[] = [];
      const flow = transferFlow(
        { event, ticket: movable.ticket, receiver: chosen.account },
        {
          ledger: connected.value,
          signer: sender.holder.signer,
          exchanged: exchangedAccounts(memoryKeyValueStorage(), sender.holder.account),
          copy: {
            waitFor: async (cursor) =>
              (await sender.kippu.derived.waitFor.query({ cursor, timeout: 10_000 })).reached,
          },
          onStep: (step) => steps.push(step),
        },
      );
      await flow.begin();
      expect(steps.map((s) => s.kind)).toEqual(["warning"]);
      await flow.confirm();
      expect(steps.map((s) => s.kind)).toEqual(["warning", "signing", "recorded", "done"]);
      const done = steps.at(-1);
      expect(done?.kind === "done" && done.copyCaughtUp).toBe(true);

      // The ledger records the receiver as holder, and Kippu's copy agrees for both holders.
      const onLedger = await connected.value.getTicket(movable.ticket as never);
      expect(onLedger.ok && onLedger.value.holder).toBe(receiver.holder.account);
      const after = await loadHoldings({
        kippu: sender.kippu,
        cache,
        account: sender.holder.account,
        assurance: null,
      });
      if (after.source !== "kippu") throw new Error(after.source);
      expect(after.entry.read.holdings.map((h) => h.ticket.id)).not.toContain(movable.ticket);
      const received = await receiver.kippu.derived.holdings.mine.query();
      expect(received.holdings.map((h) => h.ticket.id)).toContain(movable.ticket);
    });
  },
);
