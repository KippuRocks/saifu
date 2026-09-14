// kippu-api's holder linking, as features/020-api-foundation/plan.md §5.1
// specifies it, over a ledger the test controls — for exercising Saifu's side
// of the exchange without a server. The same exchange runs against a real
// kippu-api in test/system/holder.system.test.ts.

import {
  accountOf,
  decodeAuthorisation,
  PROOF_OF_CONTROL_NONCE_LENGTH,
  verifyProofOfControl,
} from "@ticketto/profile-v0";
import type { AccountId, Authorisation, Ticketto } from "@ticketto/sdk";
import { fromHex, toHex } from "../src/holder/credential.ts";
import type { HolderLinkApi } from "../src/kippu/link.ts";

export const LOGIN_RP_ID = "login.kippu.example";
const AUDIENCE = new TextEncoder().encode(`kippu-api@${LOGIN_RP_ID}`);

export class LinkRefused extends Error {}

export function linkVerifier(ledger: Ticketto, holderRpId: string, now = () => Date.now()) {
  const challenges = new Map<string, { account: string; nonce: Uint8Array; expiresAt: number }>();
  const linked: string[] = [];

  const api = {
    auth: {
      holder: {
        beginLink: {
          mutate: async ({ account }: { account: string }) => {
            const nonce = crypto.getRandomValues(new Uint8Array(PROOF_OF_CONTROL_NONCE_LENGTH));
            const challengeId = crypto.randomUUID();
            const expiresAt = now() + 5 * 60 * 1000;
            challenges.set(challengeId, { account, nonce, expiresAt });
            return {
              challengeId,
              challenge: { audience: toHex(AUDIENCE), nonce: toHex(nonce), expiresAt, account },
            };
          },
        },
        completeLink: {
          mutate: async ({
            challengeId,
            authorisation,
          }: {
            challengeId: string;
            authorisation: string;
          }) => {
            const row = challenges.get(challengeId);
            challenges.delete(challengeId);
            if (row === undefined) throw new LinkRefused("unknown challenge");
            const bytes = fromHex(authorisation) as Authorisation;
            if (decodeAuthorisation(bytes).kind !== "passWebAuthn") throw new LinkRefused("kind");
            const claimed = accountOf(bytes);
            if (!claimed.ok || claimed.value.account !== row.account) {
              throw new LinkRefused("account");
            }
            const registered = await ledger.getCredential(
              claimed.value.account,
              claimed.value.credential,
            );
            if (!registered.ok || registered.value === null) throw new LinkRefused("unregistered");
            const verdict = verifyProofOfControl(
              {
                audience: AUDIENCE,
                nonce: row.nonce,
                expiresAt: row.expiresAt,
                account: row.account as AccountId,
              },
              bytes,
              registered.value,
              now(),
              { rpId: holderRpId },
            );
            if (!verdict.ok) throw new LinkRefused(verdict.failure);
            linked.push(row.account);
            return {
              session: {
                token: `token-${linked.length}`,
                expiresAt: new Date(now() + 1e9).toISOString(),
              },
              holder: { account: row.account },
            };
          },
        },
      },
    },
  };
  return { api: api as unknown as HolderLinkApi, linked };
}
