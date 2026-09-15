// Transferring a ticket (T-030-08; US-D1, REQ-CL-1, REQ-FR-3, AC-B3.3;
// features/030-saifu/plan.md §5.4).
//
// The transfer is signed with the holder's passkey, sponsored through Kippu's
// relay, and submitted directly to the ledger through the SDK: Kippu's APIs are
// not in the path. For an account this Saifu has never sent a ticket to, a
// full-screen warning comes first — no payment is involved, and it cannot be
// undone — and nothing is signed until the holder confirms it. Once the ledger
// has recorded the transfer, Saifu waits for Kippu's copy to reflect it before
// showing the ticket gone.

import type {
  AccountId,
  EventId,
  Receipt,
  Result,
  Signer,
  TicketId,
  Ticketto,
} from "@ticketto/sdk";
import type { ExchangedAccounts } from "./exchanged.ts";

export interface TransferRequest {
  readonly ticket: string;
  readonly event: string;
  readonly receiver: AccountId;
}

export interface CopyWaiter {
  /** Waits for Kippu's copy to reflect the record at `cursor`; `true` once it does. */
  waitFor(cursor: string): Promise<boolean>;
}

export type TransferStep =
  /** The receiver is unknown: the warning must be confirmed before anything is signed. */
  | { readonly kind: "warning" }
  | { readonly kind: "signing" }
  /** The ledger recorded the transfer; waiting for Kippu's copy. */
  | { readonly kind: "recorded"; readonly receipt: Receipt }
  | { readonly kind: "done"; readonly receipt: Receipt; readonly copyCaughtUp: boolean }
  | {
      readonly kind: "failed";
      /** A §10 code, or `cancelled` when the holder dismissed the passkey prompt. */
      readonly code: string;
    };

export interface TransferDeps {
  readonly ledger: Pick<Ticketto, "transferTicket">;
  readonly signer: Signer;
  readonly exchanged: ExchangedAccounts;
  readonly copy: CopyWaiter;
  readonly onStep: (step: TransferStep) => void;
}

export interface TransferFlow {
  /** Starts the transfer: straight to signing for a known account, else to the warning. */
  begin(): Promise<void>;
  /** The holder confirmed the warning. */
  confirm(): Promise<void>;
}

export function transferFlow(request: TransferRequest, deps: TransferDeps): TransferFlow {
  let warned = false;
  let started = false;

  const send = async () => {
    if (started) return;
    started = true;
    deps.onStep({ kind: "signing" });
    let submitted: Result<Receipt>;
    try {
      submitted = await deps.ledger.transferTicket(deps.signer, {
        event: request.event as EventId,
        ticket: request.ticket as TicketId,
        receiver: request.receiver,
      });
    } catch {
      started = false;
      deps.onStep({ kind: "failed", code: "cancelled" });
      return;
    }
    if (!submitted.ok) {
      started = false;
      deps.onStep({ kind: "failed", code: submitted.error.code });
      return;
    }
    await deps.exchanged.record(request.receiver).catch(() => {});
    deps.onStep({ kind: "recorded", receipt: submitted.value });
    const copyCaughtUp = await deps.copy.waitFor(submitted.value.cursor).catch(() => false);
    deps.onStep({ kind: "done", receipt: submitted.value, copyCaughtUp });
  };

  return {
    async begin() {
      if (await deps.exchanged.isKnown(request.receiver)) {
        await send();
      } else {
        warned = true;
        deps.onStep({ kind: "warning" });
      }
    },
    async confirm() {
      if (!warned) return;
      await send();
    },
  };
}

/** Whether a ticket offers a transfer at all (`AC-B3.3`), and why not. */
export function transferability(restrictions: {
  readonly cannotTransfer: boolean;
}): { readonly offered: true } | { readonly offered: false; readonly reason: string } {
  return restrictions.cannotTransfer
    ? {
        offered: false,
        reason: "This ticket cannot be transferred: the organiser issued it for you alone.",
      }
    : { offered: true };
}
