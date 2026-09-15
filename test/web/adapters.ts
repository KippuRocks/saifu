// Saifu Web's platform adapters stand in for the native modules beside them
// (T-030-18): Metro bundles `x.web.ts` wherever the app imports `x` without an
// extension. The type checker only sees the native module at those imports, so
// this file holds each web module to its native module's exports. It is checked
// by `pnpm typecheck`, and never run.

import type * as NativeOnboardingCopy from "../../src/copy/onboarding.ts";
import type * as WebOnboardingCopy from "../../src/copy/onboarding.web.ts";
import type * as NativeRecoveryCopy from "../../src/copy/recovery.ts";
import type * as WebRecoveryCopy from "../../src/copy/recovery.web.ts";
import type * as NativePasskeys from "../../src/passkey/install.ts";
import type * as WebPasskeys from "../../src/passkey/install.web.ts";
import type * as NativeOffline from "../../src/platform/offline.ts";
import type * as WebOffline from "../../src/platform/offline.web.ts";
import type * as NativeSecureStorage from "../../src/platform/secure-storage.ts";
import type * as WebSecureStorage from "../../src/platform/secure-storage.web.ts";
import type * as NativeAccountScanner from "../../src/receive/AccountScanner.tsx";
import type * as WebAccountScanner from "../../src/receive/AccountScanner.web.tsx";
import type * as NativeDeepLinks from "../../src/screens/deep-links.ts";
import type * as WebDeepLinks from "../../src/screens/deep-links.web.ts";

type Implements<Native, Web extends Native> = [Native, Web];

export type Adapters = [
  Implements<Pick<typeof NativePasskeys, "passkeysAvailable">, typeof WebPasskeys>,
  Implements<typeof NativeSecureStorage, typeof WebSecureStorage>,
  Implements<typeof NativeOffline, typeof WebOffline>,
  Implements<typeof NativeDeepLinks, typeof WebDeepLinks>,
  Implements<typeof NativeAccountScanner, typeof WebAccountScanner>,
  Implements<
    {
      readonly RECOVERY_DISCLOSURE: {
        readonly title: string;
        readonly paragraphs: readonly string[];
      };
    },
    typeof WebRecoveryCopy
  >,
  Implements<
    { readonly ONBOARDING_COPY: { readonly passkeysUnavailable: string } },
    typeof WebOnboardingCopy
  >,
];

export type NativeCopy = [typeof NativeRecoveryCopy, typeof NativeOnboardingCopy];
