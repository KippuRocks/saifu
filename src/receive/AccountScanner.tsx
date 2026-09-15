import type { AccountId } from "@ticketto/sdk";
import { RECEIVE_COPY } from "../copy/receive.ts";
import { QrScanner } from "./QrScanner.tsx";
import { accountFromReceiveCode } from "./receive-code.ts";

export interface AccountScannerProps {
  /** Called once, with the account of the first receive code scanned. */
  readonly onAccount: (account: AccountId) => void;
}

/**
 * Scans another holder's receive code (T-030-09) and fills the receiver with
 * its account. Codes that are not receive codes — a pass, a ticket id — are
 * ignored. Used where a ticket's receiver is chosen (T-030-08).
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
