// Expo app configuration, layered over app.json: the passkey relying party.
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

export default ({ config }: ConfigContext): ExpoConfig => {
  const passkey = passkeyConfig(process.env);
  return {
    ...config,
    name: config.name ?? "Saifu",
    slug: config.slug ?? "saifu",
    ios: {
      ...config.ios,
      associatedDomains: [`webcredentials:${passkey.rpId}`],
    },
    extra: {
      ...config.extra,
      passkey,
    },
  };
};
