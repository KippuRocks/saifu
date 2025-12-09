import type {
  AttestationData,
  RegisterRequest,
} from "@/app/api/auth/register/route";
import type {
  AuthenticationService,
  ProfileInfo,
  Result,
} from "./authentication";
import {
  Binary,
  Blake2256,
  fromBufferToBase58,
} from "@polkadot-api/substrate-bindings";

import { ClientAccountProvider } from "@ticketto/protocol";
import { CredentialsHandler } from "@virtonetwork/authenticators-webauthn";
import type { CredentialsResponse } from "@/app/api/auth/credentials/route";
import { KreivoPassSigner } from "@virtonetwork/signer";
import { WebAuthn as PasskeysAuthenticator } from "@virtonetwork/authenticators-webauthn";
import { PolkadotClient } from "polkadot-api";
import { StoredCredential } from "./types";
import { credentialsDBStorage } from "./storage/credentials";
import { mergeUint8 } from "@polkadot-api/utils";

const CURRENT_USER_KEY = "saifu_current_user";

export type LoginInfo = {
  email: string;
  blockNumber: number;
};

async function blockHashChallenge(
  client: PolkadotClient,
  ctx: number,
  xtc: Uint8Array
) {
  const hash = await client._request("chain_getBlockHash", [ctx]);
  const blockHash = Binary.fromHex(hash);
  return Blake2256(mergeUint8([blockHash.asBytes(), xtc]));
}

class VirtoCredentialsHandler implements CredentialsHandler {
  private static async credentialIds(username: string) {
    const credentials = await credentialsDBStorage.getCredentials(username);
    return Object.entries(credentials).map(([credentialId]) => credentialId);
  }

  private static async setCredentials(
    username: string,
    credentials: StoredCredential[]
  ) {
    return credentialsDBStorage.setCredentials(
      username,
      credentials.reduce((credentials, credential) => {
        credentials[credential.id] = credential;
        return credentials;
      }, {} as Record<string, StoredCredential>)
    );
  }

  #lastCreatedCredentials?: PublicKeyCredential;

  get lastCreatedCredentials() {
    return this.#lastCreatedCredentials;
  }

