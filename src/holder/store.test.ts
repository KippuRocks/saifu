import { describe, expect, it } from "vitest";
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

const record: HolderRecord = {
  userId: "ab".repeat(32),
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
    for (const bad of ["not json", "{}", JSON.stringify({ ...record, userId: "short" })]) {
      secure.items.set("saifu.holder.v1", bad);
      await expect(store.load()).rejects.toThrow(HolderRecordError);
    }
  });
});
