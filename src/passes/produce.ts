// Producing an access pass on the device (T-030-07; US-E1, AC-E1.1, NFR-3,
// NFR-5; features/030-saifu/plan.md §5.3).
//
// A pass needs only the ticket id and the holder's account, both cached, and is
// signed with the holder's passkey: `@ticketto/profile-v0`'s `producePass` is a
// pure function plus the `Signer`, so nothing here reaches a network. Each pass
// is its own passkey assertion, with user verification: the biometric prompt is
// the holder's authorisation for that pass.

import { DEFAULT_PASS_WINDOW, encodeSignedPass, producePass } from "@ticketto/profile-v0";
import type { AccountId, SignedAccessPass, Signer, TicketId } from "@ticketto/sdk";

export interface ProducedPass {
  readonly signed: SignedAccessPass;
  /** What the QR code carries. */
  readonly bytes: Uint8Array;
}

export interface PassOptions {
  /** The window's length: the event's (`passWindowFor`), else NFR-5's default of 60 s. */
  readonly window?: number;
  readonly now?: () => number;
}

export async function produceTicketPass(
  ticket: string,
  holder: Signer,
  options: PassOptions = {},
): Promise<ProducedPass> {
  const signed = await producePass(
    {
      ticket: ticket as TicketId,
      holder: holder.account as AccountId,
      notBefore: (options.now ?? Date.now)(),
      window: options.window ?? DEFAULT_PASS_WINDOW,
    },
    holder,
  );
  return { signed, bytes: encodeSignedPass(signed) };
}

/**
 * How long before a pass's window closes Saifu replaces it: time for the holder
 * to authorise the next one and for the gate to scan it, so the code on screen
 * is never one about to expire.
 */
export const REFRESH_MARGIN_MS = 10_000;

/**
 * When the pass on screen should be replaced: `REFRESH_MARGIN_MS` before its
 * window closes — or, for a window of 20 s or less, where that would leave the
 * code on screen for half its life or less, halfway through the window.
 */
export function refreshAt(pass: SignedAccessPass, margin = REFRESH_MARGIN_MS): number {
  const { notBefore, notAfter } = pass.pass;
  return Math.max(notBefore, notAfter - Math.min(margin, (notAfter - notBefore) / 2));
}
