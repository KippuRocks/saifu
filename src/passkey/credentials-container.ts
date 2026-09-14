// `navigator.credentials` for React Native, over the native passkey bridge.
//
// `@virtonetwork/authenticators-webauthn` — papi-signers' WebAuthn
// authenticator, which features/030-saifu/plan.md §5.1 adapts — calls the
// browser's `navigator.credentials.create` and `.get`. This container answers
// those two calls with the same shapes a browser returns, built from the
// platform's raw outputs, so the authenticator runs unmodified and produces
// the same attestation and assertion bytes (REQ-MG-6, F-003's compatibility
// suite). Only public-key credentials are supported.

import { parseAttestationObject } from "./attestation-object.ts";
import type { PasskeyBridge } from "./bridge.ts";
import { arrayBuffer, bufferSourceBytes, fromBase64Url, toBase64Url } from "./bytes.ts";

const DEFAULT_TIMEOUT_MS = 60_000;

export interface PasskeyContainerOptions {
  readonly bridge: PasskeyBridge;
  /** The deployment's RP id. A request naming another RP id is refused. */
  readonly rpId: string;
}

/** The subset of `CredentialsContainer` that WebAuthn authenticators use. */
export interface PasskeyCredentialsContainer {
  create(options: CredentialCreationOptions): Promise<PublicKeyCredential>;
  get(options: CredentialRequestOptions): Promise<PublicKeyCredential>;
}

export class PasskeyRequestError extends TypeError {
  override readonly name = "PasskeyRequestError";
}

export function createPasskeyCredentials(
  options: PasskeyContainerOptions,
): PasskeyCredentialsContainer {
  const { bridge, rpId } = options;

  const checkRpId = (requested: string | undefined) => {
    if (requested !== undefined && requested !== rpId) {
      throw new PasskeyRequestError(`RP id ${requested} is not this deployment's (${rpId})`);
    }
  };

  const checkUserVerification = (requirement: UserVerificationRequirement | undefined) => {
    if (requirement !== undefined && requirement !== "required") {
      throw new PasskeyRequestError("Saifu requires user verification for every passkey ceremony");
    }
  };

  return {
    async create({ publicKey }) {
      if (publicKey === undefined) throw new PasskeyRequestError("only public-key credentials");
      checkRpId(publicKey.rp.id);
      checkUserVerification(publicKey.authenticatorSelection?.userVerification);
      if (!publicKey.pubKeyCredParams.some((p) => p.type === "public-key" && p.alg === -7)) {
        throw new PasskeyRequestError("ES256 (-7) must be an accepted algorithm");
      }
      const result = await bridge.create({
        rpId,
        rpName: publicKey.rp.name,
        challenge: toBase64Url(bufferSourceBytes(publicKey.challenge)),
        userId: toBase64Url(bufferSourceBytes(publicKey.user.id)),
        userName: publicKey.user.name,
        userDisplayName: publicKey.user.displayName,
        excludeCredentialIds: (publicKey.excludeCredentials ?? []).map((c) =>
          toBase64Url(bufferSourceBytes(c.id)),
        ),
        timeoutMs: publicKey.timeout ?? DEFAULT_TIMEOUT_MS,
      });
      const rawId = fromBase64Url(result.rawId);
      const clientDataJSON = fromBase64Url(result.clientDataJSON);
      const attestationObject = fromBase64Url(result.attestationObject);
      const parsed = parseAttestationObject(attestationObject, rawId);
      const response = {
        clientDataJSON: arrayBuffer(clientDataJSON),
        attestationObject: arrayBuffer(attestationObject),
        getAuthenticatorData: () => arrayBuffer(parsed.authenticatorData),
        getPublicKey: () => arrayBuffer(parsed.publicKey),
        getPublicKeyAlgorithm: () => -7,
        getTransports: () => ["internal"],
      };
      return credential(rawId, response);
    },

    async get({ publicKey }) {
      if (publicKey === undefined) throw new PasskeyRequestError("only public-key credentials");
      checkRpId(publicKey.rpId);
      checkUserVerification(publicKey.userVerification);
      const result = await bridge.get({
        rpId,
        challenge: toBase64Url(bufferSourceBytes(publicKey.challenge)),
        allowCredentialIds: (publicKey.allowCredentials ?? []).map((c) =>
          toBase64Url(bufferSourceBytes(c.id)),
        ),
        timeoutMs: publicKey.timeout ?? DEFAULT_TIMEOUT_MS,
      });
      const rawId = fromBase64Url(result.rawId);
      const response = {
        clientDataJSON: arrayBuffer(fromBase64Url(result.clientDataJSON)),
        authenticatorData: arrayBuffer(fromBase64Url(result.authenticatorData)),
        signature: arrayBuffer(fromBase64Url(result.signature)),
        userHandle:
          result.userHandle === null ? null : arrayBuffer(fromBase64Url(result.userHandle)),
      };
      return credential(rawId, response);
    },
  };
}

function credential(rawId: Uint8Array, response: object): PublicKeyCredential {
  return {
    id: toBase64Url(rawId),
    rawId: arrayBuffer(rawId),
    type: "public-key",
    authenticatorAttachment: "platform",
    response,
    getClientExtensionResults: () => ({}),
    toJSON: () => {
      throw new PasskeyRequestError("toJSON is not supported");
    },
  } as unknown as PublicKeyCredential;
}
