// The holder's credential: provisioning a passkey, its Kreivo Pass account, and
// the passkey `Signer` (T-030-03; features/030-saifu/plan.md §5.1; REQ-CL-2,
// REQ-SP-4, REQ-SDK-4).
//
// Saifu is the only client holding holder credentials (guardrail 8). The
// credential is a passkey in the platform authenticator; everything that signs
// goes through papi-signers' WebAuthn authenticator over the native bridge
// (T-030-02), so the attestation and assertion bytes are Kreivo's.

import {
  type Assertion,
  type Attestation,
  assertionCodec,
  encodeAuthorisation,
  encodeRegistration,
  hashedUserId,
  holderAccountFromHashedUserId,
  V0_CONTEXT,
} from "@ticketto/profile-v0";
import type { AccountId, Authorisation, Registration, Signer } from "@ticketto/sdk";
import type { CredentialsHandler } from "@virtonetwork/authenticators-webauthn";
import { WebAuthn } from "@virtonetwork/authenticators-webauthn";
import { fromBase64Url, toBase64Url } from "../passkey/bytes.ts";
import { SaifuCredentialsHandler } from "../passkey/credentials-handler.ts";
import { v0Challenger } from "./challenger.ts";
import type { HolderRecord, HolderStore } from "./store.ts";

export interface HolderCredentialOptions {
  /** The deployment's holder RP id: the profile's parameter (features/003-profile-v0/plan.md §5.3). */
  readonly rpId: string;
  readonly store: HolderStore;
  /**
   * The user handle (`SHA-256(userId)`, lower-case hex) of an account that
   * already exists, when this device joins it as a second device (T-030-13).
   * This device's passkey is created with that user handle, and registered by
   * the account's existing device, never by this one.
   */
  readonly joinUserHandle?: string;
  /** Cryptographically secure random bytes. Defaults to `crypto.getRandomValues`. */
  readonly randomBytes?: (length: number) => Uint8Array;
}

export interface HolderCredential {
  /** The holder's ledger account: `BLAKE2b-256(0³² ‖ userHandle)`, `userHandle = SHA-256(userId)`. */
  readonly account: AccountId;
  /** Signs a profile signing payload with the passkey; one biometric prompt per call. */
  readonly signer: Signer;
  /** Registers the passkey to the account (`register_credential`), as the ledger expects it. */
  readonly registration: Registration;
  /** The device record the credential was loaded from or provisioned into. */
  readonly record: HolderRecord;
}

/** Shown by Android's passkey sheet next to the RP id. */
export const RELYING_PARTY_NAME = "Saifu";

const HEX = "0123456789abcdef";

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += HEX.charAt(byte >> 4) + HEX.charAt(byte & 15);
  return out;
}

export function fromHex(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})*$/.test(hex)) throw new TypeError("expected lower-case hex");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = Number.parseInt(hex.slice(2 * i, 2 * i + 2), 16);
  return bytes;
}

const defaultRandomBytes = (length: number) => crypto.getRandomValues(new Uint8Array(length));

/**
 * The holder credential on this device: loaded from the store when one exists,
 * otherwise provisioned — a random user id, and a passkey created with user
 * verification required. Nothing is shown to the holder to write down.
 *
 * Provisioning saves the record as soon as the platform returns the passkey,
 * before anything reaches the ledger, so a failed registration is retried with
 * the same passkey rather than orphaning it.
 */
