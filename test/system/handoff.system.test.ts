// T-030-10 against the real system (see holder.system.test.ts for when it runs):
// Ichiba's half of the checkout — begin, read, confirm — is driven through
// kippu-api as Ichiba drives it; Saifu's half is Saifu's code.

import { afterEach, describe, expect, it } from "vitest";
import { linkCheckoutHandoff } from "../../src/handoff/checkout.ts";
import { redeemInvitation } from "../../src/handoff/invitation.ts";
import { holdingsCache, memoryKeyValueStorage } from "../../src/holdings/cache.ts";
import { loadHoldings } from "../../src/holdings/load.ts";
import { kippuClient } from "../../src/kippu/client.ts";
import { checkoutLink, invitationLink, parseSaifuLink } from "../../src/links/links.ts";
import { linkedHolder, organiser, randomId, stack, stackAvailable } from "./stack.ts";

const LINK_BASE = "https://saifu.kippu.example";

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

async function eventWith(provenance: "Purchased" | "Granted") {
  const organiserApi = await organiser();
  const zone = randomId();
  const { event } = await organiserApi.events.create.mutate({
    zones: [{ id: zone, kind: "Seated" }],
    capacity: 50,
    saleAsset: "COPM/2",
  });
  await organiserApi.events.zones.addSeatPositions.mutate({ event, zone, positions: ["B-7"] });
  const ticketClass = await organiserApi.events.classes.define.mutate({
    event,
    name: provenance === "Purchased" ? "Stalls" : "Artists' guests",
    description: null,
    provenance,
    policy: { kind: "Single" },
    restrictions: { cannotResale: false, cannotTransfer: false },
    quota: 10,
    price: provenance === "Purchased" ? 5_000_000 : null,
  });
  return { organiserApi, event, zone, ticketClass };
}

describe.skipIf(!stackAvailable)("T-030-10 against kippu-api and the ledger service", () => {
  it("AC-B4.1: Ichiba checkout continues with a linked account after the handoff", async () => {
    const { event, zone, ticketClass } = await eventWith("Purchased");
    const page = kippuClient({ url: stack.kippuUrl as string });

    // Ichiba: a buyer with no holder session begins a checkout, and gets a handoff.
    const begun = await page.sales.checkout.begin.mutate({
      event,
      zone,
      class: ticketClass.id,
      placement: { kind: "Seated", position: "B-7" },
    });
    const before = await page.sales.checkout.get.query({ token: begun.token });
    if (before.account.state !== "handoff") throw new Error(`account ${before.account.state}`);

    // The handoff reaches Saifu as a link; Saifu, set up and linked, links the checkout.
    const url = checkoutLink(LINK_BASE, before.account.handoff.handoffToken);
    const link = parseSaifuLink(url, { linkBase: LINK_BASE });
    if (link?.kind !== "checkout") throw new Error("not a checkout link");
    const { holder, kippu } = await linkedHolder();
    const outcome = await linkCheckoutHandoff(kippu, link.handoffToken);
    if (!outcome.ok) throw new Error(`handoff ${outcome.failure}`);
    expect(outcome.summary).toMatchObject({ ticketClass: "Stalls", place: "Seat B-7" });

    // Ichiba: the page shows the same code; the buyer confirms it there.
    const pairing = await page.sales.checkout.get.query({ token: begun.token });
    expect(pairing.account).toEqual({ state: "pairing", pairingCode: outcome.summary.pairingCode });
    const confirmed = await page.sales.checkout.confirmLink.mutate({
      token: begun.token,
      pairingCode: outcome.summary.pairingCode,
    });
    expect(confirmed.account).toEqual({ state: "linked", holder: holder.account });
  });

  it("the handoff refuses an unknown token and a checkout paired with another account", async () => {
    const { event, zone, ticketClass } = await eventWith("Purchased");
    const page = kippuClient({ url: stack.kippuUrl as string });
    const begun = await page.sales.checkout.begin.mutate({
      event,
      zone,
      class: ticketClass.id,
      placement: { kind: "Seated", position: "B-7" },
    });
    const read = await page.sales.checkout.get.query({ token: begun.token });
    if (read.account.state !== "handoff") throw new Error(read.account.state);
    const handoffToken = read.account.handoff.handoffToken;

    const first = await linkedHolder();
    expect((await linkCheckoutHandoff(first.kippu, handoffToken)).ok).toBe(true);
    const second = await linkedHolder();
    expect(await linkCheckoutHandoff(second.kippu, handoffToken)).toEqual({
      ok: false,
      failure: "another-account",
    });
    expect(await linkCheckoutHandoff(second.kippu, "A".repeat(43))).toEqual({
      ok: false,
      failure: "unknown",
    });
  });

  it("US-B2: an invitation link redeems in Saifu, and the ticket appears", async () => {
    const { organiserApi, event, zone, ticketClass } = await eventWith("Granted");
    const invitation = await organiserApi.events.invitations.create.mutate({
      event,
      class: ticketClass.id,
      zone,
      placement: { kind: "Seated", position: "B-7" },
      guest: "Band's drummer",
    });
    const link = parseSaifuLink(invitationLink(LINK_BASE, invitation.token), {
      linkBase: LINK_BASE,
    });
    if (link?.kind !== "invitation") throw new Error("not an invitation link");

    const { holder, kippu, ledger } = await linkedHolder();
    const redeemed = await redeemInvitation(kippu, link.token);
    if (!redeemed.ok) throw new Error(`redeem ${redeemed.failure}`);
    expect(redeemed.visible).toBe(true);

    const holdings = await loadHoldings({
      kippu,
      cache: holdingsCache(memoryKeyValueStorage()),
      account: holder.account,
      assurance: ledger.assurance(),
      ledger,
    });
    if (holdings.source !== "kippu") throw new Error(holdings.source);
    expect(holdings.entry.read.holdings.map((h) => h.ticket.id)).toContain(redeemed.ticket);

    // The same link again, and a link no invitation has.
    expect(await redeemInvitation(kippu, link.token)).toMatchObject({
      ok: false,
      failure: "already-redeemed",
    });
    expect(await redeemInvitation(kippu, "A".repeat(43))).toMatchObject({
      ok: false,
      failure: "unknown-invitation",
    });
  });

  it("a second invitation to a seat already issued is refused as seat-taken, and stays open", async () => {
    const { organiserApi, event, zone, ticketClass } = await eventWith("Granted");
    const invite = () =>
      organiserApi.events.invitations.create.mutate({
        event,
        class: ticketClass.id,
        zone,
        placement: { kind: "Seated", position: "B-7" },
        guest: null,
      });
    const [first, second] = [await invite(), await invite()];
    const guest = await linkedHolder();
    expect((await redeemInvitation(guest.kippu, first.token)).ok).toBe(true);
    const other = await linkedHolder();
    expect(await redeemInvitation(other.kippu, second.token)).toEqual({
      ok: false,
      failure: "seat-taken",
      errorCode: "ERR-TicketIdExists",
    });
    const listed = await organiserApi.events.invitations.list.query({
      event,
      class: ticketClass.id,
    });
    expect(listed.find((i) => i.id === second.invitation.id)?.status).toBe("open");
  });
});
