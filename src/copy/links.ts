// Copy for the links into Saifu (T-030-10): the checkout handoff and invitations.

export const CHECKOUT_COPY = {
  title: "Pair with your checkout",
  linking: "Linking your account to the checkout…",
  codeLabel: "Pairing code",
  instruction:
    "Check that the checkout page shows the same code, then confirm it there. If the codes differ, do not confirm.",
  unknown:
    "This checkout link no longer works. It may have expired, or been replaced. Start again from the checkout page.",
  anotherAccount: "This checkout is already paired with another Saifu account.",
  unavailable: "Kippu cannot be reached right now. Try the link again in a moment.",
  done: "Back to your tickets",
} as const;

export const INVITATION_COPY = {
  title: "Your invitation",
  redeeming: "Accepting your invitation…",
  waiting: "Your ticket is being issued. It will appear in your tickets shortly.",
  done: "Back to your tickets",
} as const;

/** Why an invitation could not be accepted, one message per reason (T-030-10). */
export const INVITATION_REFUSAL_COPY = {
  "unknown-invitation": "This invitation link is not valid. Ask the organiser for a new one.",
  "already-redeemed": "This invitation has already been used.",
  "seat-held":
    "Someone is buying the seat on this invitation right now. Your invitation is still open: try again later.",
  "seat-taken":
    "The seat on this invitation already has a ticket. Your invitation is still open: try again later, or ask the organiser.",
  "sold-out":
    "The event has no places left right now. Your invitation is still open: try again later.",
  "class-sold-out":
    "No more tickets of this kind can be issued right now. Your invitation is still open: try again later.",
  refused:
    "Your invitation could not be accepted right now. Try again later, or ask the organiser.",
  unavailable: "Kippu cannot be reached right now. Try the link again in a moment.",
} as const;

export const SESSION_ENDED = "Your Kippu session has ended. Set up again to continue.";

/** Shown at onboarding when a link opened Saifu before it was set up. */
export const PENDING_LINK_COPY = {
  checkout: "Set up Saifu first. Your checkout continues right after.",
  invitation: "Set up Saifu first. Your invitation opens right after.",
} as const;
