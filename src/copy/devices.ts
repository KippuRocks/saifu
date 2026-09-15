// Copy for adding a second device (T-030-13; features/030-saifu/plan.md
// "Second device").

export const DEVICES_COPY = {
  listTitle: "Your devices",
  listIntro: "Every device registered to your account can use all of your tickets.",
  cannotRemove:
    "Saifu cannot remove a device yet. If you see one you did not add, it can still use your tickets.",
  thisDevice: "This phone",
  otherDevice: "Another device",
  listUnavailable: "Your devices cannot be listed right now.",
  add: "Add a device",
  addTitle: "Add a device",
  addStepOne:
    "1. On the new phone, open Saifu and choose \u201cI already use Saifu on another phone\u201d. Scan this code with it.",
  addStepTwo: "2. Then scan the code the new phone shows.",
  scanNew: "Scan the new phone's code",
  scanNewInstruction: "Point the camera at the code on the new phone.",
  confirmTitle: "Give this phone full control of your tickets?",
  confirmBody:
    "The new phone will be able to use, and transfer, every ticket you hold, now and in the future. This cannot be undone: Saifu cannot remove a device.",
  confirmCode: "Check the new phone shows this code",
  confirmYes: "Yes, add this phone",
  confirmNo: "Don't add it",
  signing: "Confirm with your face, fingerprint or screen lock to add the phone.",
  added: "The new phone has been added. It will finish setting up on its own.",
  failures: {
    cancelled: "The phone was not added.",
    "already-registered": "That phone is already one of your devices.",
    "ERR-InvalidAuthorisation": "That code is not for your account. Nothing was added.",
    "ERR-LedgerUnavailable": "The phone could not be added. Check your connection and try again.",
    "ERR-SponsorshipRefused": "The phone could not be added right now. Try again later.",
  },
  failedOther: "The phone was not added.",
  done: "Back to settings",
  back: "Back",
  joinOffer: "I already use Saifu on another phone",
  joinTitle: "Use Saifu on this phone too",
  joinScan:
    "On your other phone, open Settings, then Add a device, and scan its code with this phone.",
  joinScanInstruction: "Point the camera at the code on your other phone.",
  joinShow: "Now scan this code with your other phone, and check both phones show the same number.",
  joinWaiting: "Waiting for your other phone to add this one…",
  joinTimedOut: "Your other phone has not added this one yet.",
  joinRetry: "Keep waiting",
  joinFailed: "This phone could not be set up to join your account.",
} as const;
