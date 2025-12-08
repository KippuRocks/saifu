import { createContext, useContext } from "react";

import { AuthenticationService } from "../lib/authentication";

export const AuthenticationContext =
  createContext<AuthenticationService<any> | null>(null);

export function useAuthentication(): AuthenticationService<any> {
  const service = useContext(AuthenticationContext);
  if (!service) {
    throw new Error(
      "useAuthentication must be used within an AuthenticationProvider"
    );
  }
  return service;
}
