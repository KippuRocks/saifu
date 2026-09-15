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

**Saifu Web** is the same app from Expo's web target (see [Saifu Web](#saifu-web)).

## Commands

Requires Node 24 and pnpm 10.17.1.

    pnpm install
    pnpm lint          # Biome
    pnpm lint:copy     # no fee vocabulary or trust claims in user-visible strings
    pnpm typecheck     # TypeScript
    pnpm test          # Vitest, on Node
    pnpm deps:check    # native dependencies match the Expo SDK
    pnpm bundle:check  # Metro bundles for iOS and Android
    pnpm web:build     # Saifu Web: static export into dist/
    pnpm web:smoke     # Playwright smoke test of dist/ (needs `playwright install chromium`)

Development build, on a machine with Xcode or the Android SDK (JDK 17):

    pnpm prebuild      # generate ios/ and android/
    pnpm ios           # build, install on a simulator, start Metro
    pnpm android       # build, install on an emulator, start Metro

## Links into Saifu

Two kinds of link open Saifu (`src/links/links.ts`, T-030-10). Both are https links
under the **link base**, `SAIFU_LINK_BASE` — an https origin with no path, which
defaults to Saifu Web's origin, `https://saifu.kippu.rocks` (nothing is served
there yet):

| Link | Built by | Opens |
|---|---|---|
| `<link base>/checkout#<handoff token>` | Ichiba, for a checkout's Saifu handoff (universal link on mobile, QR code on desktop) | `checkout.link` |
| `<link base>/invitations#<token>` | Ibento, for a guest invitation | `invitation.redeem` |

- Tokens are kippu-api's: 43 base64url characters.
- The token is in the **fragment**, never the path or query. A browser does not send a fragment to the server, so opening a link on a phone without Saifu does not put a token in the link host's request logs.
- The link host vouches for the app: `applinks` in its `apple-app-site-association` and `handle_all_urls` in its `assetlinks.json` (`pnpm well-known`, which also takes `SAIFU_LINK_BASE`). The app declares the host as an associated domain on iOS, and as verified App Links for `/checkout` and `/invitations` on Android.
- Development builds also accept `saifu://checkout#<token>` and `saifu://invitations#<token>`.
- On Saifu Web the link is the page's own address (`src/screens/deep-links.web.ts`). Its host serves the app for `/checkout` and `/invitations`, and Saifu takes the token out of the address bar once read.

What Saifu does with them:
- **Checkout handoff.** Saifu links the holder's account with `sales.checkout.link` and shows the 6-digit pairing code, with what is being bought. The buyer compares it with the checkout page and confirms there; Saifu confirms nothing.
- **Invitation.** Saifu redeems the token with `events.invitations.redeem`, waits for Kippu's copy (`derived.waitFor`), and opens the ticket. Unknown, used and refused invitations each get a plain explanation.
- A link that arrives before Saifu is set up, or after the Kippu session ended, waits for setup and continues right after.

## Access passes

A ticket's pass is produced on the phone (`src/passes/`, T-030-07): `@ticketto/profile-v0`'s `producePass` over the cached ticket id and the holder's account, signed with the passkey. No network is involved (`NFR-3`), so it works in airplane mode for every ticket the phone has displayed.

- **QR code:** the signed pass's bytes (`encodeSignedPass`, about 445 bytes) as one binary-mode segment at error correction level M, drawn with `react-native-svg`. That is QR version 16.
- **Window:** the event's (T-030-17), as kippu-api's derived copy reports it with each holding (`passWindow`): the organiser's setting, or `NFR-5`'s 60 s default, never longer than the ledger's 5-minute maximum. The holdings cache keeps it, so a pass produced offline uses the last window Saifu read. With none, the window is 60 s.
- **Refresh:** while the pass screen is open and Saifu is in the foreground, the code is replaced 10 s before its window closes, or halfway through a window of 20 s or less. Every code is a new pass, and every pass is one passkey assertion with user verification (`features/030-saifu/plan.md` §5.3). With the default window, the holder therefore confirms with face, fingerprint or screen lock about once every 50 s. Dismissing a prompt stops the refresh until the holder asks for a new code.
- **Screenshots:** a code on screen can be photographed and used once within its window (`OQ-24`). The screen says so.

## Receiving a ticket

A holder receives a ticket by showing their **receive code** (`src/receive/`, T-030-09). It is a QR code of the text `ticketto:account:<account id>`: the holder's account, and nothing that can use a ticket. The sender's Saifu scans it with `AccountScanner`, which reads only codes with that prefix. A ticket id or an event id is also 64 hex characters, and a ticket sent to one is lost, so a bare id is never accepted as a receiver.

## Transferring a ticket

