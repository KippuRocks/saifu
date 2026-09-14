// The two documents the RP id's domain must serve for platform passkeys to work
// in Saifu (T-030-02):
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

export function appleAppSiteAssociation(app: AppIdentity) {
  if (!TEAM_ID.test(app.appleTeamId)) {
    throw new Error(`not an Apple team id: ${app.appleTeamId}`);
  }
  return { webcredentials: { apps: [`${app.appleTeamId}.${app.iosBundleIdentifier}`] } };
}

export function assetLinks(app: AppIdentity) {
  if (app.androidCertSha256.length === 0) {
    throw new Error("at least one Android signing certificate fingerprint is required");
  }
  for (const fingerprint of app.androidCertSha256) {
    if (!FINGERPRINT.test(fingerprint)) {
      throw new Error(`not a SHA-256 certificate fingerprint: ${fingerprint}`);
    }
  }
  return [
    {
      relation: ["delegate_permission/common.get_login_creds"],
      target: {
        namespace: "android_app",
        package_name: app.androidPackage,
        sha256_cert_fingerprints: [...app.androidCertSha256],
      },
    },
  ];
}
