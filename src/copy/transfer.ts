// Copy for transferring a ticket (T-030-08; REQ-FR-3).

export const TRANSFER_COPY = {
  action: "Transfer this ticket",
  title: "Transfer this ticket",
  receiverLabel: "Who receives it",
  receiverHint: "Scan their receive code, or type their account.",
  scan: "Scan a receive code",
  continue: "Continue",
  back: "Back",
  receiverProblems: {
    malformed: "That is not an account. Scan the receive code in their Saifu.",
    "own-account": "That is your own account.",
    "ticket-id": "That is a ticket, not an account. A ticket sent to it would be lost.",
    "event-id": "That is an event, not an account. A ticket sent to it would be lost.",
  },
  warningTitle: "Is this person paying you?",
  warningBody:
    "You have not sent a ticket to this account before. A transfer involves no payment: if you are selling this ticket, nothing here makes sure you get paid. Once sent, a transfer cannot be undone, and nobody at Kippu can move the ticket back.",
  warningConfirm: "I understand, transfer it",
  warningCancel: "Don't transfer",
  signing: "Confirm with your face, fingerprint or screen lock to transfer the ticket.",
  recorded: "Transferred. Updating your tickets…",
  done: "The ticket has been transferred.",
  doneLagging: "The ticket has been transferred. It may take a moment to leave your tickets.",
  finish: "Back to your tickets",
  failures: {
    cancelled: "Nothing was transferred.",
    "ERR-CannotTransfer": "This ticket cannot be transferred.",
    "ERR-NotOwner": "You no longer hold this ticket.",
    "ERR-EventFinished": "The event is over, so its tickets can no longer move.",
    "ERR-LedgerUnavailable": "The transfer could not be sent. Check your connection and try again.",
    "ERR-SponsorshipRefused": "The transfer was not accepted. Try again later.",
  },
  failedOther: "The transfer did not go through. Nothing was moved.",
} as const;
