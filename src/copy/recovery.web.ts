// The recovery disclosure on Saifu Web (T-030-18; features/030-saifu/plan.md
// §5.1, §5.1a). The same disclosure as the native app's, word for word, except
// that a browser need not run on a phone: the passkey is on this device.

import { RECOVERY_DISCLOSURE as NATIVE } from "./recovery.ts";

/** The native copy with "phone" read as "device". */
export function onDevice(text: string): string {
  return text.replace(/\bphone(s?)\b/g, "device$1");
}

export const RECOVERY_DISCLOSURE = {
  title: NATIVE.title,
  paragraphs: NATIVE.paragraphs.map(onDevice),
} as const;
