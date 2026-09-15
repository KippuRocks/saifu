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

/** An organiser's event on `ledger`, with one granted ticket issued to `holder`. */
export async function grantTicket(
  ledger: Ticketto,
  holder: string,
  restrictions: { cannotResale: boolean; cannotTransfer: boolean },
) {
  const { softwareP256Signer } = await import("@ticketto/profile-v0/testing");
  const organiser = softwareP256Signer();
  const settled = async (p: PromiseLike<{ ok: boolean; error?: { code: string } }>) => {
    const r = await p;
    if (!r.ok) throw new Error(r.error?.code);
  };
  await settled(
    ledger.registerCredential(organiser.signer, {
      account: organiser.signer.account,
      registration: organiser.registration,
    }),
  );
  const zone = "44".repeat(32);
  const created = ledger.createEvent(organiser.signer, {
    salt: crypto.getRandomValues(new Uint8Array(32)),
    capacity: 10,
    zones: [{ id: zone as never, kind: "Unseated" }],
    metadata: null,
  });
  await settled(created.submission);
  const issued = ledger.issueTicket(organiser.signer, {
    event: created.id,
    class: "33".repeat(32) as never,
    holder: holder as never,
    zone: zone as never,
    placement: {
      kind: "Unseated",
      discriminator: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
        "hex",
      ) as never,
    },
    policy: { kind: "Single" },
    restrictions,
    provenance: "Granted",
    metadata: null,
  });
  await settled(issued.submission);
  return { event: created.id as string, ticket: issued.id as string };
}
