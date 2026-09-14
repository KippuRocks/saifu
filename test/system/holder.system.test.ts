// T-030-03 against the real system: the ledger service (`ticketto-offchain`,
// through `binding-offchain`), Kippu's sponsor relay, and kippu-api wired to that
// same ledger (its `staging` wiring). kippu-api's `development` wiring keeps its
// ledger inside its own process, where no client can reach it, so a holder's
// direct write (REQ-CL-1) needs the ledger service.
//
// The ledger service is private, so this suite runs only where the stack is
// available: locally, and in kippu-e2e (F-070). It is skipped unless all of
//   SAIFU_TEST_LEDGER_URL, SAIFU_TEST_SPONSOR_URL, SAIFU_TEST_KIPPU_API_URL
// are set; SAIFU_TEST_RP_ID is the holder RP id the stack was started with.

import { registrationAccount } from "@ticketto/profile-v0";
import { afterEach, describe, expect, it } from "vitest";
import { holderCredential, toHex } from "../../src/holder/credential.ts";
import { registerHolderCredential } from "../../src/holder/register.ts";
import { memoryHolderStore } from "../../src/holder/store.ts";
import { kippuClient } from "../../src/kippu/client.ts";
import { linkHolder } from "../../src/kippu/link.ts";
import { connectLedger } from "../../src/ledger/ticketto.ts";
import { simulatedDevice } from "../holder-device.ts";

const env = process.env;
const ledgerUrl = env.SAIFU_TEST_LEDGER_URL;
const sponsorUrl = env.SAIFU_TEST_SPONSOR_URL;
const kippuUrl = env.SAIFU_TEST_KIPPU_API_URL;
const rpId = env.SAIFU_TEST_RP_ID ?? "kippu.example";
const available = ledgerUrl !== undefined && sponsorUrl !== undefined && kippuUrl !== undefined;

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

describe.skipIf(!available)("T-030-03 against the ledger service and kippu-api", () => {
  it("the credential registers on the ledger, and a signed challenge links the account", async () => {
    simulatedDevice(rpId);
    const store = memoryHolderStore();
    const holder = await holderCredential({ rpId, store });

    const ledger = await connectLedger({
      ledgerUrl: ledgerUrl as string,
      sponsorUrl: sponsorUrl as string,
      rpId,
    });
    if (!ledger.ok) throw new Error(`ledger: ${ledger.error.code}`);
    const registered = await registerHolderCredential(ledger.value, holder, store);
    if (!registered.ok) throw new Error(`registration: ${registered.error.code}`);

    const named = registrationAccount(holder.registration);
    if (!named.ok) throw new Error("registration names no account");
    const onLedger = await ledger.value.getCredential(holder.account, named.value.credential);
    expect(onLedger.ok && onLedger.value !== null && toHex(onLedger.value)).toBe(
      toHex(holder.registration),
    );

    const session = await linkHolder(kippuClient({ url: kippuUrl as string }), holder, store);
    const authenticated = kippuClient({ url: kippuUrl as string, token: () => session.token });
    const current = await authenticated.auth.session.current.query();
    expect(current.principal).toMatchObject({ kind: "holder", account: holder.account });
  });
});
