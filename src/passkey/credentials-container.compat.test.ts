// T-030-02 — the native passkey bridge produces the bytes papi-signers does
// (REQ-SP-4, REQ-CP-6; REQ-MG-6 through F-003's compatibility suite).
//
// papi-signers' `WebAuthn` authenticator runs unmodified against this app's
// `navigator.credentials` (credentials-container.ts), with Saifu's credentials
// handler, over a bridge that returns what the native modules return: a raw
// attestation object, raw authenticator data, client data and DER signature.
// Every comparison is the one F-003's compatibility suite makes
// (libticketto packages/profile-v0/src/credential/papi-signers.compat.test.ts):
// identical account ids, device ids, attestation and assertion bytes, and
// acceptance by the V0 profile's verifier for the configured RP id.

import { p256 } from "@noble/curves/nist.js";
import { blake2b } from "@noble/hashes/blake2.js";
import {
  type Assertion,
  accountOf,
  assertionCodec,
  attestationCodec,
  COMMAND_SIGNING_TAG,
  decodeAuthorisation,
  deviceId,
  encodeAuthorisation,
  encodeRegistration,
  hashedUserId,
  holderAccountId,
  KREIVO_AUTHORITY_ID,
  PASS_SIGNING_TAG,
  registrationAccount,
  registrationChallenge,
  V0_CONTEXT,
  verify,
  webAuthnChallenge,
} from "@ticketto/profile-v0";
import { SimulatedWebAuthnAuthenticator } from "@ticketto/profile-v0/testing";
import type { AccountId, Authorisation, Registration } from "@ticketto/sdk";
import { WebAuthn } from "@virtonetwork/authenticators-webauthn";
import { afterEach, describe, expect, it } from "vitest";
import { fakeBridge } from "../../test/fake-bridge.ts";
import { AttestationObjectError } from "./attestation-object.ts";
import { fromBase64Url, toBase64Url } from "./bytes.ts";
import { createPasskeyCredentials, PasskeyRequestError } from "./credentials-container.ts";
import { SaifuCredentialsHandler } from "./credentials-handler.ts";

const RP_ID = "kippu.example";
const RP = { id: RP_ID, name: "Saifu" };

const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");
const hex = (bytes: Uint8Array) => toHex(bytes) as AccountId;

function install(container: unknown) {
  Object.defineProperty(globalThis.navigator, "credentials", {
    value: container,
    configurable: true,
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, "credentials");
});

/** The V0 challenger: the registration tag over the account on `register`; BLAKE2b-256 otherwise. */
function v0Challenger(phase: { current: "register" | "authenticate" }) {
  return (_context: number, bytes: Uint8Array) =>
    phase.current === "register"
      ? registrationChallenge(hex(bytes))
      : blake2b(bytes, { dkLen: 32 });
}

function setup(
  credentialId = crypto.getRandomValues(new Uint8Array((16 + Math.random() * 48) | 0)),
) {
  const authenticator = new SimulatedWebAuthnAuthenticator({
    rpId: RP_ID,
    secretKey: p256.utils.randomSecretKey(),
    credentialId,
  });
  const bridge = fakeBridge(authenticator);
  const stored: Uint8Array[] = [];
  const handler = new SaifuCredentialsHandler({
    relyingParty: RP,
    credentialIds: async () => stored,
    onCreated: async (_userId, rawId) => {
      stored.push(rawId);
    },
  });
  install(createPasskeyCredentials({ bridge, rpId: RP_ID }));
  return { authenticator, bridge, handler, stored };
}

