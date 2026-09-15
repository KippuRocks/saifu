// T-030-13 against the real system (see holder.system.test.ts for when it runs):
// a second device joins an existing account; the existing device registers it,
// sponsored, on the ledger service; the new device waits for it, links to Kippu
// with its own credential, and produces a pass.

import { registrationAccount, verifyPass } from "@ticketto/profile-v0";
import type { AccountId, Signer } from "@ticketto/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { type AddDeviceStep, addDeviceFlow } from "../../src/devices/add.ts";
import {
  addDeviceCode,
  deviceRegistrationCode,
  registrationFromDeviceCode,
  shortCode,
  userHandleFromAddDeviceCode,
} from "../../src/devices/codes.ts";
import { listDevices } from "../../src/devices/list.ts";
import { holderCredential } from "../../src/holder/credential.ts";
import { waitForJoinedRegistration } from "../../src/holder/register.ts";
import { memoryHolderStore } from "../../src/holder/store.ts";
import { kippuClient } from "../../src/kippu/client.ts";
import { linkHolder } from "../../src/kippu/link.ts";
import { produceTicketPass } from "../../src/passes/produce.ts";
import { simulatedDevice } from "../holder-device.ts";
import { ledger, linkedHolder, stack, stackAvailable } from "./stack.ts";

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

describe.skipIf(!stackAvailable)(
  "T-030-13 second device against the relay and the ledger service",
  () => {
    it("REQ-CP-6: a second device registers, authorised by the first, links, and can produce passes", async () => {
      const a = await linkedHolder();
      const aDevice = { install: () => {} };
      // Capture the first phone's device, then set up the second.
      const first = navigator.credentials;
      aDevice.install = () =>
        Object.defineProperty(globalThis.navigator, "credentials", {
          value: first,
          configurable: true,
        });
      const aSigner: Signer = {
        account: a.holder.signer.account,
        sign: async (payload) => {
          aDevice.install();
          return a.holder.signer.sign(payload);
        },
      };

      const userHandle = userHandleFromAddDeviceCode(addDeviceCode(a.holder.record.userHandle));
      if (userHandle === null) throw new Error("add-device code");
      const bDevice = simulatedDevice(stack.rpId);
      const bStore = memoryHolderStore();
      const b = await holderCredential({
        rpId: stack.rpId,
        store: bStore,
        joinUserHandle: userHandle,
      });

      const registration = registrationFromDeviceCode(
        deviceRegistrationCode(b.registration),
        a.holder.account,
      );
      if (registration === null) throw new Error("registration code");
      const connected = await ledger();
      if (!connected.ok) throw new Error(connected.error.code);
      const steps: AddDeviceStep[] = [];
      const flow = addDeviceFlow(a.holder.account as AccountId, registration, {
        ledger: connected.value,
        signer: aSigner,
        onStep: (step) => steps.push(step),
      });
      await flow.begin();
      expect(steps).toEqual([{ kind: "confirm", shortCode: shortCode(b.registration) }]);
      await flow.confirm();
      expect(steps.at(-1)?.kind).toBe("done");

      bDevice.install();
      expect(
        await waitForJoinedRegistration(connected.value, b, bStore, {
          attempts: 10,
          intervalMs: 500,
        }),
      ).toBe(true);
      const session = await linkHolder(kippuClient({ url: stack.kippuUrl as string }), b, bStore);
      const current = await kippuClient({
        url: stack.kippuUrl as string,
        token: () => session.token,
      }).auth.session.current.query();
      expect(current.principal).toMatchObject({ kind: "holder", account: a.holder.account });

      // Settings on either phone lists both devices, marking the one it was linked with.
      const bKippu = kippuClient({ url: stack.kippuUrl as string, token: () => session.token });
      await bKippu.derived.waitFor.query({
        cursor: (steps.at(-1) as { receipt: { cursor: string } }).receipt.cursor,
        timeout: 10_000,
      });
      const fromB = await listDevices(bKippu);
      const fromA = await listDevices(a.kippu);
      const bCredential = registrationAccount(b.registration);
      const aCredential = registrationAccount(a.holder.registration);
      if (!bCredential.ok || !aCredential.ok) throw new Error("no credential");
      expect(fromB?.map((d) => [d.credential, d.thisDevice])).toEqual([
        [aCredential.value.credential, false],
        [bCredential.value.credential, true],
      ]);
      expect(fromA?.map((d) => [d.credential, d.thisDevice])).toEqual([
        [aCredential.value.credential, true],
        [bCredential.value.credential, false],
      ]);

      const named = registrationAccount(b.registration);
      if (!named.ok) throw new Error("no account");
      const onLedger = await connected.value.getCredential(b.account, named.value.credential);
      if (!onLedger.ok || onLedger.value === null) throw new Error("not registered");
      const pass = await produceTicketPass("11".repeat(32), b.signer);
      expect(
        verifyPass(pass.signed, onLedger.value, { now: Date.now }, { rpId: stack.rpId }).ok,
      ).toBe(true);
    });
  },
);
