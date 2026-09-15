# saifu

Saifu — the holder app. The only client holding holder credentials. Feature F-030.

This repository was reset for the V0 rebuild. The previous implementation is
preserved under the tag `legacy`.

Everything here is built from the Kippu specification and plan, in
`kippurocks/kippu-docs`: `SPEC.md` decides behaviour, `PLAN.md` and
`features/` decide how it is built. Work is tracked as one issue per feature
per milestone.

## Stack

React Native on Expo (SDK 57), TypeScript strict, ESM. Saifu runs as an Expo
**development build** — not Expo Go — because holder credentials need a native
passkey module. The native projects are generated, never committed: `ios/` and
`android/` come from `app.json` through `expo prebuild`.

No Expo or EAS account is used. Builds are local, on a developer machine or on a
GitHub-hosted runner.

## Commands

Requires Node 24 and pnpm 10.17.1.

    pnpm install
    pnpm lint          # Biome
    pnpm lint:copy     # no fee vocabulary or trust claims in user-visible strings
    pnpm typecheck     # TypeScript
    pnpm test          # Vitest, on Node
    pnpm deps:check    # native dependencies match the Expo SDK
    pnpm bundle:check  # Metro bundles for iOS and Android

Development build, on a machine with Xcode or the Android SDK (JDK 17):

    pnpm prebuild      # generate ios/ and android/
    pnpm ios           # build, install on a simulator, start Metro
    pnpm android       # build, install on an emulator, start Metro

## Links into Saifu

Two kinds of link open Saifu (`src/links/links.ts`, T-030-10). Both are https links
under the **link base**, `SAIFU_LINK_BASE` — an https origin with no path, whose
placeholder is `https://saifu.kippu.example` until a host is chosen:

| Link | Built by | Opens |
|---|---|---|
| `<link base>/checkout#<handoff token>` | Ichiba, for a checkout's Saifu handoff (universal link on mobile, QR code on desktop) | `checkout.link` |
| `<link base>/invitations#<token>` | Ibento, for a guest invitation | `invitation.redeem` |

- Tokens are kippu-api's: 43 base64url characters.
- The token is in the **fragment**, never the path or query. A browser does not send a fragment to the server, so opening a link on a phone without Saifu does not put a token in the link host's request logs.
- The link host vouches for the app: `applinks` in its `apple-app-site-association` and `handle_all_urls` in its `assetlinks.json` (`pnpm well-known`, which also takes `SAIFU_LINK_BASE`). The app declares the host as an associated domain on iOS, and as verified App Links for `/checkout` and `/invitations` on Android.
- Development builds also accept `saifu://checkout#<token>` and `saifu://invitations#<token>`.

What Saifu does with them:
- **Checkout handoff.** Saifu links the holder's account with `sales.checkout.link` and shows the 6-digit pairing code, with what is being bought. The buyer compares it with the checkout page and confirms there; Saifu confirms nothing.
- **Invitation.** Saifu redeems the token with `events.invitations.redeem`, waits for Kippu's copy (`derived.waitFor`), and opens the ticket. Unknown, used and refused invitations each get a plain explanation.
- A link that arrives before Saifu is set up, or after the Kippu session ended, waits for setup and continues right after.

## Access passes

A ticket's pass is produced on the phone (`src/passes/`, T-030-07): `@ticketto/profile-v0`'s `producePass` over the cached ticket id and the holder's account, signed with the passkey. No network is involved (`NFR-3`), so it works in airplane mode for every ticket the phone has displayed.

- **QR code:** the signed pass's bytes (`encodeSignedPass`, about 445 bytes) as one binary-mode segment at error correction level M, drawn with `react-native-svg`. That is QR version 16.
- **Window:** 60 s (`NFR-5`'s default).
- **Refresh:** while the pass screen is open and Saifu is in the foreground, the code is replaced 10 s before its window closes. Every code is a new pass, and every pass is one passkey assertion with user verification (`features/030-saifu/plan.md` §5.3). The holder therefore confirms with face, fingerprint or screen lock about once every 50 s. Dismissing a prompt stops the refresh until the holder asks for a new code.
- **Screenshots:** a code on screen can be photographed and used once within its window (`OQ-24`). The screen says so.

## Screens

Every screen renders inside `<Screen id>` (`src/screens/Screen.tsx`): its
`screenId` is the root's `testID`, and a `<screenId>.settled` element appears once
nothing is loading or waiting on a passkey ceremony, so a test or a screenshot
can wait for the settled screen. The ids, titles and deep-link routes are the
router's table, `src/screens/registry.ts`; every move between screens is a
`navigate("from", "to", params)` call naming both literally, and a link into
Saifu enters its screen with `enter("to", params)`: only a screen with a route —
the link's path — can be entered. Only `src/screens/deep-links.ts` reads URLs.

`screens.json` is the screen manifest for kippu-e2e's navigation map (`F-070`
§5.4), in the `kippu.screens/1` format Ibento uses. It is generated and
committed:

    pnpm screens:write   # regenerate screens.json
    pnpm screens:check   # CI: fails on a screen without an id, undeclared or
                         # non-literal navigation, or an out-of-date screens.json

