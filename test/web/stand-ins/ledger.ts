// A stand-in for the ledger service, for the web smoke test: the subset of the
// C4 wire protocol `@ticketto/binding-offchain` uses to connect, register a
// credential and read it back, answered by `backend-memory`, the reference
// backend. The real service (`ticketto-offchain`) is private, so public CI
// cannot run it; kippu-e2e runs Saifu Web against it (F-070).
//
// Only what Saifu's onboarding reaches is served — the assurance declaration,
// submission, the operation poll and point queries. Anything else is a 404,
// which the binding reports as a protocol defect, so a flow that needs more
// fails loudly rather than passing on a guess.

import { decodeSignedAccessPass, decodeSignedCommand } from "@ticketto/profile-v0";
import type { Backend, Query, Receipt, Result, Sponsorship } from "@ticketto/sdk";
import { fromHex, toHex } from "../../../src/holder/credential.ts";
import { json, type StandIn } from "./http.ts";

interface Operation {
  readonly token: string;
  readonly result: Promise<Result<Receipt>>;
}

const TIMEOUT = Symbol("timeout");

/** C4 carries an error's code and detail, nothing else. */
function ledgerError(error: { code: string; detail?: string }) {
  return error.detail === undefined
    ? { code: error.code }
    : { code: error.code, detail: error.detail };
}

export function ledgerStandIn(backend: Backend): StandIn {
  const operations = new Map<string, Operation>();

  const submit = (body: unknown) => {
    const { input, sponsorship, presentedAt } = body as {
      input: { kind: "command" | "pass"; bytes: string };
      sponsorship: string | null;
      presentedAt?: number;
    };
    const sponsored = sponsorship === null ? undefined : (fromHex(sponsorship) as Sponsorship);
    if (input.kind === "command") {
      const decoded = decodeSignedCommand(fromHex(input.bytes));
      if (!decoded.ok) return json(400, { error: { code: "malformed" } });
      const operationId = decoded.value.command.operationId as string;
      let operation = operations.get(operationId);
      if (operation === undefined) {
        const submission = backend.submit({ kind: "command", signed: decoded.value }, sponsored);
        operation = { token: crypto.randomUUID(), result: Promise.resolve(submission) };
        operations.set(operationId, operation);
      }
      return json(202, { operationId, submission: operation.token });
    }
    const decoded = decodeSignedAccessPass(fromHex(input.bytes));
    if (!decoded.ok || presentedAt === undefined) {
      return json(400, { error: { code: "malformed" } });
    }
    const operationId = decoded.value.pass.id as string;
    let operation = operations.get(operationId);
    if (operation === undefined) {
      const submission = backend.submit(
        { kind: "pass", signed: decoded.value, presentedAt: presentedAt as never },
        sponsored,
      );
      operation = { token: crypto.randomUUID(), result: Promise.resolve(submission) };
      operations.set(operationId, operation);
    }
    return json(202, { operationId, submission: operation.token });
  };

  const poll = async (operationId: string, url: URL) => {
    const operation = operations.get(operationId);
    if (operation === undefined || operation.token !== url.searchParams.get("submission")) {
      return json(404, { error: { code: "operation-unknown" } });
    }
    const wait = Number(url.searchParams.get("wait") ?? 25_000);
    const outcome = await Promise.race([
      operation.result,
      new Promise<typeof TIMEOUT>((resolve) => setTimeout(() => resolve(TIMEOUT), wait)),
    ]);
    if (outcome === TIMEOUT) return json(200, { state: "pending" });
    return outcome.ok
      ? json(200, { state: "settled", receipt: outcome.value })
      : json(200, { state: "rejected", error: ledgerError(outcome.error) });
  };

  const query = async (body: unknown) => {
    const result = await backend.query(body as Query);
    if (result.ok && (body as Query).kind === "getCredential" && result.value !== null) {
      return json(200, { result: { ok: true, value: toHex(result.value as Uint8Array) } });
    }
    return json(200, {
      result: result.ok ? result : { ok: false, error: ledgerError(result.error) },
    });
  };

  return async ({ method, url, body }) => {
    const path = url.pathname;
    if (method === "GET" && path === "/v0/assurance") {
      return json(200, { assurance: backend.assurance });
    }
    if (method === "POST" && path === "/v0/submit") return submit(JSON.parse(body ?? "null"));
    if (method === "POST" && path === "/v0/query") return query(JSON.parse(body ?? "null"));
    const polled = /^\/v0\/operations\/([0-9a-f]+)$/.exec(path);
    if (method === "GET" && polled?.[1] !== undefined) return poll(polled[1], url);
    return { status: 404, body: "" };
  };
}
