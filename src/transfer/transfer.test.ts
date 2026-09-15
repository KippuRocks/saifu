import type { AccountId, Signer } from "@ticketto/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { simulatedDevice } from "../../test/holder-device.ts";
import { grantTicket, memoryLedger } from "../../test/memory-ledger.ts";
import { matches } from "../../tools/copy-lint/vocabulary.ts";
import { TRANSFER_COPY } from "../copy/transfer.ts";
import { holderCredential } from "../holder/credential.ts";
import { registerHolderCredential } from "../holder/register.ts";
import { memoryHolderStore } from "../holder/store.ts";
import { memoryKeyValueStorage } from "../holdings/cache.ts";
import { receiveCode } from "../receive/receive-code.ts";
import { exchangedAccounts } from "./exchanged.ts";
import { checkReceiver } from "./receiver.ts";
import { type TransferStep, transferability, transferFlow } from "./transfer.ts";

const RP_ID = "kippu.example";

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

async function setUp(restrictions = { cannotResale: false, cannotTransfer: false }) {
  const ledger = memoryLedger(RP_ID);
  simulatedDevice(RP_ID);
  const store = memoryHolderStore();
  const holder = await holderCredential({ rpId: RP_ID, store });
  const registered = await registerHolderCredential(ledger, holder, store);
  if (!registered.ok) throw new Error(registered.error.code);
  const granted = await grantTicket(ledger, holder.account, restrictions);
  const signs: Uint8Array[] = [];
  const signer: Signer = {
    account: holder.account,
    sign: async (payload) => {
      signs.push(payload);
      return holder.signer.sign(payload);
    },
  };
  return { ledger, holder, signer, signs, ...granted };
}

const receiver = "d4".repeat(32) as AccountId;

function run(
  deps: Omit<Parameters<typeof transferFlow>[1], "onStep">,
  request: Parameters<typeof transferFlow>[0],
) {
  const steps: TransferStep[] = [];
  const flow = transferFlow(request, { ...deps, onStep: (step) => steps.push(step) });
  return { flow, steps };
}

