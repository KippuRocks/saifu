// Saifu Web's passkeys (T-030-18; features/030-saifu/plan.md §5.1a): the
// browser's own `navigator.credentials`, which papi-signers' WebAuthn
// authenticator calls unmodified. Nothing is installed. The browser binds every
// ceremony to the page's origin, so the build's RP id must be the web origin's
// host — `saifu.kippu.rocks`, served at `https://saifu.kippu.rocks`.
//
// Saifu's credentials handler asks for a platform authenticator, a discoverable
// credential and user verification on every ceremony, as on iOS and Android.

/** Whether this browser can create and use passkeys: a secure context with WebAuthn. */
export function webPasskeysAvailable(scope: typeof globalThis = globalThis): boolean {
  const browser = scope as {
    isSecureContext?: boolean;
    PublicKeyCredential?: unknown;
    navigator?: { credentials?: { create?: unknown; get?: unknown } };
  };
  return (
    browser.isSecureContext === true &&
    typeof browser.PublicKeyCredential === "function" &&
    typeof browser.navigator?.credentials?.create === "function" &&
    typeof browser.navigator.credentials.get === "function"
  );
}

/** Whether passkeys are available in this browser. */
export const passkeysAvailable = webPasskeysAvailable();
