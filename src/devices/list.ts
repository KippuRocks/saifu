// The devices registered to the holder's account, for Settings (T-030-13;
// REQ-CP-6), from kippu-api's holder read of the account's credentials
// (T-025-13). A holder can see a device they did not add; V0 cannot remove one.

import type { AppRouter } from "@kippu/api";
import type { inferRouterOutputs } from "@trpc/server";

export type HolderCredentialsRead = inferRouterOutputs<AppRouter>["derived"]["credentials"]["mine"];

export interface DeviceRow {
  readonly credential: string;
  /** When the ledger recorded the device's registration (Unix ms). */
  readonly registeredAt: number;
  /** This phone: the credential the Kippu session was linked with. */
  readonly thisDevice: boolean;
}

export interface CredentialsApi {
  readonly derived: {
    readonly credentials: { readonly mine: { query(): Promise<HolderCredentialsRead> } };
  };
}

export function deviceRows(read: HolderCredentialsRead): DeviceRow[] {
  return read.credentials.map((c) => ({
    credential: c.credential,
    registeredAt: c.registeredAt,
    thisDevice: c.linkedThisSession,
  }));
}

/** The account's devices, or `null` when Kippu cannot be read. */
export async function listDevices(kippu: CredentialsApi): Promise<DeviceRow[] | null> {
  try {
    return deviceRows(await kippu.derived.credentials.mine.query());
  } catch {
    return null;
  }
}