## Device tests

Flows in `.maestro/` run with [Maestro](https://maestro.mobile.dev) against an
installed development build. `tools/ci/smoke.sh <android|ios>` starts Metro and
runs the smoke flow; CI does this on an Android emulator (Ubuntu runner) and an
iOS simulator (macOS runner) for every pull request.

## Passkeys

Holder credentials are passkeys, following Kreivo Pass accounts as
`virto-network/papi-signers` implements them (`AD-10`). papi-signers'
`@virtonetwork/authenticators-webauthn` runs unmodified: Saifu gives it a
`navigator.credentials` (`src/passkey/credentials-container.ts`) backed by a
native bridge (`modules/saifu-passkey`) — ASAuthorization on iOS, Credential
Manager on Android — so attestations and assertions have the same bytes as in a
browser. Hermes gets `crypto.getRandomValues` and SHA-256 `crypto.subtle.digest`
from `src/platform/polyfills.ts`; Expo's runtime provides `TextDecoder`.

The **relying party id** is configuration, not code:

    SAIFU_RP_ID=<domain> pnpm prebuild

Unset, it is the placeholder `kippu.example`, and no passkey ceremony can
succeed: the platforms only create passkeys for a domain that vouches for the
app. That domain must serve two documents, generated by

    SAIFU_RP_ID=<domain> SAIFU_APPLE_TEAM_ID=<team> \
    SAIFU_ANDROID_CERT_SHA256=<fingerprint>[,<fingerprint>] pnpm well-known

at `https://<domain>/.well-known/apple-app-site-association` and
`https://<domain>/.well-known/assetlinks.json`. The domain, the Apple team and
the release signing certificate are not yet decided.

## The holder's credential

Saifu is the only client holding a holder's credential (`REQ-CL-2`).

- **Provisioning** (`src/holder/credential.ts`). On first use Saifu draws a
  random 32-byte user id and creates a passkey, user verification required. The
  holder's ledger account is the Kreivo Pass derivation of that user id. Nothing
  is shown to write down.
- **The passkey signer** signs the payload it is given — a profile signing
  payload — with one biometric prompt per signature. The V0 challenger
  (`src/holder/challenger.ts`) prefixes `ticketto/v0/registration` on the
  registration ceremony only.
- **On the device** (`src/holder/store.ts`) Saifu keeps the user id, the passkey's
  credential id, the registration until the ledger accepts it, and the Kippu
  session — in the platform's secure storage (`expo-secure-store`: the Keychain,
  or the Keystore-backed store). No key: the passkey's private key never leaves
  the platform authenticator.
- **Registration** (`src/holder/register.ts`) is `register_credential` through the
  Ticketto SDK over `binding-offchain`, sponsored through Kippu's relay
  (`@kippu/sponsorship`). A repeated registration is accepted unchanged, so an
  interrupted one is resubmitted.
- **Linking** (`src/kippu/link.ts`) answers kippu-api's proof-of-control challenge
  (`auth.holder.beginLink` / `completeLink`) with `signProofOfControl`.

Service endpoints are configuration, with placeholders until hostnames are chosen:

| Variable | Placeholder |
|---|---|
| `SAIFU_LEDGER_URL` | `https://ledger.kippu.example` |
| `SAIFU_SPONSOR_URL` | `https://sponsor.kippu.example` |
| `SAIFU_KIPPU_API_URL` | `https://api.kippu.example` |

### System tests

`test/system/` runs Saifu's holder flows against the real services: the ledger
service (`ticketto-offchain`), the sponsor relay, and kippu-api wired to that
ledger (`KIPPU_LEDGER_ENVIRONMENT=staging`). kippu-api's `development` wiring
keeps its ledger inside its own process, where Saifu cannot write to it. The
ledger service is private, so these tests are skipped unless
`SAIFU_TEST_LEDGER_URL`, `SAIFU_TEST_SPONSOR_URL` and `SAIFU_TEST_KIPPU_API_URL`
are set (and `SAIFU_TEST_RP_ID`, default `kippu.example`, matches the stack's
holder RP id); kippu-e2e (`F-070`) runs them against its stack. Every other test
uses `backend-memory` and F-003's simulated authenticator.

## Vendored packages

Cross-repository packages are not published. They are `pnpm pack` tarballs from
pinned commits, checked by `pnpm vendor:check` in CI:

- `@ticketto/sdk`, `profile-v0` and `binding-offchain` — and `backend-memory`,
  `ledger-rules` and `log` for tests — from `libticketto`
  (`pnpm vendor:libticketto <commit>`);
- `@kippu/api` (router types, `C5`) and `@kippu/sponsorship` (the relay client)
  from `kippu-api` (`pnpm vendor:kippu-api <commit>`).
