// The Ticketto SDK as Saifu uses it: the V0 profile for the deployment's holder
// RP id, a backend, and Kippu's sponsor relay (T-030-03; REQ-CL-1, REQ-SP-1a).
//
// Saifu writes to the ledger directly through the SDK: never through Kippu's
// APIs. In the app the backend is `binding-offchain`, talking to the ledger
// service, and every write is sponsored through the relay, so no flow ever
// shows a fee or a funding step. Tests pass `backend-memory` and a local
// sponsor instead.

import { createRelaySponsor } from "@kippu/sponsorship";
import { connectOffchainBackend } from "@ticketto/binding-offchain";
import { createProfileV0 } from "@ticketto/profile-v0";
import {
  type Backend,
  createTicketto,
  type Result,
  type Sponsor,
  type Ticketto,
} from "@ticketto/sdk";

/**
 * How long a command Saifu signs stays valid (`AD-15`, which sets no default).
 * A holder's command is signed and submitted at once, so five minutes covers a
 * slow network and retries while keeping a lost or delayed command's life short;
 * the ledger's own maximum is 24 hours.
 */
export const OPERATION_LIFETIME_MS = 5 * 60 * 1000;

export interface SaifuTickettoOptions {
  readonly backend: Backend;
  readonly sponsor: Sponsor;
  readonly rpId: string;
}

export function saifuTicketto(options: SaifuTickettoOptions): Ticketto {
  return createTicketto({
    backend: options.backend,
    profile: createProfileV0({ rpId: options.rpId }),
    sponsor: options.sponsor,
    operationLifetime: OPERATION_LIFETIME_MS,
  });
}

export interface LedgerEndpoints {
  /** The ledger service's base URL. */
  readonly ledgerUrl: string;
  /** Kippu's sponsor relay's base URL. */
  readonly sponsorUrl: string;
  readonly rpId: string;
}

/**
 * Connects to the ledger service (reading its assurance declaration) and returns
 * the SDK over it, sponsored through the relay. Answers `ERR-LedgerUnavailable`
 * when the service cannot be reached.
 */
export async function connectLedger(endpoints: LedgerEndpoints): Promise<Result<Ticketto>> {
  const backend = await connectOffchainBackend({ url: endpoints.ledgerUrl });
  if (!backend.ok) return backend;
  return {
    ok: true,
    value: saifuTicketto({
      backend: backend.value,
      sponsor: createRelaySponsor({ url: endpoints.sponsorUrl }),
      rpId: endpoints.rpId,
    }),
  };
}
