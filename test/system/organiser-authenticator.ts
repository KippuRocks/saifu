// Copied from kippu-api test/support/authenticator.ts (at the vendored commit), to
// sign an organiser in during system tests. The organiser is a test fixture here:
// Saifu never signs anyone in as an organiser.

import { createHash, generateKeyPairSync, type KeyObject, randomBytes, sign } from "node:crypto";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "./webauthn-json.ts";

/**
 * A software WebAuthn authenticator for tests: ES256, "none" attestation,
 * user-present and user-verified. It stands in for a platform authenticator
 * the way a browser would drive one.
 */

type Cbor = number | Uint8Array | string | Map<Cbor, Cbor>;

function head(major: number, value: number): Buffer {
  if (value < 24) return Buffer.from([(major << 5) | value]);
  if (value < 0x100) return Buffer.from([(major << 5) | 24, value]);
  if (value < 0x10000) {
    const b = Buffer.alloc(3);
    b[0] = (major << 5) | 25;
    b.writeUInt16BE(value, 1);
    return b;
  }
  const b = Buffer.alloc(5);
  b[0] = (major << 5) | 26;
  b.writeUInt32BE(value, 1);
  return b;
}

function cbor(value: Cbor): Buffer {
  if (typeof value === "number") {
    return value >= 0 ? head(0, value) : head(1, -1 - value);
  }
  if (typeof value === "string") {
    const bytes = Buffer.from(value, "utf8");
    return Buffer.concat([head(3, bytes.length), bytes]);
  }
  if (value instanceof Uint8Array) {
    return Buffer.concat([head(2, value.length), value]);
  }
  const parts = [head(5, value.size)];
  for (const [k, v] of value) {
    parts.push(cbor(k), cbor(v));
  }
  return Buffer.concat(parts);
}

const sha256 = (data: Uint8Array | string): Buffer => createHash("sha256").update(data).digest();
const b64u = (data: Uint8Array): string => Buffer.from(data).toString("base64url");

const FLAG_UP = 0x01;
const FLAG_UV = 0x04;
const FLAG_AT = 0x40;

export interface SoftwareAuthenticatorOptions {
  /** The origin the "browser" runs on. */
  readonly origin: string;
  /** Leave the user-verified flag unset. */
  readonly withoutUserVerification?: boolean;
}

export class SoftwareAuthenticator {
  readonly credentialId: Uint8Array = randomBytes(32);
  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;
  private counter = 0;
  private readonly flags: number;

  constructor(private readonly options: SoftwareAuthenticatorOptions) {
    const pair = generateKeyPairSync("ec", { namedCurve: "P-256" });
    this.privateKey = pair.privateKey;
    this.publicKey = pair.publicKey;
    this.flags = FLAG_UP | (options.withoutUserVerification === true ? 0 : FLAG_UV);
  }

  get id(): string {
    return b64u(this.credentialId);
  }

  private clientData(type: string, challenge: string): Buffer {
    return Buffer.from(
      JSON.stringify({ type, challenge, origin: this.options.origin, crossOrigin: false }),
    );
  }

  private cosePublicKey(): Buffer {
    const jwk = this.publicKey.export({ format: "jwk" });
    return cbor(
      new Map<Cbor, Cbor>([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, Buffer.from(jwk.x as string, "base64url")],
        [-3, Buffer.from(jwk.y as string, "base64url")],
      ]),
    );
  }

  private counterBytes(): Buffer {
    const bytes = Buffer.alloc(4);
    bytes.writeUInt32BE(this.counter);
    return bytes;
  }

  create(options: PublicKeyCredentialCreationOptionsJSON, rpId?: string): RegistrationResponseJSON {
    const clientData = this.clientData("webauthn.create", options.challenge);
    const credentialIdLength = Buffer.alloc(2);
    credentialIdLength.writeUInt16BE(this.credentialId.length);
    const authData = Buffer.concat([
      sha256(rpId ?? options.rp.id ?? ""),
      Buffer.from([this.flags | FLAG_AT]),
      this.counterBytes(),
      Buffer.alloc(16), // AAGUID
      credentialIdLength,
      this.credentialId,
      this.cosePublicKey(),
    ]);
    const attestationObject = cbor(
      new Map<Cbor, Cbor>([
        ["fmt", "none"],
        ["attStmt", new Map()],
        ["authData", authData],
      ]),
    );
    return {
      id: this.id,
      rawId: this.id,
      type: "public-key",
      response: {
        clientDataJSON: b64u(clientData),
        attestationObject: b64u(attestationObject),
        transports: ["internal"],
      },
      clientExtensionResults: {},
    };
  }

  get(options: PublicKeyCredentialRequestOptionsJSON, rpId?: string): AuthenticationResponseJSON {
    this.counter += 1;
    const clientData = this.clientData("webauthn.get", options.challenge);
    const authData = Buffer.concat([
      sha256(rpId ?? options.rpId ?? ""),
      Buffer.from([this.flags]),
      this.counterBytes(),
    ]);
    const signature = sign(
      "sha256",
      Buffer.concat([authData, sha256(clientData)]),
      this.privateKey,
    );
    return {
      id: this.id,
      rawId: this.id,
      type: "public-key",
      response: {
        clientDataJSON: b64u(clientData),
        authenticatorData: b64u(authData),
        signature: b64u(signature),
      },
      clientExtensionResults: {},
    };
  }
}
