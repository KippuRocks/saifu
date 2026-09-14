// The native passkey bridge (src/passkey/bridge.ts describes its contract).

import { requireOptionalNativeModule } from "expo";
import type { PasskeyBridge } from "../../src/passkey/bridge.ts";

/** The bridge, or `null` where the native module is not linked (Expo Go, web, tests). */
export const SaifuPasskey: PasskeyBridge | null =
  requireOptionalNativeModule<PasskeyBridge>("SaifuPasskey");
