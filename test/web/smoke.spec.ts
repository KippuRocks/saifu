import { expect, test } from "@playwright/test";
import { CAMERA_RECEIVER } from "./camera.ts";
import { DIST, saifuWeb, virtualAuthenticator } from "./stack.ts";

test.beforeAll(async () => {
  const { existsSync } = await import("node:fs");
  if (!existsSync(`${DIST}/index.html`))
    throw new Error("no web build: run `pnpm web:build` first");
});

test("T-030-18: Saifu Web onboards with a passkey, registers, and shows the checkout pairing code", async ({
  context,
  page,
}, testInfo) => {
  const stack = await saifuWeb(context);
  const authenticator = await virtualAuthenticator(page);
  const checkout = stack.kippu.beginCheckout();

  // Ichiba's handoff link opens Saifu Web; the holder is not set up yet.
  await page.goto(`${stack.origin}/checkout#${checkout.handoffToken}`);
  const onboarding = page.locator('[data-screen="holder.onboarding"]');
  await expect(onboarding).toBeVisible();
  await expect(page.getByTestId("holder.onboarding.settled")).toBeAttached();
  await expect(page.getByTestId("holder.onboarding.pending-link")).toBeVisible();
  await expect(page.getByTestId("recovery-disclosure")).toBeVisible();
  // The token is not left in the address bar, or in the browser's history.
  expect(page.url()).toBe(`${stack.origin}/`);
  await testInfo.attach("holder.onboarding", {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  // REQ-SP-4: one passkey, bound to the holder RP id, registered on the ledger and
  // linked to Kippu — the link verifies the proof of control against the
  // credential the ledger records. Then the handoff continues to the pairing code.
  await page.getByTestId("onboarding-set-up").click();
  await expect(page.locator('[data-screen="checkout.link"]')).toBeVisible();
  await expect(page.getByTestId("checkout.link.pairing-code")).toHaveText(checkout.pairingCode);
  await expect(page.getByTestId("checkout.link.settled")).toBeAttached();
  await testInfo.attach("checkout.link", {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  const credentials = await authenticator.credentials();
  expect(credentials).toHaveLength(1);
  expect(credentials[0]).toMatchObject({ rpId: stack.rpId, isResidentCredential: true });
  const account = stack.kippu.linkedAccount(checkout.handoffToken);
  expect(account).toMatch(/^[0-9a-f]{64}$/);

  // The holder record is kept in IndexedDB: a reload resumes the linked holder,
  // with no second passkey.
  await page.reload();
  await expect(page.locator('[data-screen="tickets.list"]')).toBeVisible();
  expect(await authenticator.credentials()).toHaveLength(1);
});

test("T-030-18: Saifu Web scans a receive code with the camera, and REQ-FR-3's warning precedes signing", async ({
  context,
  page,
}) => {
  const stack = await saifuWeb(context);
  await virtualAuthenticator(page);
  const holding = stack.grantTickets();

  await page.goto(`${stack.origin}/`);
  await page.getByTestId("onboarding-set-up").click();
  await expect(page.locator('[data-testid^="holding-"]')).toBeVisible();
  const { ticket } = await holding();

  await page.getByTestId(`holding-${ticket}`).click();
  await page.getByTestId("ticket-detail-transfer").click();
  await expect(page.locator('[data-screen="ticket.transfer"]')).toBeVisible();

  // US-D1: the camera reads the receive code, and fills the receiver.
  await page.getByTestId("ticket-transfer-scan").click();
  await expect(page.locator('[data-screen="ticket.transfer.warning"]')).toBeVisible();
  await expect(page.getByTestId("ticket.transfer.warning.body")).toBeVisible();

  // REQ-FR-3: nothing is signed before the holder confirms; then the transfer is
  // signed with the passkey, sponsored, and recorded on the ledger.
  expect((await stack.ledger.getTicket(ticket as never)).ok && true).toBe(true);
  await page.getByTestId("ticket.transfer.warning.confirm").click();
  await expect(page.getByTestId("ticket.transfer.sending.finish")).toBeVisible();
  const moved = await stack.ledger.getTicket(ticket as never);
  expect(moved.ok ? moved.value.holder : null).toBe(CAMERA_RECEIVER);
});
