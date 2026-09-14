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

## Device tests

Flows in `.maestro/` run with [Maestro](https://maestro.mobile.dev) against an
installed development build. `tools/ci/smoke.sh <android|ios>` starts Metro and
runs the smoke flow; CI does this on an Android emulator (Ubuntu runner) and an
iOS simulator (macOS runner) for every pull request.
