import { describe, expect, it } from "vitest";
import { checkoutLink, invitationLink, parseSaifuLink } from "./links.ts";

const config = { linkBase: "https://saifu.kippu.example", scheme: "saifu" };
const token = "Ab-_0123456789abcdefghijklmnopqrstuvwxyzABC".slice(0, 43);

describe("T-030-10 links into Saifu", () => {
  it("parses the checkout handoff and invitation links it builds", () => {
    expect(checkoutLink(config.linkBase, token)).toBe(
      `https://saifu.kippu.example/checkout#${token}`,
    );
    expect(invitationLink(`${config.linkBase}/`, token)).toBe(
      `https://saifu.kippu.example/invitations#${token}`,
    );
    expect(parseSaifuLink(checkoutLink(config.linkBase, token), config)).toEqual({
      kind: "checkout",
      handoffToken: token,
    });
    expect(parseSaifuLink(invitationLink(config.linkBase, token), config)).toEqual({
      kind: "invitation",
      token,
    });
  });

  it("accepts Saifu's scheme for development builds", () => {
    expect(parseSaifuLink(`saifu://invitations#${token}`, config)).toEqual({
      kind: "invitation",
      token,
    });
    expect(parseSaifuLink(`saifu://checkout#${token}`, config)).toEqual({
      kind: "checkout",
      handoffToken: token,
    });
  });

  it("refuses anything else", () => {
    for (const url of [
      `https://evil.example/invitations#${token}`,
      `http://saifu.kippu.example/invitations#${token}`,
      `https://saifu.kippu.example/invitations/${token}`,
      `https://saifu.kippu.example/invitations?x=1#${token}`,
      `https://saifu.kippu.example/tickets#${token}`,
      "https://saifu.kippu.example/invitations#short",
      `other://invitations#${token}`,
      "saifu://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081",
      "not a url",
    ]) {
      expect(parseSaifuLink(url, config), url).toBeNull();
    }
    expect(() => invitationLink(config.linkBase, "short")).toThrow(TypeError);
  });
});
