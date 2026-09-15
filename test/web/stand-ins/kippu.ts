// A stand-in for kippu-api, for the web smoke test: the tRPC procedures Saifu's
// onboarding and checkout handoff call, over HTTP as `@trpc/client` reaches the
// real server. Holder linking verifies the proof of control against the ledger
// stand-in's credential, as kippu-api does (`test/kippu-link-verifier.ts`); the
// checkout is reduced to a handoff token and its pairing code. The real journey,
// Ichiba to Saifu against the real kippu-api, is kippu-e2e's (F-070).

import type { Ticketto } from "@ticketto/sdk";
import { initTRPC, TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { HoldingsRead } from "../../../src/holdings/types.ts";
import { linkVerifier } from "../../kippu-link-verifier.ts";
import type { StandIn } from "./http.ts";

interface Checkout {
  readonly pairingCode: string;
  account: string | null;
}

const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

export function kippuStandIn(ledger: Ticketto, holderRpId: string) {
  const verifier = linkVerifier(ledger, holderRpId);
  const sessions = new Map<string, string>();
  const checkouts = new Map<string, Checkout>();
  let holdings: (account: string) => Promise<HoldingsRead> = async () => ({
    holdings: [],
    freshness: { cursor: "", records: 0, lastRecordedAt: 0 },
  });

  const t = initTRPC.context<{ readonly token: string | undefined }>().create();
  const holder = t.procedure.use(({ ctx, next }) => {
    const account = ctx.token === undefined ? undefined : sessions.get(ctx.token);
    if (account === undefined) throw new TRPCError({ code: "UNAUTHORIZED" });
    return next({ ctx: { account } });
  });

  const router = t.router({
    auth: t.router({
      holder: t.router({
        beginLink: t.procedure
          .input((value) => value as { account: string })
          .mutation(({ input }) => verifier.api.auth.holder.beginLink.mutate(input)),
        completeLink: t.procedure
          .input((value) => value as { challengeId: string; authorisation: string })
          .mutation(async ({ input }) => {
            try {
              const linked = await verifier.api.auth.holder.completeLink.mutate(input);
              sessions.set(linked.session.token, linked.holder.account);
              return linked;
            } catch (error) {
              throw new TRPCError({ code: "UNAUTHORIZED", cause: error });
            }
          }),
      }),
    }),
    derived: t.router({
      holdings: t.router({
        mine: holder.query(({ ctx }) => holdings(ctx.account)),
      }),
      // The stand-in's copy is read straight from the ledger: always caught up.
      waitFor: t.procedure
        .input((value) => value as { cursor: string; timeout: number })
        .query(({ input }) => ({
          reached: true,
          freshness: { cursor: input.cursor, records: 0, lastRecordedAt: 0 },
        })),
    }),
    sales: t.router({
      checkout: t.router({
        link: holder
          .input((value) => value as { handoffToken: string })
          .mutation(({ ctx, input }) => {
            const checkout = checkouts.get(input.handoffToken);
            if (checkout === undefined) throw new TRPCError({ code: "NOT_FOUND" });
            if (checkout.account !== null && checkout.account !== ctx.account) {
              throw new TRPCError({ code: "CONFLICT" });
            }
            checkout.account = ctx.account;
            return {
              event: randomHex(32),
              zone: randomHex(32),
              class: randomHex(32),
              placement: { kind: "Unseated" as const },
              pairingCode: checkout.pairingCode,
            };
          }),
      }),
    }),
  });

  const standIn: StandIn = async ({ method, url, headers, body }) => {
    const request = new Request(url, {
      method,
      headers,
      ...(body === null || method === "GET" ? {} : { body }),
    });
    const response = await fetchRequestHandler({
      endpoint: "/v0/trpc",
      req: request,
      router,
      createContext: () => ({
        token: /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1],
      }),
    });
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    };
  };

  return {
    standIn,
    /** Ichiba's half, reduced: a checkout with no holder account, handed off to Saifu. */
    beginCheckout() {
      const handoffToken = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const pairingCode = String(
        100_000 + ((crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % 900_000),
      );
      checkouts.set(handoffToken, { pairingCode, account: null });
      return { handoffToken, pairingCode };
    },
    /** What `derived.holdings.mine` answers for a linked holder. */
    setHoldings(read: (account: string) => Promise<HoldingsRead>) {
      holdings = read;
    },
    /** Every account a holder session was issued for, once per link. */
    linkedAccounts: () => [...sessions.values()],
    /** The account a handoff token was linked to, if any. */
    linkedAccount: (handoffToken: string) => checkouts.get(handoffToken)?.account ?? null,
  };
}
