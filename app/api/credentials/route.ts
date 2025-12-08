import { ServerStorage, type StoredCredential } from "../../lib/server-db";

import type { NextRequest } from "next/server";

export type CredentialsResponse = {
  credentials: {
    id: string;
    publicKey: `0x${string}`;
    type: "public-key";
    transports: AuthenticatorTransport[];
  }[];
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get("username");

  if (!username) {
    return new Response(JSON.stringify({ error: "Username is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = ServerStorage.getUser(username);

  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if user has credentials
  if (!user.credentials.length) {
    return new Response(
      JSON.stringify({
        error: "User does not contain credentials",
        requiresRegistration: true,
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const response = {
    credentials: user.credentials.map((cred: StoredCredential) => ({
      id: cred.id,
      publicKey: cred.publicKey,
      transports: cred.transports,
      type: cred.type,
    })),
  } as CredentialsResponse;

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
