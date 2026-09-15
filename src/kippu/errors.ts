// How Saifu reads a refusal from kippu-api: the transport code, and the §10
// code when the refusal has one (`error.data.errorCode`, C5).

import { TRPCClientError } from "@trpc/client";

export interface KippuRefusal {
  /** tRPC's code, such as `NOT_FOUND`; `null` when kippu-api did not answer. */
  readonly code: string | null;
  readonly errorCode: string | null;
}

export function refusalOf(error: unknown): KippuRefusal {
  if (error instanceof TRPCClientError) {
    const data = error.data as { code?: unknown; errorCode?: unknown } | undefined;
    return {
      code: typeof data?.code === "string" ? data.code : null,
      errorCode: typeof data?.errorCode === "string" ? data.errorCode : null,
    };
  }
  const data = (error as { data?: { code?: unknown; errorCode?: unknown } } | null)?.data;
  return {
    code: typeof data?.code === "string" ? data.code : null,
    errorCode: typeof data?.errorCode === "string" ? data.errorCode : null,
  };
}
