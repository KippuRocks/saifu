// The recovery disclosure (T-030-04; features/030-saifu/plan.md §5.1; DEF-7,
// REQ-SP-4, REQ-TM-2). Shown at onboarding, before a passkey is created, and
// again in settings. Plain language: what the holder controls, and what nobody
// can do for them.

export const RECOVERY_DISCLOSURE = {
  title: "Only you can reach your tickets",
  paragraphs: [
    "Saifu keeps your tickets under a passkey on this phone. You unlock it with your face, your fingerprint or your screen lock. There is nothing to write down.",
    "Kippu never has your passkey, so Kippu cannot recover it if it is lost.",
    "If you lose your passkey, you lose the tickets it holds. Kippu's support team cannot move tickets back to you.",
  ],
} as const;
