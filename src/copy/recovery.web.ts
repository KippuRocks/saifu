// The recovery disclosure on Saifu Web (T-030-18, T-030-19; features/030-saifu/
// plan.md §5.1, §5.1a). The same disclosure as the native app's, word for word,
// except that a browser need not run on a phone — the passkey is on this device —
// and that on the web a synced passkey signs the holder in again, which Saifu Web
// can do since T-030-19 — so a second device is no longer the only way, and the
// web does not say it is. It promises no sync: whether a passkey syncs is the
// browser's or the password manager's, not Kippu's.

import { RECOVERY_DISCLOSURE as NATIVE } from "./recovery.ts";

/** The native copy with "phone" read as "device". */
export function onDevice(text: string): string {
  return text.replace(/\bphone(s?)\b/g, "device$1");
}

/** On the web a synced passkey also keeps the tickets: a second device is one way, not the only one. */
export function oneWay(text: string): string {
  return text.replace(
    /^The only way to keep your tickets if you lose (.+?) is to (.+?)\./,
    (_, what: string, action: string) => `To keep your tickets if you lose ${what}, ${action}.`,
  );
}

export const RECOVERY_DISCLOSURE = {
  title: NATIVE.title,
  paragraphs: [
    ...NATIVE.paragraphs.map((paragraph) => oneWay(onDevice(paragraph))),
    "If your browser or password manager syncs your passkey, you can sign in with it again here after this browser's data is cleared.",
  ],
} as const;
