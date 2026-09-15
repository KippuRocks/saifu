// The WebAuthn JSON shapes kippu-api's organiser ceremonies exchange, as its
// router types them (C5).

import type { AppRouter } from "@kippurocks/api";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

type Inputs = inferRouterInputs<AppRouter>["auth"]["organiser"];
type Outputs = inferRouterOutputs<AppRouter>["auth"]["organiser"];

export type RegistrationResponseJSON = Inputs["completeSignUp"]["credential"];
export type AuthenticationResponseJSON = Inputs["completeSignIn"]["credential"];
export type PublicKeyCredentialCreationOptionsJSON = Outputs["beginSignUp"]["options"];
export type PublicKeyCredentialRequestOptionsJSON = Outputs["beginSignIn"]["options"];
