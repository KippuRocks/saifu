export abstract class IndexedDBStorage {
  abstract getDB(): Promise<IDBDatabase>;

  private async executeRequest<T = void>(
    storeName: string,
    mode: IDBTransactionMode,
    f: (store: IDBObjectStore) => IDBRequest
  ) {
    const db = await this.getDB();
    const { promise, resolve, reject } = Promise.withResolvers<T>();

    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    const request = f(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    return promise;
  }

  async getAll<T>(storeName: string, query?: IDBValidKey | IDBKeyRange | null) {
    return this.executeRequest<T[]>(storeName, "readonly", (store) =>
      store.getAll(query)
    );
  }

  async get<T>(storeName: string, key: IDBValidKey | IDBKeyRange) {
    return this.executeRequest<T>(storeName, "readonly", (store) =>
      store.get(key)
    );
  }

  async set<T>(storeName: string, key: IDBValidKey, value: T) {
    return this.executeRequest(storeName, "readwrite", (store) =>
      store.put(value, key)
    );
  }
}
