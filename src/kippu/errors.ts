// How Saifu reads a refusal from kippu-api: the transport code, the §10 code
// when the refusal has one (`error.data.errorCode`), and the machine-readable
// platform reason when the procedure documents one (`error.data.reason`) — C5.

import { TRPCClientError } from "@trpc/client";

export interface KippuRefusal {
  /** tRPC's code, such as `NOT_FOUND`; `null` when kippu-api did not answer. */
  readonly code: string | null;
  readonly errorCode: string | null;
  readonly reason: string | null;
}

type ErrorData = { code?: unknown; errorCode?: unknown; reason?: unknown } | undefined;

function fromData(data: ErrorData): KippuRefusal {
  return {
    code: typeof data?.code === "string" ? data.code : null,
    errorCode: typeof data?.errorCode === "string" ? data.errorCode : null,
    reason: typeof data?.reason === "string" ? data.reason : null,
  };
}

export function refusalOf(error: unknown): KippuRefusal {
  if (error instanceof TRPCClientError) return fromData(error.data as ErrorData);
  return fromData((error as { data?: ErrorData } | null)?.data);
}
