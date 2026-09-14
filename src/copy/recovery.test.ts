import { describe, expect, it } from "vitest";
import { matches } from "../../tools/copy-lint/vocabulary.ts";
import { RECOVERY_DISCLOSURE } from "./recovery.ts";

describe("T-030-04 recovery disclosure", () => {
  const text = [RECOVERY_DISCLOSURE.title, ...RECOVERY_DISCLOSURE.paragraphs].join("\n");

  it("DEF-7: says Kippu cannot recover a lost credential, and support cannot move tickets back", () => {
    expect(text).toMatch(/Kippu cannot recover it/);
    expect(text).toMatch(/support team cannot move tickets back/);
  });

  it("REQ-SP-4: says the credential is the holder's, with nothing to write down", () => {
    expect(text).toMatch(/Kippu never has your passkey/);
    expect(text).toMatch(/nothing to write down/);
  });

  it("REQ-TM-2: passes the copy lint", () => {
    expect(matches(text)).toEqual([]);
  });
});
