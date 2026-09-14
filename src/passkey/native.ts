// Wires the native passkey bridge to `navigator.credentials`, for the
// deployment's RP id (app.config.ts). papi-signers' WebAuthn authenticator
// reads `navigator.credentials` when it runs, so this is installed at startup.

import Constants from "expo-constants";
import { SaifuPasskey } from "../../modules/saifu-passkey/index.ts";
import {
  createPasskeyCredentials,
  type PasskeyCredentialsContainer,
} from "./credentials-container.ts";

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
