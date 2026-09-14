// Saifu's client for Kippu's APIs: tRPC over HTTP, typed by `@kippu/api` (C5).

import type { AppRouter } from "@kippu/api";
import { createTRPCClient, type HTTPLinkOptions, httpLink, type TRPCClient } from "@trpc/client";

export type KippuClient = TRPCClient<AppRouter>;

export interface KippuClientOptions {
  /** kippu-api's base URL; the router is served under `/v0/trpc`. */
  readonly url: string;
  /** The holder session's bearer token, once linked. */
  readonly token?: () => string | undefined;
  readonly fetch?: HTTPLinkOptions<never>["fetch"];
}

export function kippuClient(options: KippuClientOptions): KippuClient {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${options.url.replace(/\/+$/, "")}/v0/trpc`,
        headers: () => {
          const token = options.token?.();
          return token === undefined ? {} : { authorization: `Bearer ${token}` };
        },
        ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      }),
    ],
  });
}