Transfers (`src/transfer/`, T-030-08) are signed with the passkey, sponsored through Kippu's relay, and submitted directly to the ledger through the SDK. Kippu's APIs are not in the path (`REQ-CL-1`).

- **Receiver.** It comes from a scanned receive code, or an account typed in. A typed id the ledger knows as a ticket or an event is refused, as is the holder's own account.
- **Warning** (`REQ-FR-3`). A transfer to an account this Saifu has never sent a ticket to first shows a full-screen warning: no payment is involved, and it cannot be undone. Nothing is signed before the holder confirms. "Never sent to" is recorded per holder on the device. Kippu exposes no read of who sent a holder their tickets, so receiving from an account does not make it known.
- **After submission.** Saifu waits for Kippu's copy (`derived.waitFor`) and refreshes the holdings before saying the ticket is gone. The relay is given the copy's cursor from the last holdings read, so a lagging relay waits instead of refusing.
- **Restricted tickets** (`AC-B3.3`). A ticket that cannot be transferred says why, and offers no transfer.

## A second device

A holder adds Saifu on a second phone of theirs (`src/devices/`, T-030-13). This is V0's only way to keep tickets after losing a phone (`REQ-CP-6`, `DEF-7`). The two phones exchange QR codes in person, and nothing passes through Kippu:

1. On the existing phone, Settings → **Add a device** shows `saifu:add-device:<user handle>` — the passkey's user handle, `SHA-256(userId)`, as lower-case hex. The new phone ("I already use Saifu on another phone", at onboarding) scans it and creates its passkey with that user handle, so it names the same account; the raw user id never leaves the first phone.
2. The new phone shows `saifu:device-registration:<registration, base64url>` and a six-digit short code: the first four bytes of `BLAKE2b-256("saifu/v0/device-short-code" ‖ registration)`, big-endian, modulo one million.
3. The existing phone scans it. Before the passkey prompt, it shows a full-screen confirmation, with the same short code to compare: the new phone gets full control of every ticket, and this cannot be undone.
4. The existing phone signs `registerCredential`, sponsored. The new phone never registers itself: it waits for `getCredential`, then links to Kippu with its own credential.

Settings lists every device registered to the account (`derived.credentials.mine`, T-025-13) and marks this phone. Saifu cannot remove one, and says so.

## Screens

Every screen renders inside `<Screen id>` (`src/screens/Screen.tsx`): its
`screenId` is the root's `testID` — on Saifu Web also its `data-screen` — and a `<screenId>.settled` element appears once
nothing is loading or waiting on a passkey ceremony, so a test or a screenshot
can wait for the settled screen. The ids, titles and deep-link routes are the
router's table, `src/screens/registry.ts`; every move between screens is a
`navigate("from", "to", params)` call naming both literally, and a link into
Saifu enters its screen with `enter("to", params)`: only a screen with a route —
the link's path — can be entered. Only `src/screens/deep-links.ts` reads URLs.

`screens.json` is the screen manifest for kippu-e2e's navigation map (`F-070`
§5.4), in the `kippu.screens/1` format Ibento uses. Saifu is one app on two
platforms, so it lists `platforms: ["native", "web"]` where Ibento lists one
`platform`: every screen, id and route holds on both. It is generated and
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

Unset, it is the holder RP id as ruled, `saifu.kippu.rocks`: Saifu Web's own
host, and never a parent of another Kippu origin, which could otherwise ask a
holder's passkey to sign (`REQ-CL-2`, `REQ-CL-4`). Kippu's login RP id,
`kippu.rocks`, is kippu-api's, not Saifu's. No passkey ceremony can succeed in
the native app until that domain vouches for it — the platforms only create
passkeys for a domain that does — by serving two documents, generated by

    SAIFU_RP_ID=<domain> SAIFU_APPLE_TEAM_ID=<team> \
    SAIFU_ANDROID_CERT_SHA256=<fingerprint>[,<fingerprint>] pnpm well-known

at `https://<domain>/.well-known/apple-app-site-association` and
`https://<domain>/.well-known/assetlinks.json`. No DNS record or hosting exists
for it yet, and the Apple team and the release signing certificate are not yet
decided.

## Saifu Web

Saifu Web (T-030-18; `features/030-saifu/plan.md` §5.1a) is this app built with
Expo's web target, to be served at `https://saifu.kippu.rocks` — the holder RP
id's own origin, so the browser's passkeys work with papi-signers' WebAuthn
authenticator unmodified. It is Saifu, not another client: `REQ-CL-2` is about
which client holds holder credentials, not which platform runs it. Nothing is
deployed.

It is not a fork. Where a platform differs, a `.web.ts` module sits beside the
native one, and the app imports it without an extension, so Metro bundles the web
module for the web and the native one elsewhere. `test/web/adapters.ts` holds each
web module to its native module's exports.

