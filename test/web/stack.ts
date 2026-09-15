// Saifu Web as the smoke test runs it (T-030-18): the exported web build served
// at its own origin, `https://saifu.kippu.rocks`, and the services it calls
// answered by local stand-ins. Nothing leaves the machine: Playwright intercepts
// every request the browser makes to those origins and fulfils it here, so no
// DNS record, certificate or hosting is involved. Because the page really is on
// `https://saifu.kippu.rocks`, the browser binds passkeys to the holder RP id
// exactly as it would in production.

import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import type { BrowserContext, Page, Route } from "@playwright/test";
import { createMemoryBackend } from "@ticketto/backend-memory";
import { createProfileV0 } from "@ticketto/profile-v0";
import { HOLDER_RP_ID, LINK_BASE, PLACEHOLDER_ENDPOINTS } from "../../app.config.ts";
import { saifuTicketto } from "../../src/ledger/ticketto.ts";
import { localSponsor } from "../memory-ledger.ts";
import type { StandIn } from "./stand-ins/http.ts";
import { withCors } from "./stand-ins/http.ts";
import { kippuStandIn } from "./stand-ins/kippu.ts";
import { ledgerStandIn } from "./stand-ins/ledger.ts";
import { sponsorStandIn } from "./stand-ins/sponsor.ts";

/** The web build `pnpm web:build` exports. */
export const DIST = join(import.meta.dirname, "..", "..", "dist");

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".ttf": "font/ttf",
};

/**
 * Serves the export as a static host must: a file when the path names one, and
 * the app itself for any other path — `/checkout` and `/invitations` included.
 */
async function serveApp(route: Route): Promise<void> {
  const { pathname } = new URL(route.request().url());
  const path = normalize(join(DIST, decodeURIComponent(pathname)));
  const file =
    path.startsWith(DIST) && (await stat(path).catch(() => null))?.isFile() === true
      ? path
      : join(DIST, "index.html");
  await route.fulfill({
    status: 200,
    headers: { "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream" },
    body: await readFile(file),
  });
}

async function answer(route: Route, standIn: StandIn): Promise<void> {
  const request = route.request();
  const response = await standIn({
    method: request.method(),
    url: new URL(request.url()),
    headers: await request.allHeaders(),
    body: request.postData(),
  });
  await route.fulfill({
    status: response.status,
    ...(response.headers === undefined ? {} : { headers: { ...response.headers } }),
    body: response.body,
  });
}

export async function saifuWeb(context: BrowserContext) {
  const rpId = HOLDER_RP_ID;
  const origin = LINK_BASE;
  const backend = createMemoryBackend({ profile: createProfileV0({ rpId }) });
  const ledger = saifuTicketto({ backend, sponsor: localSponsor(), rpId });
  const kippu = kippuStandIn(ledger, rpId);

  const services: readonly [string, StandIn][] = [
    [PLACEHOLDER_ENDPOINTS.ledgerUrl, ledgerStandIn(backend)],
    [PLACEHOLDER_ENDPOINTS.sponsorUrl, sponsorStandIn()],
    [PLACEHOLDER_ENDPOINTS.kippuApiUrl, kippu.standIn],
  ];
  await context.route(`${origin}/**`, serveApp);
  for (const [url, standIn] of services) {
    const cors = withCors(origin, standIn);
    await context.route(`${url}/**`, (route) => answer(route, cors));
  }
  return { origin, rpId, ledger, kippu };
}

/**
 * Chromium's virtual authenticator, standing in for the device's platform
 * authenticator: discoverable credentials, and user verification that succeeds.
 */
export async function virtualAuthenticator(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return {
    async credentials() {
      return (await cdp.send("WebAuthn.getCredentials", { authenticatorId })).credentials;
    },
  };
}
