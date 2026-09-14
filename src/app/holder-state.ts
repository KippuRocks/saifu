// What the app shows, from what the device holds (T-030-04).

import type { HolderRecord } from "../holder/store.ts";

export type HolderPhase =
  | { readonly kind: "loading" }
  | { readonly kind: "onboarding"; readonly failed: boolean }
  | { readonly kind: "provisioning" }
  | { readonly kind: "ready"; readonly account: string };

/**
 * A device with no record onboards. A device whose passkey exists but whose
 * registration or link did not finish also onboards again: setting up resumes
 * with the same passkey rather than creating another.
 */
export function phaseFor(
  record: HolderRecord | null,
  account: string | null,
  now: number,
): HolderPhase {
  if (record === null || account === null || !record.registered) {
    return { kind: "onboarding", failed: false };
  }
  const session = record.kippuSession;
  if (session === undefined || session.expiresAt <= now) {
    return { kind: "onboarding", failed: false };
  }
  return { kind: "ready", account };
}
