import { expect, type Page, test } from "@playwright/test";
import { accountOf, decodePass, verifyPass } from "@ticketto/profile-v0";
import type { AccountId, CredentialId } from "@ticketto/sdk";
import jsQR from "jsqr";
import { DIST, saifuWeb, virtualAuthenticator } from "./stack.ts";

test.beforeAll(async () => {
  const { existsSync } = await import("node:fs");
  if (!existsSync(`${DIST}/sw.js`)) throw new Error("no web build: run `pnpm web:build` first");
});

/** The pass on screen: its QR code's SVG path, redrawn and scanned back to bytes. */
async function passOnScreen(page: Page): Promise<Uint8Array> {
  const svg = page.getByTestId("ticket.pass.qr").locator("svg");
  const [viewBox, path] = await Promise.all([
    svg.getAttribute("viewBox"),
    svg.locator("path").getAttribute("d"),
  ]);
  const side = Number(viewBox?.split(" ")[2]);
  const scale = 4;
  const width = side * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (const [, x, y, w] of (path ?? "").matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let dy = 0; dy < scale; dy++) {
      const line = (Number(y) * scale + dy) * width;
      pixels.fill(0, (line + Number(x) * scale) * 4, (line + (Number(x) + Number(w)) * scale) * 4);
    }
  }
  // Only the colour channels are darkened above; alpha stays opaque.
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
  const scanned = jsQR(pixels, width, width);
  if (scanned === null) throw new Error("the pass QR code does not scan");
  return Uint8Array.from(scanned.binaryData);
}

test("T-030-19: NFR-3: after one online visit, Saifu Web opens and produces a pass with the network off", async ({
  context,
  page,
}) => {
  const stack = await saifuWeb(context);
  await virtualAuthenticator(page);
  const holding = stack.grantTickets();

  // One online visit: set up, see the ticket, and let the service worker cache the app.
  await page.goto(`${stack.origin}/`);
  await page.getByTestId("onboarding-set-up").click();
  await expect(page.locator('[data-testid^="holding-"]')).toBeVisible();
  const { account, ticket } = await holding();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));

  // Every radio off: nothing reaches the app's origin or any service from here on.
  await stack.goOffline();
  const servedOnline = stack.served();
  await page.reload();
  await expect(page.locator('[data-screen="tickets.list"]')).toBeVisible();
  // The browser reports it is offline: the device cache is shown at once, while
  // the ledger is retried in the background.
  await expect(page.getByTestId(`holding-${ticket}`)).toBeVisible();
  await page.getByTestId(`holding-${ticket}`).click();
  await page.getByTestId("ticket-detail-show-pass").click();
  await expect(page.locator('[data-screen="ticket.pass"]')).toBeVisible();
  await expect(page.getByTestId("ticket.pass.qr").locator("svg path")).toBeAttached();

  const bytes = await passOnScreen(page);
  expect(stack.served()).toBe(servedOnline);

  // REQ-AP-5: the pass is the holder's, for the ticket, and verifies against the
  // credential the ledger records.
  const signed = decodePass(bytes);
  if (!signed.ok) throw new Error(signed.error.code);
  expect(signed.value.pass.ticket).toBe(ticket);
  const signer = accountOf(signed.value.authorisation);
  if (!signer.ok) throw new Error(signer.error.code);
  expect(signer.value.account).toBe(account);
  const registration = await stack.ledger.getCredential(
    signer.value.account as AccountId,
    signer.value.credential as CredentialId,
  );
  if (!registration.ok || registration.value === null) throw new Error("no registration");
  expect(
    verifyPass(signed.value, registration.value, { now: Date.now }, { rpId: stack.rpId }).ok,
  ).toBe(true);
});

test("T-030-19: REQ-CP-6: after site storage is cleared, signing in with the same synced passkey restores the account", async ({
  context,
  page,
}) => {
  const stack = await saifuWeb(context);
  const authenticator = await virtualAuthenticator(page);
  const holding = stack.grantTickets();

  await page.goto(`${stack.origin}/`);
  await page.getByTestId("onboarding-set-up").click();
  await expect(page.locator('[data-testid^="holding-"]')).toBeVisible();
  const { account, ticket } = await holding();

  // Clear everything the browser keeps for Saifu's origin; the passkey stays with
  // the authenticator, as a synced passkey stays with its password manager.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Storage.clearDataForOrigin", { origin: stack.origin, storageTypes: "all" });
  await page.goto(`${stack.origin}/`);
  await expect(page.locator('[data-screen="holder.onboarding"]')).toBeVisible();
  await expect(page.getByTestId("recovery-disclosure")).toContainText("syncs your passkey");

  await page.getByTestId("onboarding-restore").click();
  await expect(page.getByTestId(`holding-${ticket}`)).toBeVisible();

  // The same account, linked again, with no new passkey and no new registration.
  expect(await authenticator.credentials()).toHaveLength(1);
  expect(stack.kippu.linkedAccounts()).toEqual([account, account]);
});
