import { describe, expect, it } from "vitest";
import type { HolderRecord } from "../holder/store.ts";
import { phaseFor } from "./holder-state.ts";

const record: HolderRecord = {
  userId: "ab".repeat(32),
  credentialIds: ["AQID"],
  registration: "00",
  registered: true,
  kippuSession: { token: "t", expiresAt: 2_000 },
};

describe("T-030-04 onboarding until the credential is registered and linked", () => {
  it("onboards a device with no credential", () => {
    expect(phaseFor(null, null, 0)).toEqual({ kind: "onboarding", failed: false });
  });

  it("resumes onboarding when registration or linking did not finish", () => {
    expect(phaseFor({ ...record, registered: false }, "acc", 1_000).kind).toBe("onboarding");
    const { kippuSession: _, ...unlinked } = record;
    expect(phaseFor(unlinked, "acc", 1_000).kind).toBe("onboarding");
    expect(phaseFor(record, "acc", 2_000).kind).toBe("onboarding");
  });

  it("is ready once registered and linked", () => {
    expect(phaseFor(record, "acc", 1_000)).toEqual({ kind: "ready", account: "acc" });
  });
});
