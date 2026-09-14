// The V0 challenger for papi-signers' WebAuthn authenticator
// (features/003-profile-v0/plan.md §5.7).
//
// papi-signers calls one challenger for both ceremonies: with the holder's
// account on `register`, and with the bytes to sign on `authenticate`. On
// Kreivo it mixes in a block hash; the hosted ledger has no blocks, so the V0
// context is 0 and:
//   - a registration's challenge is BLAKE2b-256("ticketto/v0/registration" ‖ account);
//   - every other challenge is BLAKE2b-256(payload), where the payload is a
//     profile signing payload that already carries its own domain tag.
// The registration tag is applied on registration only, so a ceremony must say
// which one it is running.

import { blake2b256, registrationChallenge } from "@ticketto/profile-v0";
import type { AccountId } from "@ticketto/sdk";
import type { Challenger } from "@virtonetwork/signer";

export type Ceremony = "register" | "authenticate";

export interface V0Challenger {
  readonly challenger: Challenger<number>;
  /** Runs `ceremony` with the challenger set to it; ceremonies never overlap. */
  run<T>(ceremony: Ceremony, work: () => Promise<T>): Promise<T>;
}

const HEX = "0123456789abcdef";

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += HEX.charAt(byte >> 4) + HEX.charAt(byte & 15);
  return out;
}

export function v0Challenger(): V0Challenger {
  let current: Ceremony | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  const challenger: Challenger<number> = (_context, bytes) => {
    switch (current) {
      case "register":
        return registrationChallenge(toHex(bytes) as AccountId);
      case "authenticate":
        return blake2b256(bytes);
      default:
        throw new Error("a passkey challenge was requested outside a ceremony");
    }
  };

  return {
    challenger,
    run(ceremony, work) {
      const next = queue.then(async () => {
        current = ceremony;
        try {
          return await work();
        } finally {
          current = null;
        }
      });
      queue = next.catch(() => {});
      return next;
    },
  };
}
