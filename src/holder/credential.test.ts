import {
  accountOf,
  decodeRegistration,
  holderAccountId,
  registrationAccount,
  registrationChallenge,
  verify,
  webAuthnChallenge,
} from "@ticketto/profile-v0";
import { afterEach, describe, expect, it } from "vitest";
import { simulatedDevice } from "../../test/holder-device.ts";
import { toBase64Url } from "../passkey/bytes.ts";
import { fromHex, holderCredential, toHex } from "./credential.ts";
import { memoryHolderStore } from "./store.ts";

const RP_ID = "kippu.example";

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

const clientChallenge = (clientData: Uint8Array) =>
  (JSON.parse(new TextDecoder().decode(clientData)) as { challenge: string }).challenge;

describe("T-030-03 holder credential", () => {
  it("provisions a passkey for a random user id, and derives its Kreivo Pass account", async () => {
    const { authenticator, bridge } = simulatedDevice(RP_ID);
    const store = memoryHolderStore();
    const holder = await holderCredential({ rpId: RP_ID, store });

    const record = await store.load();
    expect(record).toEqual(holder.record);
    expect(record?.userId).toMatch(/^[0-9a-f]{64}$/);
    expect(record?.registered).toBe(false);
    expect(record?.credentialIds).toEqual([toBase64Url(authenticator.credentialId)]);
    expect(holder.account).toBe(holderAccountId(holder.record.userId));

    // User verification required, bound to the RP id.
    expect(bridge.creates).toHaveLength(1);
    expect(bridge.creates[0]?.rpId).toBe(RP_ID);

    // The registration names the account, and its attestation challenge carries the registration tag.
    const named = registrationAccount(holder.registration);
    expect(named.ok && named.value.account).toBe(holder.account);
    const decoded = decodeRegistration(holder.registration);
    if (decoded.kind !== "passWebAuthn") throw new Error("expected a pass-webauthn registration");
    expect(clientChallenge(decoded.attestation.client_data)).toBe(
      toBase64Url(registrationChallenge(holder.account)),
    );
  });

  it("signs the payload it is given, with no registration tag, verifiably for the RP id", async () => {
    const { bridge } = simulatedDevice(RP_ID);
    const holder = await holderCredential({ rpId: RP_ID, store: memoryHolderStore() });
    const payload = new TextEncoder().encode("ticketto/v0/command payload");

    const authorisation = await holder.signer.sign(payload);

    expect(bridge.gets[0]?.challenge).toBe(toBase64Url(webAuthnChallenge(payload)));
    expect(bridge.gets[0]?.allowCredentialIds).toEqual(holder.record.credentialIds);
    expect(verify(holder.registration, payload, authorisation, { rpId: RP_ID })).toBe(true);
    expect(verify(holder.registration, payload, authorisation, { rpId: "other.example" })).toBe(
      false,
    );
    const claimed = accountOf(authorisation);
    expect(claimed.ok && claimed.value.account).toBe(holder.account);
  });

  it("loads the stored credential instead of creating another passkey", async () => {
    const { bridge } = simulatedDevice(RP_ID);
    const store = memoryHolderStore();
    const first = await holderCredential({ rpId: RP_ID, store });
    const again = await holderCredential({ rpId: RP_ID, store });

    expect(bridge.creates).toHaveLength(1);
    expect(again.account).toBe(first.account);
    const payload = new Uint8Array([1, 2, 3]);
    expect(
      verify(first.registration, payload, await again.signer.sign(payload), { rpId: RP_ID }),
    ).toBe(true);
  });

  it("runs overlapping signatures one ceremony at a time", async () => {
    const { bridge } = simulatedDevice(RP_ID);
    const holder = await holderCredential({ rpId: RP_ID, store: memoryHolderStore() });
    const payloads = [1, 2, 3].map((n) => new Uint8Array([n]));
    const signed = await Promise.all(payloads.map((p) => holder.signer.sign(p)));
    signed.forEach((authorisation, i) => {
      expect(
        verify(holder.registration, payloads[i] as Uint8Array, authorisation, { rpId: RP_ID }),
      ).toBe(true);
    });
    expect(bridge.gets.map((g) => g.challenge)).toEqual(
      payloads.map((p) => toBase64Url(webAuthnChallenge(p))),
    );
  });
});

describe("T-030-03 holder account ids match profile-v0's vectors", async () => {
  const vectors = (await import("@ticketto/profile-v0/vectors/v0.json", { with: { type: "json" } }))
    .default as {
    rpId: string;
    identifiers: {
      holderAccount: { userId: string; account: string; registrationChallenge: string }[];
    };
  };

  it.each(vectors.identifiers.holderAccount)("user id $userId", async (vector) => {
    simulatedDevice(vectors.rpId);
    const holder = await holderCredential({
      rpId: vectors.rpId,
      store: memoryHolderStore(),
      randomBytes: () => fromHex(vector.userId),
    });
    expect(holder.record.userId).toBe(vector.userId);
    expect(holder.account).toBe(vector.account);
    expect(toHex(registrationChallenge(holder.account))).toBe(vector.registrationChallenge);
  });
});
