// Adding a second device, on the existing phone (T-030-13; REQ-CP-6).
//
// The existing phone scans the new phone's registration and, before anything is
// signed, shows a full-screen confirmation: this gives another phone full
// control of every ticket, and cannot be undone — with the short code to
// compare. Only on confirmation does it sign `registerCredential` with its own
// credential, sponsored and submitted directly to the ledger.

import { registrationAccount } from "@ticketto/profile-v0";
import type { AccountId, Receipt, Registration, Result, Signer, Ticketto } from "@ticketto/sdk";
import { shortCode } from "./codes.ts";

export type AddDeviceStep =
  | { readonly kind: "confirm"; readonly shortCode: string }
  | { readonly kind: "signing" }
  | { readonly kind: "done"; readonly receipt: Receipt }
  | {
      readonly kind: "failed";
      /** A §10 code; `cancelled` when the passkey prompt was dismissed; `already-registered`. */
      readonly code: string;
    };

export interface AddDeviceDeps {
  readonly ledger: Pick<Ticketto, "registerCredential" | "getCredential">;
  readonly signer: Signer;
  readonly onStep: (step: AddDeviceStep) => void;
}

export interface AddDeviceFlow {
  /** Shows the confirmation. Nothing is signed. */
  begin(): Promise<void>;
  /** The holder confirmed: sign and submit. */
  confirm(): Promise<void>;
}

export function addDeviceFlow(
  account: AccountId,
  registration: Registration,
  deps: AddDeviceDeps,
): AddDeviceFlow {
  let confirmable = false;
  let started = false;
  return {
    async begin() {
      const named = registrationAccount(registration);
      if (!named.ok || named.value.account !== account) {
        deps.onStep({ kind: "failed", code: "ERR-InvalidAuthorisation" });
        return;
      }
      const existing = await deps.ledger
        .getCredential(account, named.value.credential)
        .catch(() => null);
      if (existing?.ok && existing.value !== null) {
        deps.onStep({ kind: "failed", code: "already-registered" });
        return;
      }
      confirmable = true;
      deps.onStep({ kind: "confirm", shortCode: shortCode(registration) });
    },
    async confirm() {
      if (!confirmable || started) return;
      started = true;
      deps.onStep({ kind: "signing" });
      let submitted: Result<Receipt>;
      try {
        submitted = await deps.ledger.registerCredential(deps.signer, { account, registration });
      } catch {
        started = false;
        deps.onStep({ kind: "failed", code: "cancelled" });
        return;
      }
      if (!submitted.ok) {
        started = false;
        deps.onStep({ kind: "failed", code: submitted.error.code });
        return;
      }
      deps.onStep({ kind: "done", receipt: submitted.value });
    },
  };
}
