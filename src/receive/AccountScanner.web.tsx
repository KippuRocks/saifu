import type { AccountId } from "@ticketto/sdk";
import { RECEIVE_COPY } from "../copy/receive.ts";
import { QrScanner } from "./QrScanner.web.tsx";
import { accountFromReceiveCode } from "./receive-code.ts";

export interface AccountScannerProps {
  /** Called once, with the account of the first receive code scanned. */
  readonly onAccount: (account: AccountId) => void;
}

/**
 * Scans another holder's receive code (T-030-09) on Saifu Web (T-030-18), and
 * fills the receiver with its account. Codes that are not receive codes — a
 * pass, a ticket id — are ignored.
 */
export function AccountScanner({ onAccount }: AccountScannerProps) {
  return (
    <QrScanner
      instruction={RECEIVE_COPY.scanInstruction}
      onValue={onAccount}
      parse={accountFromReceiveCode}
      testID="account-scanner"
    />
  );
}
