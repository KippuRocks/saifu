// Reads what a browser's `AuthenticatorAttestationResponse` exposes —
// `getAuthenticatorData()` and `getPublicKey()` — from a raw attestation object,
// which is all the native platform APIs return.
//
// papi-signers registers the authenticator data and the public key as
// SubjectPublicKeyInfo DER (features/003-profile-v0/plan.md §5.2), so the bridge
// must reproduce both exactly as a browser would.

import { equalBytes } from "./bytes.ts";
import { CborError, type CborValue, decode, decodeItem } from "./cbor.ts";

const FLAGS_OFFSET = 32;
const ATTESTED_CREDENTIAL_DATA_OFFSET = 37;
const AAGUID_LENGTH = 16;
const FLAG_ATTESTED_CREDENTIAL_DATA = 0x40;

// COSE (RFC 9053) labels and values for an ES256 P-256 key.
const COSE_KTY = 1;
const COSE_ALG = 3;
const COSE_EC2_CRV = -1;
const COSE_EC2_X = -2;
const COSE_EC2_Y = -3;
const COSE_KTY_EC2 = 2;
const COSE_ALG_ES256 = -7;
const COSE_CRV_P256 = 1;

/** DER SubjectPublicKeyInfo header for an uncompressed P-256 point (id-ecPublicKey, prime256v1). */
const P256_SPKI_PREFIX = Uint8Array.from([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a,
  0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00,
]);

export class AttestationObjectError extends Error {
  override readonly name = "AttestationObjectError";
}

export interface ParsedAttestation {
  /** The authenticator data, as `getAuthenticatorData()` returns it. */
  readonly authenticatorData: Uint8Array;
  /** The credential public key as DER SubjectPublicKeyInfo, as `getPublicKey()` returns it. */
  readonly publicKey: Uint8Array;
  /** The credential id carried in the attested credential data. */
  readonly credentialId: Uint8Array;
}

/** Parses an attestation object, and checks it attests `expectedCredentialId`. */
export function parseAttestationObject(
  attestationObject: Uint8Array,
  expectedCredentialId: Uint8Array,
): ParsedAttestation {
  let object: CborValue;
  try {
    object = decode(attestationObject);
  } catch (error) {
    throw new AttestationObjectError(`attestation object is not CBOR: ${message(error)}`);
  }
  if (!(object instanceof Map)) throw new AttestationObjectError("attestation object is not a map");
  const authenticatorData = object.get("authData");
  if (!(authenticatorData instanceof Uint8Array)) {
    throw new AttestationObjectError("attestation object has no authData");
  }

  const flags = authenticatorData[FLAGS_OFFSET];
  if (flags === undefined || authenticatorData.length < ATTESTED_CREDENTIAL_DATA_OFFSET) {
    throw new AttestationObjectError("authenticator data is too short");
  }
  if ((flags & FLAG_ATTESTED_CREDENTIAL_DATA) === 0) {
    throw new AttestationObjectError("authenticator data carries no attested credential data");
  }

  let at = ATTESTED_CREDENTIAL_DATA_OFFSET + AAGUID_LENGTH;
  const high = authenticatorData[at];
  const low = authenticatorData[at + 1];
  if (high === undefined || low === undefined) {
    throw new AttestationObjectError("attested credential data is truncated");
  }
  const credentialIdLength = (high << 8) | low;
  at += 2;
  if (at + credentialIdLength > authenticatorData.length) {
    throw new AttestationObjectError("credential id is truncated");
  }
  const credentialId = authenticatorData.slice(at, at + credentialIdLength);
  at += credentialIdLength;
  if (!equalBytes(credentialId, expectedCredentialId)) {
    throw new AttestationObjectError("attested credential id does not match the credential");
  }

  let coseKey: CborValue;
  try {
    coseKey = decodeItem(authenticatorData, at).value;
  } catch (error) {
    if (error instanceof CborError) {
      throw new AttestationObjectError(`credential public key is not CBOR: ${error.message}`);
    }
    throw error;
  }
  return { authenticatorData, publicKey: spkiFromCose(coseKey), credentialId };
}

function spkiFromCose(key: CborValue): Uint8Array {
  if (!(key instanceof Map)) throw new AttestationObjectError("credential public key is not a map");
  if (key.get(COSE_KTY) !== COSE_KTY_EC2 || key.get(COSE_ALG) !== COSE_ALG_ES256) {
    throw new AttestationObjectError("credential public key is not an ES256 key");
  }
  if (key.get(COSE_EC2_CRV) !== COSE_CRV_P256) {
    throw new AttestationObjectError("credential public key is not on P-256");
  }
  const x = key.get(COSE_EC2_X);
  const y = key.get(COSE_EC2_Y);
  if (
    !(x instanceof Uint8Array) ||
    !(y instanceof Uint8Array) ||
    x.length !== 32 ||
    y.length !== 32
  ) {
    throw new AttestationObjectError("credential public key coordinates are malformed");
  }
  const spki = new Uint8Array(P256_SPKI_PREFIX.length + 65);
  spki.set(P256_SPKI_PREFIX);
  spki[P256_SPKI_PREFIX.length] = 0x04;
  spki.set(x, P256_SPKI_PREFIX.length + 1);
  spki.set(y, P256_SPKI_PREFIX.length + 33);
  return spki;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
