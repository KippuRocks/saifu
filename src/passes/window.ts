// The validity window of a ticket's passes (T-030-17; NFR-5, REQ-AP-3).
//
// The window is the event's: kippu-api's derived copy carries it with every
// event and every holding (`passWindow`), as the organiser set it or NFR-5's
// 60 s default, within the ledger's maximum. The holdings cache keeps it with
// the holding, so a pass produced offline uses the last window Saifu saw; with
// none, or one that is not a usable duration, the default applies.

import { DEFAULT_PASS_WINDOW } from "@ticketto/profile-v0";
import type { LoadedHoldings } from "../holdings/load.ts";

/** The ledger's maximum pass window: kippu-api never reports a longer one. */
export const MAXIMUM_PASS_WINDOW = 5 * 60 * 1000;

interface WindowSource {
  readonly event: { readonly passWindow?: { readonly windowMs?: unknown } } | null;
  readonly ticket: { readonly id: string };
}

/** The window of passes for `ticket`, from what the device last read about its event. */
export function passWindowFor(loaded: LoadedHoldings | null, ticket: string): number {
  if (loaded === null || loaded.source === "none") return DEFAULT_PASS_WINDOW;
  const holdings: readonly WindowSource[] = loaded.entry.read.holdings;
  const windowMs = holdings.find((h) => h.ticket.id === ticket)?.event?.passWindow?.windowMs;
  return typeof windowMs === "number" &&
    Number.isSafeInteger(windowMs) &&
    windowMs > 0 &&
    windowMs <= MAXIMUM_PASS_WINDOW
    ? windowMs
    : DEFAULT_PASS_WINDOW;
}
