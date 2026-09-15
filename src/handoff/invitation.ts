// Redeeming a guest invitation (T-030-10; US-B2; F-021 plan §5.6).
//
// An organiser's invitation link opens Saifu with a token. In the holder's
// session Saifu redeems it (`events.invitations.redeem`); Kippu issues the
// class's ticket to the holder's account, and Saifu waits for its derived copy to
// reflect the issuance (`derived.waitFor`) before showing the ticket.

import type { AppRouter, InvitationRefusal } from "@kippu/api";
import type { inferRouterOutputs } from "@trpc/server";
import { refusalOf } from "../kippu/errors.ts";

type Outputs = inferRouterOutputs<AppRouter>;
export type RedeemedInvitation = Outputs["events"]["invitations"]["redeem"];

export interface InvitationApi {
  readonly events: {
    readonly invitations: {
      readonly redeem: { mutate(input: { token: string }): Promise<RedeemedInvitation> };
    };
  };
  readonly derived: {
    readonly waitFor: {
      query(input: { cursor: string; timeout: number }): Promise<{ readonly reached: boolean }>;
    };
  };
}

export type InvitationOutcome =
  | {
      readonly ok: true;
      readonly ticket: string;
      readonly event: string;
      /** Whether Kippu's copy shows the ticket yet; if not, it will shortly. */
      readonly visible: boolean;
    }
  | {
      readonly ok: false;
      readonly failure: InvitationFailure;
      readonly errorCode: string | null;
    };

/**
 * Why an invitation was not redeemed: kippu-api's documented reason, or — for a
 * refusal it gives no reason for — `refused`, `session` (the holder's Kippu
 * session ended: link the account again) or `unavailable` (no answer).
 */
export type InvitationFailure = InvitationRefusal | "refused" | "session" | "unavailable";

/** Every reason `events.invitations.redeem` documents; the record fails to compile if one is missing. */
const REFUSALS: Record<InvitationRefusal, true> = {
  "unknown-invitation": true,
  "already-redeemed": true,
  "seat-held": true,
  "seat-taken": true,
  "sold-out": true,
  "class-sold-out": true,
};

function isRefusal(reason: string | null): reason is InvitationRefusal {
  return reason !== null && Object.hasOwn(REFUSALS, reason);
}

/** Whether the invitation stays open after this failure, so the guest can try again later. */
export function invitationStaysOpen(failure: InvitationFailure): boolean {
  return failure !== "unknown-invitation" && failure !== "already-redeemed";
}

/** `derived.waitFor` waits at most 10 s per call. */
const WAIT_MS = 10_000;

export async function redeemInvitation(
  kippu: InvitationApi,
  token: string,
  options: { readonly waits?: number } = {},
): Promise<InvitationOutcome> {
  let redeemed: RedeemedInvitation;
  try {
    redeemed = await kippu.events.invitations.redeem.mutate({ token });
  } catch (error) {
    const { code, errorCode, reason } = refusalOf(error);
    const failure: InvitationFailure = isRefusal(reason)
      ? reason
      : code === "NOT_FOUND"
        ? "unknown-invitation"
        : code === "UNAUTHORIZED"
          ? "session"
          : code === null
            ? "unavailable"
            : "refused";
    return { ok: false, failure, errorCode };
  }
  let visible = false;
  for (let i = 0; i < (options.waits ?? 3) && !visible; i++) {
    try {
      visible = (await kippu.derived.waitFor.query({ cursor: redeemed.cursor, timeout: WAIT_MS }))
        .reached;
    } catch {
      break;
    }
  }
  return { ok: true, ticket: redeemed.ticket, event: redeemed.event, visible };
}
