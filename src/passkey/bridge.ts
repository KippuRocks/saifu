// The native passkey bridge's contract (modules/saifu-passkey). Every byte
// string is unpadded base64url. The native side performs the platform ceremony
// — ASAuthorization on iOS, Credential Manager on Android — and returns the raw
// outputs untouched; everything WebAuthn-shaped is rebuilt in TypeScript, so
// both platforms go through the same code (credentials-container.ts).
//
// User verification is always required: the native side does not accept a
// weaker preference.

export interface NativeCreateRequest {
  /** The relying party id: the domain the passkey is bound to. */
  readonly rpId: string;
  /** Shown by some platforms' passkey sheets. */
  readonly rpName: string;
  readonly challenge: string;
  /** The WebAuthn user handle. */
  readonly userId: string;
  readonly userName: string;
  readonly userDisplayName: string;
  /** Credential ids the authenticator must not create a second passkey for. */
  readonly excludeCredentialIds: readonly string[];
  readonly timeoutMs: number;
}

export interface NativeCreateResult {
  readonly rawId: string;
  readonly clientDataJSON: string;
  /** The CBOR attestation object. */
  readonly attestationObject: string;
}

export interface NativeGetRequest {
  readonly rpId: string;
  readonly challenge: string;
  /** Credential ids the holder may use; empty lets the platform offer any for the RP id. */
  readonly allowCredentialIds: readonly string[];
  readonly timeoutMs: number;
}

export interface NativeGetResult {
  readonly rawId: string;
  readonly clientDataJSON: string;
  readonly authenticatorData: string;
  /** DER ECDSA signature over `authenticatorData ‖ SHA-256(clientDataJSON)`. */
  readonly signature: string;
  readonly userHandle: string | null;
}

export interface PasskeyBridge {
  /** Whether the platform can create and use passkeys at all. */
  isSupported(): boolean;
  create(request: NativeCreateRequest): Promise<NativeCreateResult>;
  get(request: NativeGetRequest): Promise<NativeGetResult>;
}

/** Error codes the native side rejects with. */
export type PasskeyErrorCode =
  | "ERR_PASSKEY_CANCELLED"
  | "ERR_PASSKEY_NOT_SUPPORTED"
  | "ERR_PASSKEY_DOMAIN"
  | "ERR_PASSKEY_NO_CREDENTIAL"
  | "ERR_PASSKEY_FAILED";
