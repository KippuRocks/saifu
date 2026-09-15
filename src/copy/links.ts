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
  unknown: "This invitation link is not valid. Ask the organiser for a new one.",
  redeemed:
    "This invitation cannot be used. It has already been used, or its seat is being bought by someone else right now. If you have not used it, try again in a few minutes.",
  refused:
    "The organiser's ticket could not be issued to you. Ask the organiser about your invitation.",
  unavailable: "Kippu cannot be reached right now. Try the link again in a moment.",
  done: "Back to your tickets",
} as const;

export const SESSION_ENDED = "Your Kippu session has ended. Set up again to continue.";

/** Shown at onboarding when a link opened Saifu before it was set up. */
export const PENDING_LINK_COPY = {
  checkout: "Set up Saifu first. Your checkout continues right after.",
  invitation: "Set up Saifu first. Your invitation opens right after.",
} as const;
