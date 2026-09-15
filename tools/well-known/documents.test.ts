import { describe, expect, it } from "vitest";
import {
  endpointsConfig,
  LINK_PATHS,
  linksConfig,
  PLACEHOLDER_ENDPOINTS,
  passkeyConfig,
} from "../../app.config.ts";
import {
  appleAppSiteAssociation,
  assetLinks,
  PLACEHOLDER_APPLE_TEAM_ID,
  PLACEHOLDER_CERT_SHA256,
} from "./documents.ts";

const app = {
  iosBundleIdentifier: "rocks.kippu.saifu",
  androidPackage: "rocks.kippu.saifu",
  appleTeamId: "ABCDE12345",
  androidCertSha256: [
    "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C",
  ],
};

describe("RP id domain documents", () => {
  it("names the iOS app for webcredentials", () => {
    expect(appleAppSiteAssociation(app)).toEqual({
      webcredentials: { apps: ["ABCDE12345.rocks.kippu.saifu"] },
    });
  });

  it("delegates login credentials to the Android app", () => {
    expect(assetLinks(app)).toEqual([
      {
        relation: ["delegate_permission/common.get_login_creds"],
        target: {
          namespace: "android_app",
          package_name: "rocks.kippu.saifu",
          sha256_cert_fingerprints: app.androidCertSha256,
        },
      },
    ]);
  });

  it("refuses malformed identifiers", () => {
    expect(() => appleAppSiteAssociation({ ...app, appleTeamId: "abc" })).toThrow();
    expect(() => assetLinks({ ...app, androidCertSha256: ["FA:C6"] })).toThrow();
    expect(() => assetLinks({ ...app, androidCertSha256: [] })).toThrow();
  });

  it("has well-formed placeholders", () => {
    expect(() =>
      appleAppSiteAssociation({ ...app, appleTeamId: PLACEHOLDER_APPLE_TEAM_ID }),
    ).not.toThrow();
    expect(() =>
      assetLinks({ ...app, androidCertSha256: [PLACEHOLDER_CERT_SHA256] }),
    ).not.toThrow();
  });
});

describe("RP id configuration", () => {
  it("defaults to the placeholder under the reserved .example TLD", () => {
    expect(passkeyConfig({})).toEqual({ rpId: "kippu.example", placeholder: true });
  });

  it("takes a configured domain", () => {
    expect(passkeyConfig({ SAIFU_RP_ID: "Passkeys.Example.org" })).toEqual({
      rpId: "passkeys.example.org",
      placeholder: false,
    });
  });

  it("refuses anything that is not a bare domain name", () => {
    for (const value of ["https://example.org", "example.org:443", "localhost", "example.org/x"]) {
      expect(() => passkeyConfig({ SAIFU_RP_ID: value }), value).toThrow();
    }
  });
});

describe("service endpoint configuration", () => {
  it("defaults to placeholders, and takes configured URLs", () => {
    expect(endpointsConfig({})).toEqual(PLACEHOLDER_ENDPOINTS);
    expect(endpointsConfig({ SAIFU_LEDGER_URL: "http://127.0.0.1:8080/" }).ledgerUrl).toBe(
      "http://127.0.0.1:8080",
    );
  });

  it("refuses anything that is not an http(s) URL", () => {
    expect(() => endpointsConfig({ SAIFU_SPONSOR_URL: "ftp://x" })).toThrow();
    expect(() => endpointsConfig({ SAIFU_KIPPU_API_URL: "not a url" })).toThrow();
  });
});

describe("T-030-10 link host", () => {
  it("vouches for links into Saifu on iOS and Android", () => {
    const roles = { passkeys: false, linkPaths: [...LINK_PATHS] };
    expect(appleAppSiteAssociation(app, roles)).toEqual({
      applinks: {
        details: [
          {
            appIDs: ["ABCDE12345.rocks.kippu.saifu"],
            components: [{ "/": "/checkout" }, { "/": "/invitations" }],
          },
        ],
      },
    });
    expect(assetLinks(app, roles)[0]?.relation).toEqual([
      "delegate_permission/common.handle_all_urls",
    ]);
    expect(assetLinks(app, { passkeys: true, linkPaths: ["/checkout"] })[0]?.relation).toEqual([
      "delegate_permission/common.get_login_creds",
      "delegate_permission/common.handle_all_urls",
    ]);
  });

  it("takes an https origin, defaulting to a placeholder", () => {
    expect(linksConfig({})).toEqual({
      linkBase: "https://saifu.kippu.example",
      host: "saifu.kippu.example",
      placeholder: true,
    });
    expect(linksConfig({ SAIFU_LINK_BASE: "https://links.example.org/" }).linkBase).toBe(
      "https://links.example.org",
    );
    for (const value of [
      "http://links.example.org",
      "https://links.example.org/x",
      "https://links.example.org:8443",
    ]) {
      expect(() => linksConfig({ SAIFU_LINK_BASE: value }), value).toThrow();
    }
  });
});
