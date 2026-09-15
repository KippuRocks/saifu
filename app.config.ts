// Expo app configuration, layered over app.json: the passkey relying party, the
// service endpoints, and the host of the links that open Saifu.
//
// The WebAuthn RP id is a deployment parameter of the V0 profile
// (features/003-profile-v0/plan.md §5.3): every holder passkey is bound to it,
// so changing it later is a migration. The domain that will serve it is not yet
// decided, so it is configuration, and defaults to a placeholder under the
// reserved `.example` TLD. A build for real holders must set SAIFU_RP_ID.
//
// The RP id's domain must vouch for the app: `webcredentials` associated
// domains on iOS, Digital Asset Links on Android. `tools/well-known` generates
// the two documents that domain has to serve.

import type { ConfigContext, ExpoConfig } from "expo/config";

export const PLACEHOLDER_RP_ID = "kippu.example";

export interface PasskeyConfig {
  /** The WebAuthn relying party id: a registrable domain, without scheme or port. */
  readonly rpId: string;
  /** Whether `rpId` is the placeholder rather than a decided domain. */
  readonly placeholder: boolean;
}

const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function passkeyConfig(env: Record<string, string | undefined>): PasskeyConfig {
  const rpId = env.SAIFU_RP_ID?.trim().toLowerCase() || PLACEHOLDER_RP_ID;
  if (!HOSTNAME.test(rpId)) {
    throw new Error(`SAIFU_RP_ID must be a domain name, without scheme or port: ${rpId}`);
  }
  return { rpId, placeholder: rpId === PLACEHOLDER_RP_ID };
}

/** Placeholders for services whose hostnames are not chosen yet. */
export const PLACEHOLDER_ENDPOINTS = {
  ledgerUrl: "https://ledger.kippu.example",
  sponsorUrl: "https://sponsor.kippu.example",
  kippuApiUrl: "https://api.kippu.example",
} as const;

export interface EndpointsConfig {
  /** The ledger service (`ticketto-offchain`), reached through `binding-offchain`. */
  readonly ledgerUrl: string;
  /** Kippu's sponsor relay. */
  readonly sponsorUrl: string;
  /** kippu-api. */
  readonly kippuApiUrl: string;
}

function readUrl(name: string, value: string | undefined, fallback: string): string {
  const url = value?.trim() || fallback;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${name} must be an http(s) URL: ${url}`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${name} must be an http(s) URL: ${url}`);
  }
  return url.replace(/\/+$/, "");
}

export function endpointsConfig(env: Record<string, string | undefined>): EndpointsConfig {
  return {
    ledgerUrl: readUrl("SAIFU_LEDGER_URL", env.SAIFU_LEDGER_URL, PLACEHOLDER_ENDPOINTS.ledgerUrl),
    sponsorUrl: readUrl(
      "SAIFU_SPONSOR_URL",
      env.SAIFU_SPONSOR_URL,
      PLACEHOLDER_ENDPOINTS.sponsorUrl,
    ),
    kippuApiUrl: readUrl(
      "SAIFU_KIPPU_API_URL",
      env.SAIFU_KIPPU_API_URL,
      PLACEHOLDER_ENDPOINTS.kippuApiUrl,
    ),
  };
}

/** Placeholder for the host of links into Saifu, not chosen yet. */
export const PLACEHOLDER_LINK_BASE = "https://saifu.kippu.example";

/** The URL paths on the link host that open Saifu (src/links/links.ts). */
export const LINK_PATHS = ["/checkout", "/invitations"] as const;

export interface LinksConfig {
  /** The https origin links into Saifu use (src/links/links.ts). */
  readonly linkBase: string;
  readonly host: string;
  readonly placeholder: boolean;
}

export function linksConfig(env: Record<string, string | undefined>): LinksConfig {
  const value = env.SAIFU_LINK_BASE?.trim() || PLACEHOLDER_LINK_BASE;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`SAIFU_LINK_BASE must be an https origin: ${value}`);
  }
  if (
    url.protocol !== "https:" ||
    !HOSTNAME.test(url.hostname) ||
    url.port !== "" ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(`SAIFU_LINK_BASE must be an https origin, with no port or path: ${value}`);
  }
  return {
    linkBase: url.origin,
    host: url.hostname,
    placeholder: url.origin === PLACEHOLDER_LINK_BASE,
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const passkey = passkeyConfig(process.env);
  const endpoints = endpointsConfig(process.env);
  const links = linksConfig(process.env);
  return {
    ...config,
    name: config.name ?? "Saifu",
    slug: config.slug ?? "saifu",
    ios: {
      ...config.ios,
      associatedDomains: [`webcredentials:${passkey.rpId}`, `applinks:${links.host}`],
    },
    android: {
      ...config.android,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: LINK_PATHS.map((pathPrefix) => ({ scheme: "https", host: links.host, pathPrefix })),
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    extra: {
      ...config.extra,
      passkey,
      endpoints,
      links,
    },
  };
};
