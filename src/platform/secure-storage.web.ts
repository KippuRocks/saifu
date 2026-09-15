// Where Saifu Web keeps the holder record (T-030-18; features/030-saifu/plan.md
// §5.1a): the user id, the passkey's credential id, the registration until the
// ledger accepts it, and the Kippu session — in IndexedDB, on this origin only.
//
// A browser has no store like the Keychain: IndexedDB is readable by any script
// running on Saifu's origin, and a browser may evict it (notably Safari, for a
// site not added to the home screen). No key is kept here either: the passkey's
// private key stays in the browser's authenticator.

import type { SecureStorage } from "../holder/store.ts";

const DATABASE = "saifu";
const STORE = "holder";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Key-value storage in one IndexedDB object store, shaped as expo-secure-store is. */
export function indexedDbStorage(factory: IDBFactory, database = DATABASE): SecureStorage {
  let opened: Promise<IDBDatabase> | undefined;
  const open = () => {
    opened ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = factory.open(database, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => {
        const db = req.result;
        // Another tab deleting or upgrading the database: open it again next time.
        db.onversionchange = () => {
          db.close();
          opened = undefined;
        };
        resolve(db);
      };
      req.onerror = () => {
        opened = undefined;
        reject(req.error);
      };
    });
    return opened;
  };
  const run = async <T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> => {
    const db = await open();
    const transaction = db.transaction(STORE, mode);
    const result = request(operation(transaction.objectStore(STORE)));
    const done = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    const [value] = await Promise.all([result, done]);
    return value;
  };
  return {
    async getItemAsync(key) {
      const value = await run("readonly", (store) => store.get(key));
      return typeof value === "string" ? value : null;
    },
    async setItemAsync(key, value) {
      await run("readwrite", (store) => store.put(value, key));
    },
    async deleteItemAsync(key) {
      await run("readwrite", (store) => store.delete(key));
    },
  };
}

export const secureStorage: SecureStorage = indexedDbStorage(globalThis.indexedDB);
