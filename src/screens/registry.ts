/**
 * Saifu's screens: the router's table (T-030-15; `F-070` plan §5.4).
 *
 * Every screen has a stable `screenId`, a title, the parameters the router shows
 * it with, and its route: the deep-link path that opens it, as a pattern with
 * `:name` parameters, or `null` when no link opens it. No screen has a deep link
 * yet: the links into Saifu — the checkout handoff from Ichiba and invitation
 * links — arrive with T-030-10, which adds their entry screens and routes here.
 *
 * Screen ids name what a screen is for, as `area.subject`. They never name copy,
 * positions or indices, and once used an id is not renamed: journeys,
 * screenshots and the navigation map in kippu-e2e refer to it.
 *
 * `tools/screens` reads this table, and the navigation declared in the sources,
 * to generate `screens.json`. This module imports nothing, so the tool can load
 * it without the app.
 */

export interface ScreenDefinition {
  readonly title: string;
  readonly route: string | null;
  /** The parameters the screen is shown with. */
  readonly params: readonly string[];
}

export const SCREENS = {
  "app.starting": { title: "Starting", route: null, params: [] },
  "holder.onboarding": { title: "Set up Saifu", route: null, params: [] },
  "tickets.list": { title: "Your tickets", route: null, params: [] },
  "ticket.detail": { title: "Ticket", route: null, params: ["ticket"] },
  "settings.main": { title: "Settings", route: null, params: [] },
} as const satisfies Readonly<Record<string, ScreenDefinition>>;

export type ScreenId = keyof typeof SCREENS;

/** The screen the app opens on, before it knows whether the holder is set up. */
export const INITIAL_SCREEN = "app.starting" satisfies ScreenId;
