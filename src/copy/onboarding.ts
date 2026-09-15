// Onboarding copy that depends on where Saifu runs (T-030-04, T-030-18, T-030-19).

export interface OnboardingCopy {
  readonly passkeysUnavailable: string;
  /** The offer to restore from a synced passkey; `null` where Saifu does not restore yet. */
  readonly restoreOffer: string | null;
  readonly restoreFailed: {
    readonly cancelled: string;
    readonly "not-registered": string;
    readonly unavailable: string;
  };
}

// Natively, restoring from a synced passkey is T-030-16's, and not offered yet.
export const ONBOARDING_COPY: OnboardingCopy = {
  passkeysUnavailable: "This phone cannot create passkeys, so Saifu cannot be set up on it.",
  restoreOffer: null,
  restoreFailed: {
    cancelled: "No passkey was chosen.",
    "not-registered": "That passkey has no Saifu account. Set up Saifu instead.",
    unavailable: "Saifu cannot sign you in right now. Try again in a moment.",
  },
};
