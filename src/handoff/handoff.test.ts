import { describe, expect, it } from "vitest";
import { matches } from "../../tools/copy-lint/vocabulary.ts";
import {
  CHECKOUT_COPY,
  INVITATION_COPY,
  INVITATION_REFUSAL_COPY,
  PENDING_LINK_COPY,
  SESSION_ENDED,
} from "../copy/links.ts";
import { type CheckoutHandoffApi, type HandoffLink, linkCheckoutHandoff } from "./checkout.ts";
import { type InvitationApi, invitationStaysOpen, redeemInvitation } from "./invitation.ts";

const refusal = (code: string, errorCode: string | null = null, reason: string | null = null) =>
  Object.assign(new Error(code), { data: { code, errorCode, reason } });

const EVENT = "22".repeat(32);
const CLASS = "33".repeat(32);

function checkoutApi(
  link: HandoffLink | Error,
  reads: "ok" | "fail" = "ok",
): CheckoutHandoffApi & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    sales: {
      checkout: {
        link: {
          mutate: async ({ handoffToken }) => {
            calls.push(handoffToken);
            if (link instanceof Error) throw link;
            return link;
          },
        },
      },
      inventory: {
        query: async () => {
          if (reads === "fail") throw new Error("down");
          return {
            event: EVENT,
            onSale: true,
            available: 10,
            classes: [
              {
                id: CLASS,
                name: "Stalls",
                description: null,
                policy: { kind: "Single" },
                available: 5,
              },
            ],
            zones: [],
          } as never;
        },
      },
    },
    derived: {
      events: {
        get: {
          query: async () => {
            if (reads === "fail") throw new Error("down");
            return { event: { metadata: { name: "Opening night" } }, freshness: {} } as never;
          },
        },
      },
    },
  };
}

const link: HandoffLink = {
  event: EVENT,
  zone: "44".repeat(32),
  class: CLASS,
  placement: { kind: "Seated", position: "A-1" },
  pairingCode: "042917",
};

describe("T-030-10 checkout handoff", () => {
  it("AC-B4.1: links the holder's account with the handoff token and shows the pairing code", async () => {
    const api = checkoutApi(link);
    const outcome = await linkCheckoutHandoff(api, "t".repeat(43));
    expect(api.calls).toEqual(["t".repeat(43)]);
    expect(outcome).toEqual({
      ok: true,
      summary: {
        pairingCode: "042917",
        event: "Opening night",
        ticketClass: "Stalls",
        place: "Seat A-1",
      },
    });
  });

  it("shows the code even when what is being bought cannot be read", async () => {
    const outcome = await linkCheckoutHandoff(checkoutApi(link, "fail"), "t".repeat(43));
    expect(outcome).toEqual({
      ok: true,
      summary: { pairingCode: "042917", event: null, ticketClass: null, place: "Seat A-1" },
    });
  });

  it("names each refusal", async () => {
    const cases: [Error, string][] = [
      [refusal("NOT_FOUND"), "unknown"],
      [refusal("CONFLICT"), "another-account"],
      [refusal("UNAUTHORIZED"), "session"],
      [new Error("network"), "unavailable"],
    ];
    for (const [error, failure] of cases) {
      expect(await linkCheckoutHandoff(checkoutApi(error), "t".repeat(43))).toEqual({
        ok: false,
        failure,
      });
    }
  });
});

function invitationApi(
  redeem: Error | "ok",
  reached: boolean[] = [true],
): InvitationApi & { waits: number } {
  const api = {
    waits: 0,
    events: {
      invitations: {
        redeem: {
          mutate: async () => {
            if (redeem instanceof Error) throw redeem;
            return { ticket: "11".repeat(32), cursor: "12", event: EVENT, class: CLASS };
          },
        },
      },
    },
    derived: {
      waitFor: {
        query: async () => ({ reached: reached[api.waits++] ?? false }),
      },
    },
  };
  return api;
}

describe("T-030-10 invitations", () => {
  it("US-B2: redeems the invitation and waits for Kippu's copy to show the ticket", async () => {
    const api = invitationApi("ok", [false, true]);
    expect(await redeemInvitation(api, "t".repeat(43))).toEqual({
      ok: true,
      ticket: "11".repeat(32),
      event: EVENT,
      visible: true,
    });
    expect(api.waits).toBe(2);
  });

  it("reports a ticket Kippu's copy does not show yet", async () => {
    const api = invitationApi("ok", [false, false, false]);
    const outcome = await redeemInvitation(api, "t".repeat(43));
    expect(outcome.ok && outcome.visible).toBe(false);
  });

  it("names each refusal kippu-api gives a reason for", async () => {
    const cases: [Error, string, string | null][] = [
      [refusal("NOT_FOUND", null, "unknown-invitation"), "unknown-invitation", null],
      [refusal("CONFLICT", null, "already-redeemed"), "already-redeemed", null],
      [refusal("CONFLICT", null, "seat-held"), "seat-held", null],
      [refusal("CONFLICT", "ERR-TicketIdExists", "seat-taken"), "seat-taken", "ERR-TicketIdExists"],
      [
        refusal("BAD_REQUEST", "ERR-CapacityExceeded", "sold-out"),
        "sold-out",
        "ERR-CapacityExceeded",
      ],
      [
        refusal("BAD_REQUEST", "ERR-ClassQuotaExceeded", "class-sold-out"),
        "class-sold-out",
        "ERR-ClassQuotaExceeded",
      ],
    ];
    for (const [error, failure, errorCode] of cases) {
      expect(await redeemInvitation(invitationApi(error), "t".repeat(43))).toEqual({
        ok: false,
        failure,
        errorCode,
      });
    }
  });

  it("falls back on the transport code when there is no reason Saifu knows", async () => {
    const cases: [Error, string][] = [
      [refusal("NOT_FOUND"), "unknown-invitation"],
      [refusal("CONFLICT", null, "some-future-reason"), "refused"],
      [refusal("BAD_REQUEST", "ERR-EventCancelled"), "refused"],
      [refusal("UNAUTHORIZED"), "session"],
      [new Error("network"), "unavailable"],
    ];
    for (const [error, failure] of cases) {
      const outcome = await redeemInvitation(invitationApi(error), "t".repeat(43));
      expect(!outcome.ok && outcome.failure).toBe(failure);
    }
  });

  it("says to try again later exactly where the invitation stays open", () => {
    for (const [failure, message] of Object.entries(INVITATION_REFUSAL_COPY)) {
      if (failure === "unavailable" || failure === "refused") continue;
      const open = invitationStaysOpen(failure as keyof typeof INVITATION_REFUSAL_COPY);
      expect(/try again later/i.test(message), failure).toBe(open);
    }
    expect(invitationStaysOpen("unknown-invitation")).toBe(false);
    expect(invitationStaysOpen("already-redeemed")).toBe(false);
    expect(invitationStaysOpen("seat-held")).toBe(true);
  });

  it("REQ-TM-2, REQ-SP-1a: the copy passes the copy lint", () => {
    const text = [
      ...Object.values(CHECKOUT_COPY),
      ...Object.values(INVITATION_COPY),
      ...Object.values(INVITATION_REFUSAL_COPY),
      ...Object.values(PENDING_LINK_COPY),
      SESSION_ENDED,
    ].join("\n");
    expect(matches(text)).toEqual([]);
  });
});
