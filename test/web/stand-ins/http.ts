// The shape every stand-in service of the web smoke test answers in: one HTTP
// exchange, as Playwright's request interception hands it over and fulfils it.

export interface StandInRequest {
  readonly method: string;
  readonly url: URL;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string | null;
}

export interface StandInResponse {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body: string;
}

export type StandIn = (request: StandInRequest) => Promise<StandInResponse>;

export function json(status: number, value: unknown): StandInResponse {
  return {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(value),
  };
}

/**
 * The services are other origins than Saifu Web's, as they will be deployed, so
 * the browser checks CORS: every answer allows the web origin, and a preflight
 * is answered here.
 */
export function withCors(origin: string, standIn: StandIn): StandIn {
  const cors = {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, accept",
    "access-control-max-age": "600",
    vary: "origin",
  };
  return async (request) => {
    if (request.method === "OPTIONS") return { status: 204, headers: cors, body: "" };
    const response = await standIn(request);
    return { ...response, headers: { ...response.headers, ...cors } };
  };
}
