// Wires the native passkey bridge to `navigator.credentials`, for the
// deployment's RP id (app.config.ts). papi-signers' WebAuthn authenticator
// reads `navigator.credentials` when it runs, so this is installed at startup.

import { WebAuthn } from "@virtonetwork/authenticators-webauthn";
import type { Challenger } from "@virtonetwork/signer";
import Constants from "expo-constants";
import { SaifuPasskey } from "../../modules/saifu-passkey/index.ts";
import {
  createPasskeyCredentials,
  type PasskeyCredentialsContainer,
} from "./credentials-container.ts";
import {
  SaifuCredentialsHandler,
  type SaifuCredentialsHandlerOptions,
} from "./credentials-handler.ts";

export interface RelyingPartyConfig {
  readonly rpId: string;
  readonly placeholder: boolean;
}

/** The RP id this build was configured with. */
export function relyingPartyConfig(): RelyingPartyConfig {
  const passkey = (Constants.expoConfig?.extra as { passkey?: RelyingPartyConfig } | undefined)
    ?.passkey;
  if (passkey === undefined || typeof passkey.rpId !== "string") {
    throw new Error("the build has no passkey relying party configured (app.config.ts)");
  }
  return passkey;
}

/** The passkey credentials container, or `null` where the native bridge is unavailable. */
export function nativePasskeyCredentials(): PasskeyCredentialsContainer | null {
  if (SaifuPasskey === null || !SaifuPasskey.isSupported()) return null;
  return createPasskeyCredentials({ bridge: SaifuPasskey, rpId: relyingPartyConfig().rpId });
}

/** Installs the container as `navigator.credentials`; returns whether passkeys are available. */
export function installNativePasskeyCredentials(): boolean {
  const container = nativePasskeyCredentials();
  if (container === null) return false;
  Object.defineProperty(globalThis.navigator, "credentials", {
    value: container,
    configurable: true,
  });
  return true;
}

export interface HolderWebAuthnOptions {
  /** The holder's random user id, as lower-case hex (features/003-profile-v0/plan.md §5.2). */
  readonly userId: string;
  /** Produces each ceremony's challenge; the V0 challenger is the signer's (T-030-03). */
  readonly challenger: Challenger<number>;
  readonly credentialIds: SaifuCredentialsHandlerOptions["credentialIds"];
  readonly onCreated: SaifuCredentialsHandlerOptions["onCreated"];
}

/**
 * papi-signers' WebAuthn authenticator for a holder, bound to this build's RP
 * id and requiring user verification. Its ceremonies run through
 * `navigator.credentials`, so `installNativePasskeyCredentials` must have
 * succeeded.
 */
export async function holderWebAuthn(options: HolderWebAuthnOptions): Promise<WebAuthn> {
  const handler = new SaifuCredentialsHandler({
    relyingParty: { id: relyingPartyConfig().rpId, name: RELYING_PARTY_NAME },
    credentialIds: options.credentialIds,
    onCreated: options.onCreated,
  });
  return new WebAuthn(options.userId, options.challenger, handler).setup();
}

/** Shown by Android's passkey sheet next to the RP id. */
const RELYING_PARTY_NAME = "Saifu";
