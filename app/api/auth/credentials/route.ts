import { ServerStorage } from "@/app/api/auth/server-db";
import { type StoredCredential } from "@/app/lib/types";

import type { NextRequest } from "next/server";

export type CredentialsResponse = {
  credentials: StoredCredential[];
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

  return new Response(
    JSON.stringify({
      credentials: user.credentials,
    } as CredentialsResponse),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
