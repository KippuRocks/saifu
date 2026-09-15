// Saifu's router (T-030-15): which screen is shown, and every move between
// screens, declared where it happens so `tools/screens` can map it:
//
//   navigate("tickets.list", "ticket.detail", { ticket })
//
// names both screens as string literals — from a screen's controls, and from
// the app's state, as when setup finishes. A link into Saifu enters a screen
// from outside the app:
//
//   enter("invitation.redeem", { token })
//
// names a screen with a route, literally; the route is the link that opens it.

import { useCallback, useState } from "react";
import { INITIAL_SCREEN, type SCREENS, type ScreenId } from "./registry.ts";

/** The parameters a screen is shown with, such as `{ ticket }` for `ticket.detail`. */
export type ParamsOf<Id extends ScreenId> = {
  readonly [Name in (typeof SCREENS)[Id]["params"][number]]: string;
};

export interface Location {
  readonly screen: ScreenId;
  readonly params: Readonly<Record<string, string>>;
}

export interface Router {
  readonly location: Location;
  /** Moves from the screen `from` to `to`; `from` names the screen the call is made on. */
  navigate<Id extends ScreenId>(from: ScreenId, to: Id, params: ParamsOf<Id>): void;
  /** Enters a screen from a link into Saifu, whatever screen is showing. */
  enter<Id extends LinkedScreenId>(to: Id, params: ParamsOf<Id>): void;
}

/** A screen a link opens: one with a route. */
export type LinkedScreenId = {
  [Id in ScreenId]: (typeof SCREENS)[Id]["route"] extends string ? Id : never;
}[ScreenId];

export function useRouter(): Router {
  const [location, setLocation] = useState<Location>({ screen: INITIAL_SCREEN, params: {} });
  const navigate = useCallback(
    <Id extends ScreenId>(_from: ScreenId, to: Id, params: ParamsOf<Id>) => {
      setLocation({ screen: to, params: params as Readonly<Record<string, string>> });
    },
    [],
  );
  const enter = useCallback(<Id extends LinkedScreenId>(to: Id, params: ParamsOf<Id>) => {
    setLocation({ screen: to, params: params as Readonly<Record<string, string>> });
  }, []);
  return { location, navigate, enter };
}