export async function holderCredential(
  options: HolderCredentialOptions,
): Promise<HolderCredential> {
  const { store } = options;
  const existing = await store.load();
  if (existing !== null) return credentialFrom(existing, options);

  const { joinUserHandle } = options;
  if (joinUserHandle !== undefined && !/^[0-9a-f]{64}$/.test(joinUserHandle)) {
    throw new TypeError("a user handle is 32 bytes of lower-case hex");
  }
  const userId =
    joinUserHandle === undefined
      ? toHex((options.randomBytes ?? defaultRandomBytes)(32))
      : undefined;
  const userHandle = joinUserHandle ?? toHex(hashedUserId(userId as string));
  const ceremonies = v0Challenger();
  let rawId: Uint8Array | undefined;
  const webAuthn = await authenticator(userId, userHandle, options.rpId, ceremonies.challenger, {
    credentialIds: async () => (rawId === undefined ? [] : [rawId]),
    onCreated: async (_userId, id) => {
      rawId = id;
    },
  });
  const attestation = await ceremonies.run("register", () => webAuthn.register(V0_CONTEXT));
  if (rawId === undefined) throw new Error("the platform returned no credential id");

  const registration = encodeRegistration({
    kind: "passWebAuthn",
    hashedUserId: webAuthn.hashedUserId,
    attestation: {
      meta: {
        authority_id: attestation.meta.authority_id.asBytes(),
        device_id: attestation.meta.device_id.asBytes(),
        context: attestation.meta.context,
      },
      authenticator_data: attestation.authenticator_data.asBytes(),
      client_data: attestation.client_data.asBytes(),
      public_key: attestation.public_key.asBytes(),
    } satisfies Attestation,
  });
  const record: HolderRecord = {
    userHandle,
    ...(userId === undefined ? {} : { userId }),
    credentialIds: [toBase64Url(rawId)],
    registration: toHex(registration),
    registered: false,
    ...(joinUserHandle === undefined ? {} : { joining: true }),
  };
  await store.save(record);
  return credentialFrom(record, options, { webAuthn, ceremonies });
}

/**
 * papi-signers' authenticator for the holder. Its user handle is always the
 * stored one: papi-signers hashes the user id it is given, and a device that
 * joined an account has only the hash, so the hash it computes is overridden
 * with the same bytes (features/030-saifu/plan.md, ruled in M4; REQ-MG-6).
 */
async function authenticator(
  userId: string | undefined,
  userHandle: string,
  rpId: string,
  challenger: ReturnType<typeof v0Challenger>["challenger"],
  ids: Pick<
    ConstructorParameters<typeof SaifuCredentialsHandler>[0],
    "credentialIds" | "onCreated"
  >,
): Promise<WebAuthn> {
  const handler: CredentialsHandler = new SaifuCredentialsHandler({
    relyingParty: { id: rpId, name: RELYING_PARTY_NAME },
    ...ids,
  });
  const webAuthn = await new WebAuthn(userId ?? userHandle, challenger, handler).setup();
  if (userId !== undefined && toHex(webAuthn.hashedUserId) !== userHandle) {
    throw new Error("papi-signers' user handle disagrees with the stored one");
  }
  webAuthn.hashedUserId = fromHex(userHandle);
  return webAuthn;
}

async function credentialFrom(
  record: HolderRecord,
  options: HolderCredentialOptions,
  reuse?: { webAuthn: WebAuthn; ceremonies: ReturnType<typeof v0Challenger> },
): Promise<HolderCredential> {
  const ceremonies = reuse?.ceremonies ?? v0Challenger();
  const credentialIds = record.credentialIds.map(fromBase64Url);
  const webAuthn =
    reuse?.webAuthn ??
    (await authenticator(record.userId, record.userHandle, options.rpId, ceremonies.challenger, {
      credentialIds: async () => credentialIds,
      onCreated: async () => {
        throw new Error("a loaded holder credential creates no passkey");
      },
    }));
  const account = holderAccountFromHashedUserId(webAuthn.hashedUserId);
  // papi-signers' address generator and the profile's derivation must agree (REQ-MG-6).
  if (toHex(webAuthn.addressGenerator(webAuthn.hashedUserId)) !== account) {
    throw new Error("the Kreivo Pass account derivation disagrees with the profile's");
  }

  const signer: Signer = {
    account,
    async sign(payload: Uint8Array): Promise<Authorisation> {
      const signed = await ceremonies.run("authenticate", () =>
        webAuthn.authenticate(V0_CONTEXT, payload),
      );
      if (signed === undefined) throw new Error("the passkey produced no assertion");
      return encodeAuthorisation({
        kind: "passWebAuthn",
        deviceId: signed.deviceId.asBytes(),
        assertion: assertionCodec.dec(signed.credentials.value) as Assertion,
      });
    },
  };
  return {
    account,
    signer,
    registration: fromHex(record.registration) as Registration,
    record,
  };
}