  async publicKeyCreateOptions(
    challenge: Uint8Array<ArrayBuffer>,
    user: PublicKeyCredentialUserEntity
  ): Promise<CredentialCreationOptions["publicKey"]> {
    return {
      challenge,
      rp: {
        name: "Kippu",
      },
      user: {
        id: user.id,
        name: user.displayName,
        displayName: user.displayName,
      },
      pubKeyCredParams: [
        {
          type: "public-key",
          alg: -7 /* ES256 */,
        },
      ],
      authenticatorSelection: {
        userVerification: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    };
  }

  async onCreatedCredentials(
    username: string,
    credential: PublicKeyCredential
  ): Promise<void> {
    this.#lastCreatedCredentials = credential;
    await credentialsDBStorage.saveCredential(username, {
      id: credential.id,
      createdAt: new Date().toISOString(),
      type: "public-key",
    });
  }

  async publicKeyRequestOptions(
    username: string,
    challenge: Uint8Array<ArrayBuffer>
  ): Promise<CredentialRequestOptions["publicKey"]> {
    const credentialIds = await VirtoCredentialsHandler.credentialIds(username);

    if (credentialIds.length) {
      return {
        challenge,
        timeout: 60000,
        userVerification: "preferred",
        allowCredentials: credentialIds.map((id) => {
          const credentialId: Uint8Array<ArrayBuffer> = Uint8Array.fromBase64(
            id,
            { alphabet: "base64url" }
          );

          return {
            id: credentialId,
            type: "public-key",
          };
        }),
      };
    }

    try {
      const response = await fetch(
        `/api/auth/credentials?username=${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        throw new Error("Invalid response", {
          cause: response.body,
        });
      }

      const data: CredentialsResponse = await response.json();

      const allowCredentials = (data.credentials ?? []).map((cred) => ({
        id: Uint8Array.fromBase64(cred.id, { alphabet: "base64url" }),
        type: cred.type || "public-key",
      }));

      // Finally, let's store the found credentials.
      await VirtoCredentialsHandler.setCredentials(username, data.credentials);

      return {
        challenge,
        timeout: 60000,
        userVerification: "preferred",
        allowCredentials,
      };
    } catch (error) {
      throw new Error(`Failed to fetch credentialIds for ${username}`, {
        cause: error,
      });
    }
  }
}

export class VirtoWebAuthnService implements AuthenticationService<LoginInfo> {
  private currentLogin?: LoginInfo;
  private signer?: KreivoPassSigner;

  constructor(private client: PolkadotClient) {
    // Initialize from storage if available
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        this.currentLogin = JSON.parse(stored);
      }
    }
  }

  async register(email: string, profile: ProfileInfo): Promise<Result> {
    try {
      const handler = new VirtoCredentialsHandler();
      const authenticator = await this.getAuthenticator(email, handler);

      profile.displayName =
        profile.displayName ||
        `${profile.firstName} ${profile.lastName}`.trim();

      const block = await this.client.getFinalizedBlock();
      const attestation = await authenticator.register(
        block.number,
        profile.displayName
      );

      if (!handler.lastCreatedCredentials) {
        throw new Error("No credentials were created");
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: `ticketto::kippu:${email}`,
          credentialId: handler.lastCreatedCredentials?.id,
          attestation: {
            authenticator_data: attestation.authenticator_data.asHex(),
            client_data: attestation.client_data.asText(),
            public_key: attestation.public_key.asHex(),
            meta: {
              deviceId: attestation.meta.device_id.asHex(),
              context: attestation.meta.context,
              authority_id: attestation.meta.authority_id.asHex(),
            },
          } as AttestationData,
          profile,
        } as RegisterRequest),
      });

      if (!response.ok) {
        throw new Error("Registration failed", {
          cause: response.body,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Registration failed:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  async login(email: string): Promise<Result> {
    try {
      const authenticator = await this.getAuthenticator(email);

      const block = await this.client.getFinalizedBlock();
      await authenticator.authenticate(block.number, new Uint8Array([]));

      // If successful, update login time
      this.currentLogin = {
        email,
        blockNumber: block.number,
      };

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.currentLogin));

      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  getCurrentUser() {
    return (
      this.currentLogin && {
        login: this.currentLogin,
      }
    );
  }

  isLoggedIn() {
    return !!this.currentLogin;
  }

  async getAccountProvider(): Promise<ClientAccountProvider> {
    if (!this.currentLogin) {
      throw new Error("Not logged in");
    }

    if (!this.signer) {
      this.signer = new KreivoPassSigner(
        await this.getAuthenticator(this.currentLogin.email)
      );
    }

    return {
      getAccountId: () => fromBufferToBase58(2)(this.signer!.publicKey),
      sign: async <T>(payload: T) => {
        // We assume payload has a sign method compatible with PolkadotSigner
        if ((payload as any).sign) {
          const signature = await (payload as any).sign(this.signer);
          // signature is hex string, we need bytes
          return new Uint8Array(
            signature
              .match(/.{1,2}/g)!
              .map((byte: string) => parseInt(byte, 16))
          );
        }
        throw new Error("Payload does not have a sign method");
      },
    };
  }

  logout() {
    this.currentLogin = undefined;
    this.signer = undefined;
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  private async getAuthenticator(
    email: string,
    handler: VirtoCredentialsHandler = new VirtoCredentialsHandler()
  ) {
    const username = `ticketto::kippu:${email}`;

    return await new PasskeysAuthenticator(
      username,
      (ctx, xtc) => blockHashChallenge(this.client, ctx, xtc),
      handler
    ).setup();
  }
}
