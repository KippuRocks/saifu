// The receive code (T-030-09; US-D1): what a holder shows so that someone can
// send them a ticket. It carries the holder's account and nothing else — no
// secret, nothing that can use a ticket.
//
//   ticketto:account:<account id, 64 lower-case hex characters>
//
// The prefix makes the code say what it is. A ticket id and an event id are also
// 64 hex characters, and a ticket sent to one of them is gone: a scanner
// accepts only a code that names an account.

import type { AccountId } from "@ticketto/sdk";

const PREFIX = "ticketto:account:";
const ACCOUNT = /^[0-9a-f]{64}$/;

export function receiveCode(account: string): string {
  if (!ACCOUNT.test(account)) throw new TypeError("not an account id");
  return `${PREFIX}${account}`;
}

/** The account a scanned code names, or `null` for any code that is not a receive code. */
export function accountFromReceiveCode(text: string): AccountId | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  const account = trimmed.slice(PREFIX.length);
  return ACCOUNT.test(account) ? (account as AccountId) : null;
}

/** An account id in groups of eight, for reading aloud or comparing by eye. */
export function groupedAccount(account: string): string {
  return account.match(/.{1,8}/g)?.join(" ") ?? account;
}
