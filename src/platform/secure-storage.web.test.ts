import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { type HolderRecord, secureHolderStore } from "../holder/store.ts";
import { indexedDbStorage } from "./secure-storage.web.ts";

const record: HolderRecord = {
  userHandle: "ab".repeat(32),
  credentialIds: ["AQID"],
  registration: "0000",
  registered: true,
  kippuSession: { token: "t", expiresAt: 1 },
};

describe("T-030-18 Saifu Web holder record in IndexedDB", () => {
  it("round-trips the holder record, and survives reopening the database", async () => {
    const factory = new IDBFactory();
    const store = secureHolderStore(indexedDbStorage(factory));
    expect(await store.load()).toBeNull();
    await store.save(record);
    expect(await store.load()).toEqual(record);

    // A reload opens the database afresh.
    expect(await secureHolderStore(indexedDbStorage(factory)).load()).toEqual(record);

    await store.clear();
    expect(await secureHolderStore(indexedDbStorage(factory)).load()).toBeNull();
  });

  it("keeps only strings", async () => {
    const storage = indexedDbStorage(new IDBFactory());
    await storage.setItemAsync("k", "v");
    expect(await storage.getItemAsync("k")).toBe("v");
    expect(await storage.getItemAsync("missing")).toBeNull();
  });
});
