import { createMemoryBackend } from "@ticketto/backend-memory";
import { createProfileV0 } from "@ticketto/profile-v0";
import { INVARIANT_IDS } from "@ticketto/sdk";
import { describe, expect, it } from "vitest";
import { pressPass } from "../../test/holdings-fixture.ts";
import { matches } from "../../tools/copy-lint/vocabulary.ts";
import { ASSURANCE_COPY, assuranceLevel, HOLDER_GUARANTEES } from "./assurance.ts";
import { policyText, restrictionsText, ticketDetail } from "./detail.ts";

const declaration = createMemoryBackend({
  profile: createProfileV0({ rpId: "kippu.example" }),
}).assurance;

describe("T-030-05 ticket detail", () => {
  it("AC-B2.6: a press pass is legible as one", () => {
    const detail = ticketDetail(pressPass(), declaration);
    expect(detail).toMatchObject({
      title: "Press",
      event: "Opening night",
      place: "Seat A-1",
      provenance: "Granted by the organiser",
      policy: "Admits once",
      restrictions: "Cannot be transferred or resold",
      attendances: "Not used yet",
      eventStatus: "Active",
    });
  });

  it("falls back to the class document's name, then to a plain title", () => {
    const fromDocument = pressPass({ kippuClass: null, classMetadata: { name: "Artists" } });
    expect(ticketDetail(fromDocument, null).title).toBe("Artists");
    expect(ticketDetail(pressPass({ kippuClass: null }), null).title).toBe("Ticket");
  });

  it("states policy, restrictions and attendance count from ledger facts", () => {
    expect(policyText({ kind: "Multiple", max: 3, until: Date.UTC(2026, 9, 1) })).toBe(
      "Admits up to 3 times, until 2026-10-01",
    );
    expect(policyText({ kind: "Unlimited", until: null })).toBe("Admits any number of times");
    expect(restrictionsText({ cannotResale: true, cannotTransfer: false })).toBe(
      "Can be transferred, but not resold",
    );
    expect(restrictionsText({ cannotResale: false, cannotTransfer: false })).toBe(
      "Can be transferred and resold",
    );
    expect(ticketDetail(pressPass({ attendances: 2 }), null).attendances).toBe("Used 2 times");
  });
});

describe("T-030-05 assurance level", () => {
  it("REQ-SDK-6: splits the backend's declaration into enforced and attested guarantees", () => {
    const level = assuranceLevel(declaration);
    const worded = INVARIANT_IDS.filter((id) => HOLDER_GUARANTEES[id] !== null);
    expect(level.enforced.length + level.attested.length).toBe(worded.length);
    for (const id of worded) {
      const text = HOLDER_GUARANTEES[id] as string;
      expect(declaration[id] === "enforced" ? level.enforced : level.attested).toContain(text);
    }
    // The hosted backend enforces single use of a pass, and attests attendance monotonicity (§4.4).
    expect(level.enforced).toContain(HOLDER_GUARANTEES["INV-6"]);
    expect(level.attested).toContain(HOLDER_GUARANTEES["INV-3"]);
  });

  it("shows an undeclared invariant as attested, never enforced", () => {
    const { "INV-6": _, ...partial } = declaration;
    expect(assuranceLevel(partial as typeof declaration).attested).toContain(
      HOLDER_GUARANTEES["INV-6"],
    );
  });

  it("REQ-TM-2: no assurance wording claims trust properties or mentions fees", () => {
    const words = [...Object.values(HOLDER_GUARANTEES), ...Object.values(ASSURANCE_COPY)]
      .filter((t): t is string => t !== null)
      .join("\n");
    expect(matches(words)).toEqual([]);
  });
});
