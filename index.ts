import "./src/platform/install-polyfills.ts";
// Platform modules are imported without their extension, so Metro picks the
// `.web.ts` beside a native one for Saifu Web (T-030-18).
import "./src/passkey/install";
import { registerRootComponent } from "expo";
import { App } from "./src/App";
import { installOffline } from "./src/platform/offline";

installOffline();

// Registers the root component as `main`, for development and release builds alike.
registerRootComponent(App);
