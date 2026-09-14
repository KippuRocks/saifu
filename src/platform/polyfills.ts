// Web platform APIs Hermes does not provide. `install-polyfills.ts` installs
// them before anything else runs (index.ts imports it first).
//
// - `crypto.getRandomValues` — the profile draws pass ids and operation ids from
//   it, and Saifu the holder's random `userId` (features/003-profile-v0/plan.md
//   §5.7). Backed by the platform's secure random source through expo-crypto.
// - `crypto.subtle.digest("SHA-256")` — papi-signers' WebAuthn authenticator
//   hashes the user id with it. Backed by @noble/hashes; no other algorithm or
//   subtle operation is provided.
// - `TextDecoder` — `scale-ts` decodes strings with it. Expo's runtime installs
//   it; this module only checks it is there, with `TextEncoder`, which Hermes has.

import { sha256 } from "@noble/hashes/sha2.js";

type Subtle = Pick<SubtleCrypto, "digest">;

/** Fills `bytes` from the platform's cryptographically secure random source. */
export type RandomSource = (bytes: Uint8Array) => void;

export function installPolyfills(target: typeof globalThis, fillRandom: RandomSource): void {
  const scope = target as { crypto?: Partial<Crypto> };
  const crypto: Partial<Crypto> = scope.crypto ?? {};
  if (scope.crypto === undefined) {
    Object.defineProperty(target, "crypto", { value: crypto, configurable: true });
  }

  if (typeof crypto.getRandomValues !== "function") {
    Object.defineProperty(crypto, "getRandomValues", {
      value: <T extends ArrayBufferView | null>(array: T): T => {
        if (!(array instanceof Uint8Array) && !(array instanceof Uint32Array)) {
          // Only the integer arrays WebCrypto accepts, narrowed to those the app uses.
          throw new TypeError("getRandomValues: expected a Uint8Array or Uint32Array");
        }
        const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        fillRandom(bytes);
        return array;
      },
      configurable: true,
    });
  }

  if (typeof crypto.subtle?.digest !== "function") {
    const subtle: Subtle = {
      digest: async (algorithm, data) => {
        const name = typeof algorithm === "string" ? algorithm : algorithm.name;
        if (name.toUpperCase() !== "SHA-256") {
          throw new TypeError(`crypto.subtle.digest: ${name} is not supported`);
        }
        const view = ArrayBuffer.isView(data)
          ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
          : new Uint8Array(data);
        return sha256(view).slice().buffer as ArrayBuffer;
      },
    };
    Object.defineProperty(crypto, "subtle", { value: subtle, configurable: true });
  }

  for (const name of ["TextEncoder", "TextDecoder"] as const) {
    if (typeof (target as Record<string, unknown>)[name] !== "function") {
      throw new Error(`${name} is missing from the JavaScript runtime`);
    }
  }
}