describe("T-030-08 transfer", () => {
  it("REQ-FR-3: the warning precedes signing for an unknown account", async () => {
    const { ledger, signer, signs, event, ticket } = await setUp();
    const exchanged = exchangedAccounts(memoryKeyValueStorage(), signer.account);
    const waited: string[] = [];
    const { flow, steps } = run(
      {
        ledger,
        signer,
        exchanged,
        copy: {
          waitFor: async (cursor) => {
            waited.push(cursor);
            return true;
          },
        },
      },
      { event, ticket, receiver },
    );

    await flow.begin();
    expect(steps).toEqual([{ kind: "warning" }]);
    expect(signs).toHaveLength(0);

    await flow.confirm();
    expect(signs).toHaveLength(1);
    expect(steps.map((s) => s.kind)).toEqual(["warning", "signing", "recorded", "done"]);
    const done = steps.at(-1);
    expect(done?.kind === "done" && done.copyCaughtUp).toBe(true);
    expect(waited).toHaveLength(1);

    // US-D1: the receiver holds the ticket, in one step, with nothing asked of them.
    const now = await ledger.getTicket(ticket as never);
    expect(now.ok && now.value.holder).toBe(receiver);
    // The account is known now: the next transfer to it goes straight to signing.
    expect(await exchanged.isKnown(receiver)).toBe(true);
  });

  it("transfers to an account this Saifu has sent a ticket to without the warning", async () => {
    const { ledger, signer, signs, event, ticket } = await setUp();
    const exchanged = exchangedAccounts(memoryKeyValueStorage(), signer.account);
    await exchanged.record(receiver);
    const { flow, steps } = run(
      { ledger, signer, exchanged, copy: { waitFor: async () => true } },
      { event, ticket, receiver },
    );
    await flow.begin();
    expect(steps[0]).toEqual({ kind: "signing" });
    expect(signs).toHaveLength(1);
    expect(steps.at(-1)?.kind).toBe("done");
  });

  it("confirming without a warning signs nothing", async () => {
    const { ledger, signer, signs, event, ticket } = await setUp();
    const exchanged = exchangedAccounts(memoryKeyValueStorage(), signer.account);
    const { flow } = run(
      { ledger, signer, exchanged, copy: { waitFor: async () => true } },
      { event, ticket, receiver },
    );
    await flow.confirm();
    expect(signs).toHaveLength(0);
  });

  it("reports the ledger's refusal, and a dismissed passkey prompt, and records no exchange", async () => {
    const { ledger, signer, event, ticket } = await setUp({
      cannotResale: true,
      cannotTransfer: true,
    });
    const exchanged = exchangedAccounts(memoryKeyValueStorage(), signer.account);
    const refused = run(
      { ledger, signer, exchanged, copy: { waitFor: async () => true } },
      { event, ticket, receiver },
    );
    await refused.flow.begin();
    await refused.flow.confirm();
    expect(refused.steps.at(-1)).toEqual({ kind: "failed", code: "ERR-CannotTransfer" });
    expect(await exchanged.isKnown(receiver)).toBe(false);

    const cancelling: Signer = {
      account: signer.account,
      sign: async () => {
        throw new Error("the passkey request was cancelled");
      },
    };
    const cancelled = run(
      { ledger, signer: cancelling, exchanged, copy: { waitFor: async () => true } },
      { event, ticket, receiver },
    );
    await cancelled.flow.begin();
    await cancelled.flow.confirm();
    expect(cancelled.steps.at(-1)).toEqual({ kind: "failed", code: "cancelled" });
  });

  it("AC-B3.3: a cannot_transfer ticket shows why, and offers no transfer action", () => {
    expect(transferability({ cannotTransfer: false })).toEqual({ offered: true });
    const restricted = transferability({ cannotTransfer: true });
    expect(restricted.offered).toBe(false);
    expect(!restricted.offered && restricted.reason).toMatch(/cannot be transferred/);
  });
});

describe("T-030-08 choosing the receiver", () => {
  it("fills the receiver from a scanned receive code, or a typed account", async () => {
    const { ledger, holder } = await setUp();
    expect(await checkReceiver(receiveCode(receiver), holder.account, ledger)).toEqual({
      ok: true,
      account: receiver,
    });
    expect(
      await checkReceiver(
        `  ${receiver.toUpperCase().match(/.{8}/g)?.join(" ")} `,
        holder.account,
        ledger,
      ),
    ).toEqual({
      ok: true,
      account: receiver,
    });
  });

  it("refuses the holder's own account, malformed input, and a typed ticket or event id", async () => {
    const { ledger, holder, event, ticket } = await setUp();
    expect(await checkReceiver(holder.account, holder.account, ledger)).toEqual({
      ok: false,
      problem: "own-account",
    });
    expect(await checkReceiver("abc", holder.account, ledger)).toEqual({
      ok: false,
      problem: "malformed",
    });
    expect(await checkReceiver(ticket, holder.account, ledger)).toEqual({
      ok: false,
      problem: "ticket-id",
    });
    expect(await checkReceiver(event, holder.account, ledger)).toEqual({
      ok: false,
      problem: "event-id",
    });
    // Without the ledger, a typed id cannot be told apart, and the warning still applies.
    expect((await checkReceiver(ticket, holder.account, null)).ok).toBe(true);
  });

  it("REQ-FR-3, REQ-TM-2: the transfer copy passes the copy lint, and the warning says both things", () => {
    const text = Object.values(TRANSFER_COPY)
      .map((v) => (typeof v === "string" ? v : Object.values(v).join("\n")))
      .join("\n");
    expect(matches(text)).toEqual([]);
    expect(TRANSFER_COPY.warningBody).toMatch(/no payment/i);
    expect(TRANSFER_COPY.warningBody).toMatch(/cannot be undone/i);
  });
});
