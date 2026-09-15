// Onboarding copy on Saifu Web (T-030-18, T-030-19): a browser without passkeys,
// which includes any page not served over https, and signing in again with a
// synced passkey after this browser's data was cleared.

import { ONBOARDING_COPY as NATIVE, type OnboardingCopy } from "./onboarding.ts";

export const ONBOARDING_COPY: OnboardingCopy = {
  passkeysUnavailable: "This browser cannot create passkeys, so Saifu cannot be set up in it.",
  restoreOffer: "I already use Saifu: sign in with my passkey",
  restoreFailed: NATIVE.restoreFailed,
};
