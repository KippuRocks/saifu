// pnpm well-known [out-dir] — writes the RP id domain's passkey documents
// (documents.ts) to out-dir/.well-known/, default build/well-known.
//
// Reads the app's identifiers from app.json, and from the environment:
//   SAIFU_RP_ID                 the relying party id (app.config.ts)
//   SAIFU_APPLE_TEAM_ID         the Apple Developer team id
//   SAIFU_ANDROID_CERT_SHA256   comma-separated signing certificate fingerprints
// Anything unset is a placeholder, and is reported as one.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { passkeyConfig } from "../../app.config.ts";
import {
  type AppIdentity,
  appleAppSiteAssociation,
  assetLinks,
  PLACEHOLDER_APPLE_TEAM_ID,
  PLACEHOLDER_CERT_SHA256,
} from "./documents.ts";

const out = join(process.argv[2] ?? "build/well-known", ".well-known");
const { expo } = JSON.parse(readFileSync("app.json", "utf8")) as {
  expo: { ios: { bundleIdentifier: string }; android: { package: string } };
};
const env = process.env;
const passkey = passkeyConfig(env);
const certificates = env.SAIFU_ANDROID_CERT_SHA256?.split(",")
  .map((value: string) => value.trim().toUpperCase())
  .filter((value: string) => value.length > 0);

const app: AppIdentity = {
  iosBundleIdentifier: expo.ios.bundleIdentifier,
  androidPackage: expo.android.package,
  appleTeamId: env.SAIFU_APPLE_TEAM_ID?.trim() || PLACEHOLDER_APPLE_TEAM_ID,
  androidCertSha256: certificates?.length ? certificates : [PLACEHOLDER_CERT_SHA256],
};

mkdirSync(out, { recursive: true });
writeFileSync(
  join(out, "apple-app-site-association"),
  `${JSON.stringify(appleAppSiteAssociation(app), null, 2)}\n`,
);
writeFileSync(join(out, "assetlinks.json"), `${JSON.stringify(assetLinks(app), null, 2)}\n`);

console.log(`wrote ${out} for https://${passkey.rpId}/.well-known/`);
const placeholders = [
  passkey.placeholder && "SAIFU_RP_ID",
  app.appleTeamId === PLACEHOLDER_APPLE_TEAM_ID && "SAIFU_APPLE_TEAM_ID",
  app.androidCertSha256.includes(PLACEHOLDER_CERT_SHA256) && "SAIFU_ANDROID_CERT_SHA256",
].filter(Boolean);
if (placeholders.length > 0) {
  console.warn(`placeholders in use, not deployable: ${placeholders.join(", ")}`);
}
