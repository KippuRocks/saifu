// A held ticket as the holder reads it (T-030-05; AC-B2.6, REQ-SDK-6).
//
// Everything but the class name and the event's name is a ledger fact from
// Kippu's copy. The class name is Kippu's (`REQ-TC-2`): through Kippu a press
// pass reads as "Press"; without Kippu only its provenance, policy and
// restrictions are legible (T-030-06).

import type { AssuranceDeclaration } from "@ticketto/sdk";
import { type AssuranceLevel, assuranceLevel } from "./assurance.ts";
import type { EventView, HoldingView, TicketView } from "./types.ts";

export interface TicketDetail {
  readonly id: string;
  /** The class's name, or a plain fallback when Kippu holds no definition. */
  readonly title: string;
  readonly event: string;
  readonly eventStatus: string;
  readonly place: string;
  readonly provenance: string;
  readonly policy: string;
  readonly restrictions: string;
  readonly attendances: string;
  /** `null` until the ledger's declaration is known. */
  readonly assurance: AssuranceLevel | null;
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

const short = (id: string) => `${id.slice(0, 8)}…`;

export function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function className(ticket: TicketView): string | null {
  return ticket.kippuClass?.name ?? text(ticket.classMetadata?.name) ?? null;
}

export function eventName(event: EventView | null, id: string): string {
  return text(event?.metadata?.name) ?? `Event ${short(id)}`;
}

export function provenanceText(provenance: TicketView["provenance"]): string {
  return provenance === "Granted" ? "Granted by the organiser" : "Purchased";
}

export function policyText(policy: TicketView["policy"]): string {
  const until = (ms: number | null) => (ms === null ? "" : `, until ${formatDate(ms)}`);
  switch (policy.kind) {
    case "Single":
      return "Admits once";
    case "Multiple":
      return `Admits up to ${policy.max} times${until(policy.until)}`;
    case "Unlimited":
      return `Admits any number of times${until(policy.until)}`;
    default:
      return "Admission policy not recognised";
  }
}

export function restrictionsText(restrictions: TicketView["restrictions"]): string {
  if (restrictions.cannotTransfer) return "Cannot be transferred or resold";
  if (restrictions.cannotResale) return "Can be transferred, but not resold";
  return "Can be transferred and resold";
}

export function attendancesText(count: number): string {
  if (count === 0) return "Not used yet";
  return count === 1 ? "Used once" : `Used ${count} times`;
}

/**
 * A seat as the organiser designated it. Kippu records a designation on the
 * ledger as its UTF-8 bytes (features/021 plan §5.3), which reach Saifu as hex;
 * a position that is not such text is shown as it is.
 */
export function seatText(position: string): string {
  if (/^(?:[0-9a-f]{2})+$/.test(position)) {
    const bytes = new Uint8Array(position.length / 2);
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = Number.parseInt(position.slice(2 * i, 2 * i + 2), 16);
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.trim() !== "" && !/\p{Cc}/u.test(text)) return text;
    } catch {
      // Not UTF-8: fall through to the raw position.
    }
  }
  return position;
}

export function placeText(placement: TicketView["placement"]): string {
  return placement.kind === "Seated" ? `Seat ${seatText(placement.position)}` : "General admission";
}

export function statusText(status: EventView["status"] | undefined): string {
  switch (status) {
    case "Active":
      return "Active";
    case "Sealed":
      return "Active; no more tickets are being issued";
    case "Cancelled":
      return "Cancelled";
    case "Finished":
      return "Finished";
    default:
      return "Status unknown";
  }
}

export function ticketDetail(
  holding: HoldingView,
  declaration: AssuranceDeclaration | null,
): TicketDetail {
  const { ticket, event } = holding;
  return {
    id: ticket.id,
    title: className(ticket) ?? "Ticket",
    event: eventName(event, ticket.event),
    eventStatus: statusText(event?.status),
    place: placeText(ticket.placement),
    provenance: provenanceText(ticket.provenance),
    policy: policyText(ticket.policy),
    restrictions: restrictionsText(ticket.restrictions),
    attendances: attendancesText(ticket.attendances),
    assurance: declaration === null ? null : assuranceLevel(declaration),
  };
}
