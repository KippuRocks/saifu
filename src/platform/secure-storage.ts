// Where the holder record lives (src/holder/store.ts): the platform's secure
// storage — the Keychain on iOS, the Keystore-backed store on Android. Saifu
// Web has its own adapter beside this one (secure-storage.web.ts).

import * as SecureStore from "expo-secure-store";
import type { SecureStorage } from "../holder/store.ts";

export const secureStorage: SecureStorage = SecureStore;
