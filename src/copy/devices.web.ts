// Copy for adding a second device on Saifu Web (T-030-13, T-030-18, T-030-19):
// the native copy, with "phone" read as "device" — the same platform-aware
// wording pattern the recovery disclosure and onboarding copy already use.
// Scanning a code and confirming a credential work the same way in a browser
// as they do natively, so nothing beyond that reading changes.
//
// Applied to every string in the object, not spelled out field by field: a
// future field added to the native copy is read the same way here without
// this file needing to be told about it, which is exactly what was missed for
// T-030-13's screens (they imported "./devices.ts" with its extension, which
// skips Metro's platform resolution, so Saifu Web rendered the native strings
// verbatim).

import { DEVICES_COPY as NATIVE } from "./devices.ts";
import { onDevice } from "./recovery.web.ts";

type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };

function readOnDevice<T>(value: T): DeepReadonly<T> {
  if (typeof value === "string") return onDevice(value) as DeepReadonly<T>;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        readOnDevice(entry),
      ]),
    ) as DeepReadonly<T>;
  }
  return value as DeepReadonly<T>;
}

export const DEVICES_COPY: DeepReadonly<typeof NATIVE> = readOnDevice(NATIVE);
