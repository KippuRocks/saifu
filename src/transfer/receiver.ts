// Choosing who receives a ticket (T-030-08; US-D1): a scanned receive code
// (T-030-09), or an account typed or pasted in.
//
// A typed 64-hex value could as well be a ticket id or an event id, and a ticket
// sent to one is lost for good. When the ledger can be read, such a value is
// refused if the ledger knows it as a ticket or an event.

import type { AccountId, EventId, TicketId, Ticketto } from "@ticketto/sdk";
import { accountFromReceiveCode } from "../receive/receive-code.ts";

export type ReceiverCheck =
  | { readonly ok: true; readonly account: AccountId }
  | {
      readonly ok: false;
      readonly problem: "malformed" | "own-account" | "ticket-id" | "event-id";
    };

const HEX64 = /^[0-9a-f]{64}$/;

export async function checkReceiver(
  input: string,
  holder: string,
  ledger: Pick<Ticketto, "getTicket" | "getEvent"> | null,
): Promise<ReceiverCheck> {
  const text = input.trim();
  const scanned = accountFromReceiveCode(text);
  const typed = text.replace(/\s+/g, "").toLowerCase();
  const account = scanned ?? (HEX64.test(typed) ? (typed as AccountId) : null);
  if (account === null) return { ok: false, problem: "malformed" };
  if (account === holder) return { ok: false, problem: "own-account" };
  if (scanned === null && ledger !== null) {
    const [ticket, event] = await Promise.all([
      ledger.getTicket(account as string as TicketId).catch(() => null),
      ledger.getEvent(account as string as EventId).catch(() => null),
    ]);
    if (ticket?.ok) return { ok: false, problem: "ticket-id" };
    if (event?.ok) return { ok: false, problem: "event-id" };
  }
  return { ok: true, account };
}
