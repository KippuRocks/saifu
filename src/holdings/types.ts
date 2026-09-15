// The shapes Saifu reads from kippu-api's derived copy (C5, `@kippurocks/api`).

import type { AppRouter } from "@kippurocks/api";
import type { inferRouterOutputs } from "@trpc/server";

type Outputs = inferRouterOutputs<AppRouter>;

export type HoldingsRead = Outputs["derived"]["holdings"]["mine"];
export type HoldingView = HoldingsRead["holdings"][number];
export type TicketView = HoldingView["ticket"];
export type EventView = NonNullable<HoldingView["event"]>;
