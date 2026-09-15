// A ticket's assurance level, as a holder reads it (T-030-05; REQ-SDK-6,
// REQ-TM-2; SPEC.md §4.4).
//
// The ledger backend declares, per invariant, whether its rules enforce it or
// its operator merely attests it. Saifu shows the holder both lists, in plain
// words, and never calls anything trustless, tamper-proof or decentralised.
// The wording is keyed by every invariant id, so a new invariant fails to
// compile until it has been worded or deliberately left out.

import type { AssuranceDeclaration, InvariantId } from "@ticketto/sdk";

/** What each invariant means for a holder's ticket; `null` when it is not about one. */
export const HOLDER_GUARANTEES: Record<InvariantId, string | null> = {
  "INV-1": "The ticket belongs to its event, and to no other, for good.",
  "INV-2": "The ticket has exactly one holder at a time.",
  "INV-3": "Recorded attendances are never reset or reduced.",
  "INV-4": null,
  "INV-5": "The ticket is never admitted more times than its policy allows.",
  "INV-6": "Each access pass is accepted at most once.",
  "INV-7": null,
  "INV-8": "A ticket to a cancelled event cannot be used to get in.",
  "INV-10": "No new restriction is added to the ticket after it was issued.",
  "INV-11": null,
  "INV-12": "A purchased ticket is never restricted from resale or transfer.",
  "INV-13": "No other ticket exists for the same seat.",
  "INV-14": "Whether the ticket was purchased or granted never changes.",
  "INV-16": "Once the event is finished, nothing about the ticket changes.",
  "INV-15": null,
};

export const ASSURANCE_COPY = {
  heading: "What backs this ticket",
  enforced: "Enforced by the ledger's rules",
  attested: "Attested by Kippu",
  attestedNote:
    "Kippu runs the ledger this ticket is on. For the guarantees below, Kippu states that they hold, and nothing outside Kippu checks them yet.",
} as const;

export interface AssuranceLevel {
  readonly enforced: readonly string[];
  readonly attested: readonly string[];
}

export function assuranceLevel(declaration: AssuranceDeclaration): AssuranceLevel {
  const enforced: string[] = [];
  const attested: string[] = [];
  for (const [id, text] of Object.entries(HOLDER_GUARANTEES) as [InvariantId, string | null][]) {
    if (text === null) continue;
    // An invariant the backend does not declare is shown as attested, never as enforced.
    (declaration[id] === "enforced" ? enforced : attested).push(text);
  }
  return { enforced, attested };
}
