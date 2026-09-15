// The checkout handoff, Saifu's half (T-030-10; AD-19 A; F-022 plan §5.1).
//
// Ichiba hands a buyer without a holder account to Saifu with a handoff token.
// Saifu, in the holder's session, links the holder's account to the checkout
// (`sales.checkout.link`) and shows the 6-digit pairing code it gets back. The
// checkout page shows the same code, and the buyer confirms the match there:
// Saifu confirms nothing. What is being bought is shown beside the code, best
// effort, from public reads.

import type { AppRouter } from "@kippu/api";
import type { inferRouterOutputs } from "@trpc/server";
import { seatText } from "../holdings/detail.ts";
import { refusalOf } from "../kippu/errors.ts";

type Outputs = inferRouterOutputs<AppRouter>;
export type HandoffLink = Outputs["sales"]["checkout"]["link"];

export interface CheckoutHandoffApi {
  readonly sales: {
    readonly checkout: {
      readonly link: { mutate(input: { handoffToken: string }): Promise<HandoffLink> };
    };
    readonly inventory: {
      query(input: { event: string }): Promise<Outputs["sales"]["inventory"]>;
    };
  };
  readonly derived: {
    readonly events: {
      readonly get: {
        query(input: { event: string }): Promise<Outputs["derived"]["events"]["get"]>;
      };
    };
  };
}

export interface HandoffSummary {
  readonly pairingCode: string;
  /** The event's name, when its document gives one. */
  readonly event: string | null;
  /** The class's name, when the sale inventory lists it. */
  readonly ticketClass: string | null;
  readonly place: string;
}

export type HandoffOutcome =
  | { readonly ok: true; readonly summary: HandoffSummary }
  | {
      readonly ok: false;
      readonly failure: /** No checkout has this handoff token: expired, finished, or the link was discarded. */
        | "unknown"
        /** The checkout is already linked to another holder account. */
        | "another-account"
        /** The holder's Kippu session has ended: link the account again. */
        | "session"
        /** kippu-api did not answer, or refused for another reason. */
        | "unavailable";
    };

async function optional<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

export async function linkCheckoutHandoff(
  kippu: CheckoutHandoffApi,
  handoffToken: string,
): Promise<HandoffOutcome> {
  let link: HandoffLink;
  try {
    link = await kippu.sales.checkout.link.mutate({ handoffToken });
  } catch (error) {
    switch (refusalOf(error).code) {
      case "NOT_FOUND":
        return { ok: false, failure: "unknown" };
      case "CONFLICT":
        return { ok: false, failure: "another-account" };
      case "UNAUTHORIZED":
        return { ok: false, failure: "session" };
      default:
        return { ok: false, failure: "unavailable" };
    }
  }
  const [event, inventory] = await Promise.all([
    optional(() => kippu.derived.events.get.query({ event: link.event })),
    optional(() => kippu.sales.inventory.query({ event: link.event })),
  ]);
  const name = event?.event?.metadata?.name;
  return {
    ok: true,
    summary: {
      pairingCode: link.pairingCode,
      event: typeof name === "string" && name.trim() !== "" ? name.trim() : null,
      ticketClass: inventory?.classes.find((c) => c.id === link.class)?.name ?? null,
      place:
        link.placement.kind === "Seated"
          ? `Seat ${seatText(link.placement.position)}`
          : "General admission",
    },
  };
}
