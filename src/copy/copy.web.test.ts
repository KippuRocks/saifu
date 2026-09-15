import { describe, expect, it } from "vitest";
import { matches } from "../../tools/copy-lint/vocabulary.ts";
import { ONBOARDING_COPY } from "./onboarding.ts";
import { ONBOARDING_COPY as WEB_ONBOARDING_COPY } from "./onboarding.web.ts";
import { RECOVERY_DISCLOSURE } from "./recovery.ts";
import { onDevice, RECOVERY_DISCLOSURE as WEB_DISCLOSURE } from "./recovery.web.ts";

describe("T-030-18 Saifu Web copy", () => {
  const web = [WEB_DISCLOSURE.title, ...WEB_DISCLOSURE.paragraphs].join("\n");

  it("DEF-7: the web disclosure is the native one, on a device rather than a phone", () => {
    expect(WEB_DISCLOSURE.title).toBe(RECOVERY_DISCLOSURE.title);
    expect(WEB_DISCLOSURE.paragraphs).toHaveLength(RECOVERY_DISCLOSURE.paragraphs.length);
    expect(web).toMatch(/Kippu cannot recover it/);
    expect(web).toMatch(/support team cannot move tickets back/);
    expect(web).toMatch(/nothing to write down/);
    expect(web).not.toMatch(/phone/);
    expect(onDevice("a second phone of yours; either phone; phones")).toBe(
      "a second device of yours; either device; devices",
    );
  });

  it("REQ-TM-2: passes the copy lint", () => {
    expect(matches(web)).toEqual([]);
    expect(matches(WEB_ONBOARDING_COPY.passkeysUnavailable)).toEqual([]);
    expect(matches(ONBOARDING_COPY.passkeysUnavailable)).toEqual([]);
  });
});
