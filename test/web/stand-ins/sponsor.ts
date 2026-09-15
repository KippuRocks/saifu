// A stand-in for Kippu's sponsor relay (`POST /v0/sponsor`, kippu-api's
// docs/sponsor-relay.md), for the web smoke test: every input is sponsored by a
// software p256 key. The real relay decides entitlements from ledger facts;
// `backend-memory` verifies no sponsorship, so nothing here needs to.

import { issueSponsorship, kmsP256Signer } from "@kippu/sponsorship";
import { softwareKmsP256Key } from "@kippu/sponsorship/testing";
import { decodeSignedAccessPass, decodeSignedCommand } from "@ticketto/profile-v0";
import { fromHex, toHex } from "../../../src/holder/credential.ts";
import { json, type StandIn } from "./http.ts";

export function sponsorStandIn(): StandIn {
  const signer = kmsP256Signer(softwareKmsP256Key());
  return async ({ method, url, body }) => {
    if (method !== "POST" || url.pathname !== "/v0/sponsor") return { status: 404, body: "" };
    const { input } = JSON.parse(body ?? "null") as {
      input: { kind: "command" | "pass"; bytes: string };
    };
    const bytes = fromHex(input.bytes);
    const decoded =
      input.kind === "command" ? decodeSignedCommand(bytes) : decodeSignedAccessPass(bytes);
    if (!decoded.ok) return json(400, { error: { code: "malformed" } });
    const sponsorship = await issueSponsorship(signer, decoded.value, { notionalCost: 0n });
    return json(200, { sponsorship: toHex(sponsorship) });
  };
}
