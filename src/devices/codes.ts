// The codes two phones exchange to add a second device (T-030-13; REQ-CP-6;
// features/030-saifu/plan.md "Second device", as ruled in M4). In person, by QR
// code, with nothing passing through Kippu:
//
//   saifu:add-device:<user handle, 64 lower-case hex>      existing phone → new phone
//   saifu:device-registration:<registration, base64url>    new phone → existing phone
//
// Both phones show the same six-digit short code for the registration, so the
// holder confirms, on the existing phone, that the code it scanned came from the
// phone in front of them.
//
// The user handle is the passkey's, `SHA-256(userId)`: the new phone creates its
// passkey with it, so both passkeys carry the same handle and name the same
// account, and the raw user id never leaves the phone that created it.

import { blake2b256, registrationAccount } from "@ticketto/profile-v0";
import type { AccountId, Registration } from "@ticketto/sdk";
import { fromBase64Url, toBase64Url } from "../passkey/bytes.ts";

const ADD_DEVICE = "saifu:add-device:";
const DEVICE_REGISTRATION = "saifu:device-registration:";
const USER_HANDLE = /^[0-9a-f]{64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** The domain tag of the short code's hash. */
export const SHORT_CODE_TAG = new TextEncoder().encode("saifu/v0/device-short-code");

export function addDeviceCode(userHandle: string): string {
  if (!USER_HANDLE.test(userHandle)) throw new TypeError("not a user handle");
  return `${ADD_DEVICE}${userHandle}`;
}

export function userHandleFromAddDeviceCode(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(ADD_DEVICE)) return null;
  const userHandle = trimmed.slice(ADD_DEVICE.length);
  return USER_HANDLE.test(userHandle) ? userHandle : null;
}

export function deviceRegistrationCode(registration: Uint8Array): string {
  return `${DEVICE_REGISTRATION}${toBase64Url(registration)}`;
}

/** The registration a scanned code carries, if it names `account`; `null` otherwise. */
export function registrationFromDeviceCode(text: string, account: AccountId): Registration | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(DEVICE_REGISTRATION)) return null;
  const encoded = trimmed.slice(DEVICE_REGISTRATION.length);
  if (!BASE64URL.test(encoded)) return null;
  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(encoded);
  } catch {
    return null;
  }
  const named = registrationAccount(bytes as Registration);
  return named.ok && named.value.account === account ? (bytes as Registration) : null;
}

/**
 * Six digits from `BLAKE2b-256("saifu/v0/device-short-code" ‖ registration)`:
 * the first four bytes, big-endian, modulo one million.
 */
export function shortCode(registration: Uint8Array): string {
  const tagged = new Uint8Array(SHORT_CODE_TAG.length + registration.length);
  tagged.set(SHORT_CODE_TAG);
  tagged.set(registration, SHORT_CODE_TAG.length);
  const hash = blake2b256(tagged);
  const value =
    (((hash[0] ?? 0) << 24) >>> 0) +
    ((hash[1] ?? 0) << 16) +
    ((hash[2] ?? 0) << 8) +
    (hash[3] ?? 0);
  return String(value % 1_000_000).padStart(6, "0");
}
