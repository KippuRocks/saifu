// The ledger for holder tests: the SDK over `backend-memory`, the reference
// backend, sponsored by a local software sponsor (backend-memory verifies no
// sponsorship). The code under test is Saifu's own SDK factory.

import { issueSponsorship, kmsP256Signer } from "@kippu/sponsorship";
import { softwareKmsP256Key } from "@kippu/sponsorship/testing";
import { createMemoryBackend } from "@ticketto/backend-memory";
import { createProfileV0 } from "@ticketto/profile-v0";
import type { Sponsor, Ticketto } from "@ticketto/sdk";
import { saifuTicketto } from "../src/ledger/ticketto.ts";

export function localSponsor(): Sponsor {
  const signer = kmsP256Signer(softwareKmsP256Key());
  return {
    async sponsor(input) {
      return { ok: true, value: await issueSponsorship(signer, input, { notionalCost: 0n }) };
    },
  };
}

export function memoryLedger(rpId: string): Ticketto {
  return saifuTicketto({
    backend: createMemoryBackend({ profile: createProfileV0({ rpId }) }),
    sponsor: localSponsor(),
    rpId,
  });
}
