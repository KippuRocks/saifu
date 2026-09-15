import type { HoldingsRead, HoldingView } from "../src/holdings/types.ts";

export const ACCOUNT = "a1".repeat(32);

export function pressPass(
  overrides: Partial<HoldingView["ticket"]> = {},
  passWindow: { windowMs: number; isDefault: boolean } = { windowMs: 60_000, isDefault: true },
): HoldingView {
  return {
    ticket: {
      authoritative: false,
      sequence: 7,
      id: "11".repeat(32),
      event: "22".repeat(32),
      holder: ACCOUNT,
      class: "33".repeat(32),
      provenance: "Granted",
      zone: "44".repeat(32),
      placement: { kind: "Seated", position: "412d31" },
      policy: { kind: "Single" },
      restrictions: { cannotResale: true, cannotTransfer: true },
      attendances: 0,
      kippuClass: { name: "Press" },
      classMetadataLocator: "https://meta.kippu.rocks/v0/classes/33.json",
      classMetadata: null,
      ...overrides,
    },
    event: {
      authoritative: false,
      sequence: 3,
      id: "22".repeat(32),
      owner: "55".repeat(32),
      status: "Active",
      maxCapacity: 100,
      issued: 1,
      zones: [{ id: "44".repeat(32), kind: "Seated" }],
      metadataLocator: null,
      metadata: { name: "Opening night" },
      passWindow,
    },
  };
}

export function holdingsRead(holdings: HoldingView[]): HoldingsRead {
  return { holdings, freshness: { cursor: "c", records: 9, lastRecordedAt: 1_000 } };
}
