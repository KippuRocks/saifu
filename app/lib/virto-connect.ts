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
import type { CredentialsResponse } from "@/app/api/credentials/route";
import { KreivoPassSigner } from "@virtonetwork/signer";
import { WebAuthn as PasskeysAuthenticator } from "@virtonetwork/authenticators-webauthn";
import { PolkadotClient } from "polkadot-api";
import { mergeUint8 } from "@polkadot-api/utils";

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
  private static readonly STORAGE_KEY = "saifu_credentials";
  private static userCredentials: Record<string, Record<string, any>> = {};

  constructor() {
    this.loadCredentialsFromStorage();
  }

  private loadCredentialsFromStorage(): void {
    try {
      const stored = localStorage.getItem(VirtoCredentialsHandler.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const [userId, credentialId] of Object.entries(parsed)) {
          if (typeof credentialId === "string") {
            const rawId = Uint8Array.fromBase64(credentialId);
            VirtoCredentialsHandler.userCredentials[userId] = {
              [credentialId]: {
                id: credentialId,
                rawId: rawId,
                type: "public-key",
              },
            };
          }
        }
        console.log("Loaded credentials from localStorage");
      }
      console.log("userCredentials", VirtoCredentialsHandler.userCredentials);
    } catch (error) {
      console.error("Failed to load credentials:", error);
    }
  }

  private static saveCredentialsToStorage(): void {
    try {
      const simple: Record<string, string> = {};
      for (const [userId, credentials] of Object.entries(
        this.userCredentials
      )) {
        const credentialEntries = Object.keys(credentials);
        if (credentialEntries.length > 0 && credentialEntries[0]) {
          simple[userId] = credentialEntries[0]; // Take first credential
        }
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(simple));
    } catch (error) {
      console.error("Failed to save credentials:", error);
    }
  }

  private static tryMutate(
    userId: string,
    f: (credentials: Record<string, any>) => void
  ): void {
    try {
      let map = this.userCredentials[userId] ?? {};
      f(map);
      this.userCredentials[userId] = map;
    } catch {
      /* on error, no-op */
    }
  }

  static credentialIds(userId: string): string[] {
    const credentials = this.userCredentials[userId] ?? {};
    return Object.entries(credentials).map(([, credential]) => credential.id);
  }

  publicKeyCreateOptions = async (
    challenge: Uint8Array,
    user: PublicKeyCredentialUserEntity
  ): Promise<CredentialCreationOptions["publicKey"]> => {
    // Ensure we have a proper ArrayBuffer for BufferSource
    const challengeArray = new Uint8Array(challenge);
    const challengeBuffer = challengeArray.buffer.slice();

    return {
      challenge: challengeBuffer,
      rp: {
        name: "Kippu",
      },
      user: {
        id: user.id,
        name: user.name,
        displayName: user.displayName || user.name,
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
  };

  onCreatedCredentials = async (
    userId: string,
    credential: PublicKeyCredential
  ): Promise<void> => {
    VirtoCredentialsHandler.tryMutate(userId, (credentials) => {
      credentials[credential.id] = credential;
    });

    VirtoCredentialsHandler.saveCredentialsToStorage();
  };

  private getLocalAllowCredentials(
    userId: string
  ): PublicKeyCredentialDescriptor[] {
    const credentialIds = VirtoCredentialsHandler.credentialIds(userId);

    return credentialIds.map((credentialId) => ({
      id: Uint8Array.fromBase64(credentialId),
      type: "public-key",
      transports: ["internal", "hybrid", "usb", "nfc", "ble"],
    }));
  }

  publicKeyRequestOptions = async (
    userId: string,
    challenge: Uint8Array<ArrayBuffer>
  ): Promise<CredentialRequestOptions["publicKey"]> => {
    const localCredentials = this.getLocalAllowCredentials(userId);

    if (localCredentials) {
      return {
        challenge,
        timeout: 60000,
        userVerification: "preferred",
        allowCredentials: localCredentials,
      };
    }

    try {
      const response = await fetch(
        `/api/credentials?username=${encodeURIComponent(userId)}`
      );

      if (!response.ok) {
        throw new Error("Invalid response", {
          cause: response.body,
        });
      }

      const data: CredentialsResponse = await response.json();

      const allowCredentials = (data.credentials ?? []).map((cred) => ({
        id: Uint8Array.fromBase64(cred.id),
        type: cred.type || "public-key",
        transports: cred.transports || ["internal"],
      }));

      // Finally, let's store the found credentials.
      VirtoCredentialsHandler.tryMutate(userId, (credentials) => {
        allowCredentials.forEach((cred) => {
          const credentialId = cred.id.toBase64();

          credentials[credentialId] = {
            id: credentialId,
            rawId: cred.id,
            type: cred.type,
          };
        });
      });
      VirtoCredentialsHandler.saveCredentialsToStorage();

      return {
        challenge,
        timeout: 60000,
        userVerification: "preferred",
        allowCredentials,
      };
    } catch (error) {
      throw new Error(`Failed to fetch credentialIds for ${userId}`, {
        cause: error,
      });
    }
  };
}

export class VirtoWebAuthnService implements AuthenticationService<LoginInfo> {
  private currentLogin?: LoginInfo;
  private signer?: KreivoPassSigner;

  constructor(private client: PolkadotClient) {
    // Initialize from storage if available
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("saifu_current_user");
      if (stored) {
        this.currentLogin = JSON.parse(stored);
      }
    }
  }

  async register(email: string, profile: ProfileInfo): Promise<Result> {
    try {
      const authenticator = await this.getAuthenticator(email);

      const block = await this.client.getFinalizedBlock();
      const attestation = await authenticator.register(block.number);

      await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentialId: attestation.meta.device_id.asBytes().toBase64(),
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

      localStorage.setItem("currentUser", JSON.stringify(this.currentLogin));

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
    localStorage.removeItem("currentUser");
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
