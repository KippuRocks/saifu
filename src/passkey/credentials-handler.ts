// Saifu's `CredentialsHandler` for papi-signers' `WebAuthn` authenticator: the
// options for each ceremony. Unlike the package's in-memory default, it binds
// every passkey to the deployment's RP id and requires user verification
// (features/003-profile-v0/plan.md §5.2 checks the flag).
//
// Which credential ids a holder has, and where they are kept, is the signer's
// concern (T-030-03); this handler asks for them through `credentialIds` and
// reports new ones through `onCreated`.

import type { CredentialsHandler } from "@virtonetwork/authenticators-webauthn";
import { bufferSourceBytes } from "./bytes.ts";

export interface RelyingParty {
  readonly id: string;
  readonly name: string;
}

export interface SaifuCredentialsHandlerOptions {
  readonly relyingParty: RelyingParty;
  /** Raw ids of the passkeys the holder `userId` has on this device. */
  readonly credentialIds: (userId: string) => Promise<readonly Uint8Array[]>;
  /** Called with each passkey created, once the platform has returned it. */
  readonly onCreated: (userId: string, rawId: Uint8Array) => Promise<void>;
  readonly timeoutMs?: number;
}

export class SaifuCredentialsHandler implements CredentialsHandler {
  readonly #options: SaifuCredentialsHandlerOptions;

  constructor(options: SaifuCredentialsHandlerOptions) {
    this.#options = options;
  }

  async publicKeyCreateOptions(
    challenge: Uint8Array,
    user: PublicKeyCredentialUserEntity,
  ): Promise<PublicKeyCredentialCreationOptions> {
    return {
      challenge: toArrayBuffer(challenge),
      rp: { id: this.#options.relyingParty.id, name: this.#options.relyingParty.name },
      user,
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "required",
        requireResidentKey: true,
        userVerification: "required",
      },
      attestation: "none",
      timeout: this.#options.timeoutMs ?? 60_000,
    };
  }

  async publicKeyRequestOptions(
    userId: string,
    challenge: Uint8Array,
  ): Promise<PublicKeyCredentialRequestOptions> {
    const ids = await this.#options.credentialIds(userId);
    return {
      challenge: toArrayBuffer(challenge),
      rpId: this.#options.relyingParty.id,
      allowCredentials: ids.map((id) => ({
        type: "public-key",
        id: toArrayBuffer(id),
        transports: ["internal"],
      })),
      userVerification: "required",
      timeout: this.#options.timeoutMs ?? 60_000,
    };
  }

  async onCreatedCredentials(userId: string, credential: PublicKeyCredential): Promise<void> {
    await this.#options.onCreated(userId, bufferSourceBytes(credential.rawId));
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}
