import { IndexedDBStorage } from "./indexed-db";
import { StoredCredential } from "../types";

export const DB_NAME = "saifu-db";
export const DB_VERSION = 1;
export const CREDENTIALS_STORE = "credentials";
export const SETTINGS_STORE = "settings";

export class CredentialsStorage extends IndexedDBStorage {
  private db?: IDBDatabase;

  constructor() {
    super();
  }

  async getDB() {
    const { promise, resolve, reject } = Promise.withResolvers<IDBDatabase>();

    if (this.db) {
      return this.db;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(CREDENTIALS_STORE)) {
          db.createObjectStore(CREDENTIALS_STORE);
        }
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE);
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };

      return promise;
    } catch (cause) {
      throw new Error("Couldn't initialize IndexedDB", { cause });
    }
  }

  async getAllCredentials() {
    return await super.getAll<Record<string, StoredCredential>>(
      CREDENTIALS_STORE
    );
  }

  async getCredentials(username: string) {
    return (
      (await this.get<Record<string, StoredCredential>>(
        CREDENTIALS_STORE,
        username
      )) ?? {}
    );
  }

  async saveCredential(username: string, credential: StoredCredential) {
    const credentials = await this.getCredentials(username);
    credentials[credential.id] = credential;

    return this.set(CREDENTIALS_STORE, username, credentials);
  }

  async setCredentials(
    username: string,
    credentials: Record<string, StoredCredential>
  ) {
    return this.set(CREDENTIALS_STORE, username, credentials);
  }

  async getExpiration() {
    return this.get<number | undefined>(SETTINGS_STORE, "expiration");
  }

  async setExpiration(timestamp: number) {
    return this.set(SETTINGS_STORE, "expiration", timestamp);
  }
}

export const credentialsDBStorage = new CredentialsStorage();
