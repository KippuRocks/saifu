// Degraded rendering from the ledger when Kippu is unreachable (T-030-06;
// REQ-MD-2, REQ-MD-3; features/030-saifu/plan.md §5.2).
//
// Kippu's copy is how Saifu finds the holder's tickets; the ledger answers no
// "tickets of an account" query (REQ-MG-5). So when Kippu cannot be reached,
// Saifu reads each ticket the device has cached straight from the ledger
// through the SDK, and renders it from ledger-native fields alone: event
// identity and status, attendance policy, restrictions, attendance count —
// plus provenance and placement. Nothing from Kippu, not even a cached class
// name or event document, is shown: the ledger attests nothing about them.
// Usable, just plain.

import type {
  AssuranceDeclaration,
  Event,
  EventId,
  Ticket,
  TicketId,
  Ticketto,
} from "@ticketto/sdk";
import { assuranceLevel } from "./assurance.ts";
import type { CachedHoldings } from "./cache.ts";
import {
  attendancesText,
  eventName,
  placeText,
  policyText,
  restrictionsText,
  statusText,
  type TicketDetail,
} from "./detail.ts";

export interface LedgerHolding {
  readonly ticket: Ticket;
  /** `null` when the ledger could not return the event. */
  readonly event: Event | null;
}

export type LedgerRead =
  | { readonly ok: true; readonly holdings: readonly LedgerHolding[] }
  /** The ledger could not be read either. */
  | { readonly ok: false; readonly code: string };

/**
 * Reads every cached ticket from the ledger. A ticket the ledger no longer shows
 * as the account's — transferred away since it was cached — is left out.
 */
export async function readCachedFromLedger(
  ledger: Pick<Ticketto, "getTicket" | "getEvent">,
  cached: CachedHoldings,
): Promise<LedgerRead> {
  const holdings: LedgerHolding[] = [];
  const events = new Map<string, Event | null>();
  for (const { ticket: view } of cached.read.holdings) {
    const ticket = await ledger.getTicket(view.id as TicketId);
    if (!ticket.ok) {
      if (ticket.error.code === "ERR-TicketNotFound") continue;
      return { ok: false, code: ticket.error.code };
    }
    if (ticket.value.holder !== cached.account) continue;
    let event = events.get(ticket.value.event);
    if (event === undefined) {
      const read = await ledger.getEvent(ticket.value.event as EventId);
      event = read.ok ? read.value : null;
      events.set(ticket.value.event, event);
    }
    holdings.push({ ticket: ticket.value, event });
  }
  return { ok: true, holdings };
}

export function provenanceTitle(provenance: Ticket["provenance"]): string {
  return provenance === "Granted" ? "Granted ticket" : "Purchased ticket";
}

/** A ticket rendered from ledger fields alone. */
export function ledgerTicketDetail(
  holding: LedgerHolding,
  declaration: AssuranceDeclaration | null,
): TicketDetail {
  const { ticket, event } = holding;
  return {
    id: ticket.id,
    title: provenanceTitle(ticket.provenance),
    event: eventName(null, ticket.event),
    eventStatus: statusText(event?.status),
    place: placeText(ticket.placement),
    provenance: ticket.provenance === "Granted" ? "Granted by the organiser" : "Purchased",
    policy: policyText(ticket.policy),
    restrictions: restrictionsText(ticket.restrictions),
    attendances: attendancesText(ticket.attendances),
    assurance: declaration === null ? null : assuranceLevel(declaration),
  };
}
