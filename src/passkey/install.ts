// Installs `navigator.credentials` over the native passkey bridge at startup.

import { installNativePasskeyCredentials } from "./native.ts";

/** Whether the native passkey bridge is linked and supported on this device. */
export const passkeysAvailable = installNativePasskeyCredentials();
