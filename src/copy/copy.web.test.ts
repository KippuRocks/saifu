import { describe, expect, it } from "vitest";
import { matches } from "../../tools/copy-lint/vocabulary.ts";
import { ONBOARDING_COPY } from "./onboarding.ts";
import { ONBOARDING_COPY as WEB_ONBOARDING_COPY } from "./onboarding.web.ts";
import { RECOVERY_DISCLOSURE } from "./recovery.ts";
import { onDevice, oneWay, RECOVERY_DISCLOSURE as WEB_DISCLOSURE } from "./recovery.web.ts";

describe("T-030-18 Saifu Web copy", () => {
  const web = [WEB_DISCLOSURE.title, ...WEB_DISCLOSURE.paragraphs].join("\n");

  it("DEF-7: the web disclosure is the native one, on a device rather than a phone", () => {
    expect(WEB_DISCLOSURE.title).toBe(RECOVERY_DISCLOSURE.title);
    expect(WEB_DISCLOSURE.paragraphs.slice(0, RECOVERY_DISCLOSURE.paragraphs.length)).toEqual(
      RECOVERY_DISCLOSURE.paragraphs.map((paragraph) => oneWay(onDevice(paragraph))),
    );
    expect(web).toMatch(/Kippu cannot recover it/);
    expect(web).toMatch(/support team cannot move tickets back/);
    expect(web).toMatch(/nothing to write down/);
    expect(web).not.toMatch(/phone/);
    expect(onDevice("a second phone of yours; either phone; phones")).toBe(
      "a second device of yours; either device; devices",
    );
  });

  it("T-030-19: names sign-in with a synced passkey on the web, without promising that it syncs", () => {
    expect(web).toMatch(
      /If your browser or password manager syncs your passkey, you can sign in with it again/,
    );
    expect(RECOVERY_DISCLOSURE.paragraphs.join("\n")).not.toMatch(/sync/);
    // With restore, a second device is one way to keep the tickets, not the only one.
    expect(web).not.toMatch(/only way/);
    expect(web).toMatch(
      /To keep your tickets if you lose this device, add Saifu on a second device/,
    );
    expect(WEB_ONBOARDING_COPY.restoreOffer).not.toBeNull();
    expect(ONBOARDING_COPY.restoreOffer).toBeNull();
  });

  it("REQ-TM-2: passes the copy lint", () => {
    expect(matches(web)).toEqual([]);
    expect(matches(JSON.stringify(WEB_ONBOARDING_COPY))).toEqual([]);
    expect(matches(ONBOARDING_COPY.passkeysUnavailable)).toEqual([]);
  });
});