describe("T-030-02 passkey bridge compatibility with papi-signers and profile-v0", () => {
  it.each(Array.from({ length: 10 }, (_, i) => i))(
    "run %i: identical account id, device id, attestation and assertion bytes",
    async () => {
      const userId = toHex(crypto.getRandomValues(new Uint8Array(32)));
      const { authenticator, bridge, handler, stored } = setup();
      const payload = new Uint8Array([
        ...(Math.random() < 0.5 ? COMMAND_SIGNING_TAG : PASS_SIGNING_TAG),
        ...crypto.getRandomValues(new Uint8Array((Math.random() * 300) | 0)),
      ]);

      const phase: { current: "register" | "authenticate" } = { current: "register" };
      const webAuthn = await new WebAuthn(userId, v0Challenger(phase), handler).setup();

      // Account ids.
      expect(toHex(webAuthn.hashedUserId)).toBe(toHex(hashedUserId(userId)));
      expect(hex(webAuthn.addressGenerator(webAuthn.hashedUserId))).toBe(holderAccountId(userId));

      // Registration.
      const attestation = await webAuthn.register(V0_CONTEXT);
      const attestationBytes = attestationCodec.enc({
        meta: {
          authority_id: attestation.meta.authority_id.asBytes(),
          device_id: attestation.meta.device_id.asBytes(),
          context: attestation.meta.context,
        },
        authenticator_data: attestation.authenticator_data.asBytes(),
        client_data: attestation.client_data.asBytes(),
        public_key: attestation.public_key.asBytes(),
      });
      expect(toHex(attestation.meta.device_id.asBytes())).toBe(
        toHex(deviceId(authenticator.credentialId)),
      );
      expect(toHex(attestation.public_key.asBytes())).toBe(toHex(authenticator.publicKeySpki));
      expect(toHex(attestation.meta.authority_id.asBytes())).toBe(toHex(KREIVO_AUTHORITY_ID));

      // What the bridge was asked for: the deployment's RP id, the registration
      // challenge over the holder's account, and the hashed user id as user handle.
      const [create] = bridge.creates;
      expect(create?.rpId).toBe(RP_ID);
      expect(create?.challenge).toBe(toBase64Url(registrationChallenge(holderAccountId(userId))));
      expect(create?.userId).toBe(toBase64Url(hashedUserId(userId)));
      expect(stored.map(toHex)).toEqual([toHex(authenticator.credentialId)]);

      // Authentication.
      phase.current = "authenticate";
      const authenticated = await webAuthn.authenticate(V0_CONTEXT, payload);
      if (authenticated === undefined) throw new Error("no assertion");
      expect(authenticated.credentials.tag).toBe("WebAuthn");
      expect(toHex(authenticated.deviceId.asBytes())).toBe(
        toHex(deviceId(authenticator.credentialId)),
      );
      const [get] = bridge.gets;
      expect(get?.allowCredentialIds).toEqual([toBase64Url(authenticator.credentialId)]);
      const assertion = assertionCodec.dec(authenticated.credentials.value) as Assertion;
      expect(toHex(assertion.meta.user_id)).toBe(toHex(hashedUserId(userId)));
      expect(toHex(assertionCodec.enc(assertion))).toBe(toHex(authenticated.credentials.value));

      // The profile accepts both, for the holder's account and this RP id.
      const registration: Registration = encodeRegistration({
        kind: "passWebAuthn",
        hashedUserId: webAuthn.hashedUserId,
        attestation: attestationCodec.dec(attestationBytes),
      });
      const authorisation: Authorisation = encodeAuthorisation({
        kind: "passWebAuthn",
        deviceId: authenticated.deviceId.asBytes(),
        assertion,
      });
      const registered = registrationAccount(registration);
      expect(registered.ok && registered.value.account).toBe(holderAccountId(userId));
      expect(accountOf(authorisation)).toEqual(registered);
      expect(verify(registration, payload, authorisation, { rpId: RP_ID })).toBe(true);
      expect(verify(registration, payload, authorisation, { rpId: "other.example" })).toBe(false);
      expect(decodeAuthorisation(authorisation).kind).toBe("passWebAuthn");
      expect(get?.challenge).toBe(toBase64Url(webAuthnChallenge(payload)));
    },
  );
});

describe("credentials container", () => {
  const userId = "00".repeat(32);

  it("refuses an RP id other than the deployment's", async () => {
    setup();
    const other = new SaifuCredentialsHandler({
      relyingParty: { id: "other.example", name: "Other" },
      credentialIds: async () => [],
      onCreated: async () => {},
    });
    const webAuthn = await new WebAuthn(userId, async () => new Uint8Array(32), other).setup();
    await expect(webAuthn.register(0)).rejects.toThrow(PasskeyRequestError);
  });

  it("refuses a ceremony without required user verification", async () => {
    setup();
    // papi-signers' default handler asks for "preferred" user verification.
    const webAuthn = await new WebAuthn(userId, async () => new Uint8Array(32)).setup();
    await expect(webAuthn.register(0)).rejects.toThrow(/user verification/);
  });

  it("rejects an attestation for a different credential id", async () => {
    const { bridge, handler } = setup(new Uint8Array(16).fill(1));
    bridge.tamperAttestation = (object) => {
      object.authData = object.authData.slice();
      object.authData[37 + 16 + 2] = 2; // first byte of the credential id
    };
    const webAuthn = await new WebAuthn(userId, async () => new Uint8Array(32), handler).setup();
    await expect(webAuthn.register(0)).rejects.toThrow(AttestationObjectError);
  });

  it("rejects an attestation whose key is not ES256 on P-256", async () => {
    const { bridge, handler } = setup(new Uint8Array(16).fill(1));
    bridge.tamperAttestation = (object) => {
      object.authData = object.authData.slice();
      const cose = 37 + 16 + 2 + 16;
      expect(object.authData[cose + 3]).toBe(0x03); // alg label
      object.authData[cose + 4] = 0x38; // -25, one extra byte: breaks ES256
    };
    const webAuthn = await new WebAuthn(userId, async () => new Uint8Array(32), handler).setup();
    await expect(webAuthn.register(0)).rejects.toThrow(AttestationObjectError);
  });

  it("returns an attestation object the container parsed exactly", async () => {
    const { bridge } = setup();
    const container = createPasskeyCredentials({ bridge, rpId: RP_ID });
    const credential = await container.create({
      publicKey: {
        challenge: new Uint8Array(32),
        rp: RP,
        user: { id: new Uint8Array(32), name: "u", displayName: "u" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: { userVerification: "required" },
      },
    });
    const response = credential.response as AuthenticatorAttestationResponse;
    expect(new Uint8Array(response.getAuthenticatorData()).length).toBeGreaterThan(37);
    expect(fromBase64Url(credential.id)).toEqual(new Uint8Array(credential.rawId));
  });
});
