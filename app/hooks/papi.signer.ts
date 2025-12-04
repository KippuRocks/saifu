"use client";

import { type AccountId } from "@ticketto/types";
import { PolkadotSigner } from "polkadot-api";

import {
  DEV_PHRASE,
  mnemonicToMiniSecret,
  ss58Address,
} from "@polkadot-labs/hdkd-helpers";
import { getPolkadotSigner } from "polkadot-api/signer";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";

export type PapiSigner = {
  address: AccountId;
  signer: PolkadotSigner;
};

export async function getPapiSigner(username: string) {
  const derive = sr25519CreateDerive(mnemonicToMiniSecret(DEV_PHRASE));
  const { publicKey, sign } = derive(`//${username}`);

  return {
    address: ss58Address(publicKey),
    signer: getPolkadotSigner(publicKey, "Sr25519", sign),
  } as PapiSigner;
}