| Concern | Native | Web |
|---|---|---|
| Passkeys (`src/passkey/install`) | The native bridge as `navigator.credentials` | The browser's `navigator.credentials`, in a secure context |
| Holder record (`src/platform/secure-storage`) | `expo-secure-store` | IndexedDB, on Saifu's origin |
| Camera (`src/receive/AccountScanner`) | `expo-camera` | `getUserMedia`, frames read with jsQR in the page (`QrScanner.web.tsx`) |
| Links (`src/screens/deep-links`) | Universal links and App Links | The page's address, `/checkout#<token>` and `/invitations#<token>` |
| Copy (`src/copy/recovery`, `src/copy/onboarding`) | "this phone" | "this device", "this browser" |

Everything else — the recovery disclosure, the `REQ-FR-3` warning, passes
produced with no network, the event's pass window, the copy lint and the screen
manifest — is the same code on both.

**Offline** (T-030-19; `NFR-3`, `REQ-AP-5`). `pnpm web:build` writes a service
worker into the export, `dist/sw.js` (`tools/web/service-worker.ts`), registered
by `src/platform/offline.web.ts`. On the first visit it caches every file of the
export, under a cache named for their contents; page loads ask the network first
and fall back to the cached app, so any path opens offline; nothing from another
origin is cached. The holder's tickets come from the app's own device cache, as
natively, and the holder record from IndexedDB, so after one online visit Saifu
Web opens and produces access passes with no network.

**Holdings without a network** (on both platforms, `loadHoldingsProgressively`
in `src/holdings/load.ts`). When the device reports it is offline
(`navigator.onLine` on the web, `src/platform/network`), or Kippu's copy does not
answer, the cached tickets are shown at once; the ledger keeps connecting in the
background, and once it does the cached tickets are read from it. On the web,
coming back online reads Kippu's copy again.

A host serving `dist/` must answer `/checkout` and `/invitations` with
`index.html`, and serve `sw.js` without long-lived HTTP caching. Browsers may evict a site's storage (notably Safari, for a site not
added to the home screen); the holder record is then gone from that browser.

**Restore** (T-030-19; §5.1a). Onboarding on the web offers to sign in with an
existing passkey (`restoreHolderCredential`): the browser offers any
discoverable Saifu passkey it has, synced or not, and the assertion's user
handle names the account. The registration is read back from the ledger — a
passkey with none is refused — and the account is linked to Kippu again. No
passkey is created. The web disclosure then says a synced passkey signs the
holder in again, and promises no sync. Natively this is T-030-16's.

**Smoke test.** `test/web/smoke.spec.ts` drives `dist/` in Chromium, desktop and
mobile, with Chromium's virtual authenticator standing in for the platform
authenticator: an Ichiba checkout link opens onboarding, the holder sets up —
one discoverable passkey bound to `saifu.kippu.rocks`, registered on the ledger
and linked to Kippu — and the pairing code appears; a reload resumes from
IndexedDB with no second passkey. `test/web/offline.spec.ts` visits once, turns
the network off, reloads, and checks the pass on screen verifies against the
credential the ledger records; then it clears the origin's storage and restores
the same account with the same passkey. The page really runs at
`https://saifu.kippu.rocks`: Playwright intercepts every request to that origin
and to the service endpoints and answers it locally (`test/web/stack.ts`) — the
export as a static host would serve it, a stand-in for the ledger service over
`backend-memory` speaking the part of C4 onboarding uses, a software sponsor
relay, and a stand-in for kippu-api's holder linking and checkout handoff. CI
runs it on every change; kippu-e2e drives Saifu Web against the real services
(`F-070`).

## The holder's credential

Saifu is the only client holding a holder's credential (`REQ-CL-2`).

- **Provisioning** (`src/holder/credential.ts`). On first use Saifu draws a
  random 32-byte user id and creates a passkey, user verification required. The
  passkey's user handle is `SHA-256(userId)`, as papi-signers creates it, and it
  is Saifu's durable identity for the holder: the ledger account is its Kreivo
  Pass derivation, `BLAKE2b-256(0³² ‖ userHandle)`. Nothing is shown to write
  down.
- **The passkey signer** signs the payload it is given — a profile signing
  payload — with one biometric prompt per signature. The V0 challenger
  (`src/holder/challenger.ts`) prefixes `ticketto/v0/registration` on the
  registration ceremony only.
- **On the device** (`src/holder/store.ts`) Saifu keeps the user handle (and, on the phone that created the account, the user id), the passkey's
  credential id, the registration until the ledger accepts it, and the Kippu
  session — in the platform's secure storage (`expo-secure-store`: the Keychain,
  or the Keystore-backed store; IndexedDB on Saifu Web). No key: the passkey's private key never leaves
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
