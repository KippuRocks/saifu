// What Saifu keeps on the device about the holder's credential (T-030-03).
//
// Nothing here is a key: the passkey's private key never leaves the platform
// authenticator. The record holds what the ceremonies need to be repeated —
// the random user id the holder's account derives from, and the passkey's
// credential id — plus the registration until the ledger has accepted it, and
// the Kippu session once the account is linked. The user id is not secret, but
// it names the account, and the session token is a bearer credential, so the
// record lives in the platform's secure storage (the Keychain on iOS, the
// Keystore-backed store on Android), never in plain app storage.

export interface HolderRecord {
  /** 32 random bytes as lower-case hex (features/003-profile-v0/plan.md §5.2). */
  readonly userId: string;
  /** The passkey's raw credential ids, unpadded base64url; the first is this device's. */
  readonly credentialIds: readonly string[];
  /** The registration, lower-case hex. Kept so registration can be retried. */
  readonly registration: string;
  /** Whether the ledger has accepted the registration. */
  readonly registered: boolean;
  /** The Kippu holder session, once linked. */
  readonly kippuSession?: KippuSessionRecord;
}

export interface KippuSessionRecord {
  readonly token: string;
  /** Milliseconds since the epoch. */
  readonly expiresAt: number;
}

export interface HolderStore {
  load(): Promise<HolderRecord | null>;
  save(record: HolderRecord): Promise<void>;
  clear(): Promise<void>;
}

/** Key-value access to the platform's secure storage; expo-secure-store in the app. */
export interface SecureStorage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

const KEY = "saifu.holder.v1";

export class HolderRecordError extends Error {
  override readonly name = "HolderRecordError";
}

export function secureHolderStore(storage: SecureStorage): HolderStore {
  return {
    async load() {
      const raw = await storage.getItemAsync(KEY);
      return raw === null ? null : parseRecord(raw);
    },
    async save(record) {
      await storage.setItemAsync(KEY, JSON.stringify(record));
    },
    async clear() {
      await storage.deleteItemAsync(KEY);
    },
  };
}

/** A store in memory, for tests. */
export function memoryHolderStore(initial: HolderRecord | null = null): HolderStore {
  let record = initial;
  return {
    load: async () => record,
    save: async (next) => {
      record = next;
    },
    clear: async () => {
      record = null;
    },
  };
}

const HEX32 = /^[0-9a-f]{64}$/;
const HEX = /^(?:[0-9a-f]{2})+$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function parseRecord(raw: string): HolderRecord {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new HolderRecordError("the stored holder record is not JSON");
  }
  const r = value as Partial<HolderRecord> | null;
  if (
    r === null ||
    typeof r !== "object" ||
    typeof r.userId !== "string" ||
    !HEX32.test(r.userId) ||
    !Array.isArray(r.credentialIds) ||
    r.credentialIds.length === 0 ||
    !r.credentialIds.every((id) => typeof id === "string" && BASE64URL.test(id)) ||
    typeof r.registration !== "string" ||
    !HEX.test(r.registration) ||
    typeof r.registered !== "boolean"
  ) {
    throw new HolderRecordError("the stored holder record is malformed");
  }
  const session = r.kippuSession;
  if (
    session !== undefined &&
    (typeof session !== "object" ||
      session === null ||
      typeof session.token !== "string" ||
      typeof session.expiresAt !== "number")
  ) {
    throw new HolderRecordError("the stored Kippu session is malformed");
  }
  return r as HolderRecord;
}
