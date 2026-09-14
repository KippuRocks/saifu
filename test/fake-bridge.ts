// A passkey bridge backed by F-003's simulated platform authenticator, returning
// exactly what the native modules return: the raw attestation object on
// registration, and raw authenticator data, client data and DER signature on
// assertion.

import type { SimulatedWebAuthnAuthenticator } from "@ticketto/profile-v0/testing";
import type {
  NativeCreateRequest,
  NativeCreateResult,
  NativeGetRequest,
  NativeGetResult,
  PasskeyBridge,
} from "../src/passkey/bridge.ts";
import { fromBase64Url, toBase64Url } from "../src/passkey/bytes.ts";
import { encodeCbor } from "./cbor-encode.ts";

export interface FakeBridge extends PasskeyBridge {
  readonly creates: NativeCreateRequest[];
  readonly gets: NativeGetRequest[];
  /** Rewrites the attestation object before it is returned. */
  tamperAttestation?: (object: { fmt: string; attStmt: object; authData: Uint8Array }) => void;
}

export function fakeBridge(authenticator: SimulatedWebAuthnAuthenticator): FakeBridge {
  const bridge: FakeBridge = {
    creates: [],
    gets: [],
    isSupported: () => true,
    async create(request): Promise<NativeCreateResult> {
      bridge.creates.push(request);
      const { authenticator_data, client_data } = authenticator.attest(
        fromBase64Url(request.challenge),
      );
      const object = { fmt: "none", attStmt: {}, authData: authenticator_data };
      bridge.tamperAttestation?.(object);
      return {
        rawId: toBase64Url(authenticator.credentialId),
        clientDataJSON: toBase64Url(client_data),
        attestationObject: toBase64Url(encodeCbor(object)),
      };
    },
    async get(request): Promise<NativeGetResult> {
      bridge.gets.push(request);
      const { authenticator_data, client_data, signature } = authenticator.assert(
        new Uint8Array(32),
        fromBase64Url(request.challenge),
      );
      return {
        rawId: toBase64Url(authenticator.credentialId),
        clientDataJSON: toBase64Url(client_data),
        authenticatorData: toBase64Url(authenticator_data),
        signature: toBase64Url(signature),
        userHandle: null,
      };
    },
  };
  return bridge;
}
