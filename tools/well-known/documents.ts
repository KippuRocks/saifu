// The two documents the RP id's domain must serve for platform passkeys to work
// in Saifu (T-030-02), and the link host for links into Saifu to open the app
// (T-030-10: `applinks`, and Digital Asset Links `handle_all_urls`). When the RP
// id and the link host are one host, it serves both roles in one document of each:
//
//   https://<rp id>/.well-known/apple-app-site-association
//     `webcredentials` — lets the iOS app, by team id and bundle id, use
//     passkeys for the domain. Pairs with the app's associated domains
//     entitlement (app.config.ts).
//   https://<rp id>/.well-known/assetlinks.json
//     Digital Asset Links `get_login_creds` — lets the Android app, by package
//     name and signing certificate, use passkeys for the domain.
//
// The domain, the Apple team and the release signing certificate are all
// undecided; until they are, the documents are generated with placeholders and
// served nowhere.

export const PLACEHOLDER_APPLE_TEAM_ID = "0000000000";
export const PLACEHOLDER_CERT_SHA256 = Array.from({ length: 32 }, () => "00").join(":");

export interface AppIdentity {
  readonly iosBundleIdentifier: string;
  readonly androidPackage: string;
  /** The ten-character Apple Developer team id. */
  readonly appleTeamId: string;
  /** SHA-256 fingerprints of the Android signing certificates, colon-separated upper-case hex. */
  readonly androidCertSha256: readonly string[];
}

const TEAM_ID = /^[A-Z0-9]{10}$/;
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/** What a host vouches for: passkeys for the RP id, links into Saifu, or both. */
export interface HostRoles {
  readonly passkeys: boolean;
  /** The URL paths that open Saifu, when the host is the link host. */
  readonly linkPaths: readonly string[];
}

const PASSKEYS_ONLY: HostRoles = { passkeys: true, linkPaths: [] };

export function appleAppSiteAssociation(app: AppIdentity, roles: HostRoles = PASSKEYS_ONLY) {
  if (!TEAM_ID.test(app.appleTeamId)) {
    throw new Error(`not an Apple team id: ${app.appleTeamId}`);
  }
  const appId = `${app.appleTeamId}.${app.iosBundleIdentifier}`;
  return {
    ...(roles.passkeys ? { webcredentials: { apps: [appId] } } : {}),
    ...(roles.linkPaths.length > 0
      ? {
          applinks: {
            details: [
              { appIDs: [appId], components: roles.linkPaths.map((path) => ({ "/": path })) },
            ],
          },
        }
      : {}),
  };
}

export function assetLinks(app: AppIdentity, roles: HostRoles = PASSKEYS_ONLY) {
  if (app.androidCertSha256.length === 0) {
    throw new Error("at least one Android signing certificate fingerprint is required");
  }
  for (const fingerprint of app.androidCertSha256) {
    if (!FINGERPRINT.test(fingerprint)) {
      throw new Error(`not a SHA-256 certificate fingerprint: ${fingerprint}`);
    }
  }
  const relation = [
    ...(roles.passkeys ? ["delegate_permission/common.get_login_creds"] : []),
    ...(roles.linkPaths.length > 0 ? ["delegate_permission/common.handle_all_urls"] : []),
  ];
  return [
    {
      relation,
      target: {
        namespace: "android_app",
        package_name: app.androidPackage,
        sha256_cert_fingerprints: [...app.androidCertSha256],
      },
    },
  ];
}
