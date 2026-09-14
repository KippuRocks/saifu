// A device for holder tests: F-003's simulated platform authenticator behind the
// native bridge's contract, installed as `navigator.credentials` exactly as the
// app installs the native one.

import { p256 } from "@noble/curves/nist.js";
import { SimulatedWebAuthnAuthenticator } from "@ticketto/profile-v0/testing";
import { createPasskeyCredentials } from "../src/passkey/credentials-container.ts";
import { type FakeBridge, fakeBridge } from "./fake-bridge.ts";

export interface SimulatedDevice {
  readonly authenticator: SimulatedWebAuthnAuthenticator;
  readonly bridge: FakeBridge;
}

export function simulatedDevice(rpId: string): SimulatedDevice {
  const authenticator = new SimulatedWebAuthnAuthenticator({
    rpId,
    secretKey: p256.utils.randomSecretKey(),
    credentialId: crypto.getRandomValues(new Uint8Array(32)),
  });
  const bridge = fakeBridge(authenticator);
  Object.defineProperty(globalThis.navigator, "credentials", {
    value: createPasskeyCredentials({ bridge, rpId }),
    configurable: true,
  });
  return { authenticator, bridge };
}
