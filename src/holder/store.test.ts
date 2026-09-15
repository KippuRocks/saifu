import { hashedUserId } from "@ticketto/profile-v0";
import { describe, expect, it } from "vitest";
import { toHex } from "./credential.ts";
import {
  type HolderRecord,
  HolderRecordError,
  type SecureStorage,
  secureHolderStore,
} from "./store.ts";

function storage(): SecureStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key) => items.get(key) ?? null,
    setItemAsync: async (key, value) => {
      items.set(key, value);
    },
    deleteItemAsync: async (key) => {
      items.delete(key);
    },
  };
}

const USER_ID = "ab".repeat(32);

const record: HolderRecord = {
  userHandle: toHex(hashedUserId(USER_ID)),
  userId: USER_ID,
  credentialIds: ["AQID"],
  registration: "0000",
  registered: false,
};

describe("T-030-03 holder record in secure storage", () => {
  it("round-trips a record, and holds no key material", async () => {
    const secure = storage();
    const store = secureHolderStore(secure);
    expect(await store.load()).toBeNull();
    await store.save({ ...record, kippuSession: { token: "t", expiresAt: 1 } });
    expect(await store.load()).toEqual({ ...record, kippuSession: { token: "t", expiresAt: 1 } });
    expect([...secure.items.keys()]).toEqual(["saifu.holder.v1"]);
    await store.clear();
    expect(await store.load()).toBeNull();
  });

  it("refuses a malformed record rather than provisioning over it", async () => {
    const secure = storage();
    const store = secureHolderStore(secure);
    for (const bad of [
      "not json",
      "{}",
      JSON.stringify({ ...record, userId: "short" }),
      JSON.stringify({ ...record, userHandle: "cd".repeat(32) }),
    ]) {
      secure.items.set("saifu.holder.v1", bad);
      await expect(store.load()).rejects.toThrow(HolderRecordError);
    }
  });

  it("reads a record saved before the user handle was kept, deriving the handle from the user id", async () => {
    const secure = storage();
    const { userHandle: _, ...legacy } = record;
    secure.items.set("saifu.holder.v1", JSON.stringify(legacy));
    expect(await secureHolderStore(secure).load()).toEqual(record);
  });

  it("keeps a joined device's record, which has the user handle alone", async () => {
    const secure = storage();
    const store = secureHolderStore(secure);
    const { userId: _, ...joined } = record;
    await store.save({ ...joined, joining: true });
    expect(await store.load()).toEqual({ ...joined, joining: true });
  });
});
