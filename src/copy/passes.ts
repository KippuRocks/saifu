// Copy for access passes (T-030-07; features/030-saifu/plan.md §5.3).
//
// OQ-24 is open: a code on screen can be photographed and used within its
// window. The copy says so plainly and claims nothing more.

export const PASS_COPY = {
  instruction: "Show this code at the entrance. It changes before it expires.",
  exposure:
    "Anyone who scans this code before it expires can use it once, so show it only at the entrance.",
  validFor: (seconds: number) =>
    seconds === 1 ? "Valid for 1 more second" : `Valid for ${seconds} more seconds`,
  expired: "This code has expired.",
  signing: "Confirm with your face, fingerprint or screen lock to show your code.",
  stopped: "Your code is no longer being refreshed.",
  failed: "Your code could not be made. Nothing was sent anywhere.",
  showNew: "Show a new code",
  back: "Back",
} as const;
