import type { NextRequest } from "next/server";
import { ProfileInfo } from "@/app/lib/authentication";
import { ServerStorage } from "@/app/lib/server-db";
import { StoredCredential } from "@/app/lib/server-db";

export type RegisterRequest = {
  username: string;
  profile: ProfileInfo;
  attestation: AttestationData;
  credentialId: string;
};

export async function POST(request: NextRequest) {
  try {
    const data: RegisterRequest = await request.json();
    const { username, profile, attestation, credentialId } = data;

    if (!username) {
      return new Response(
        JSON.stringify({
          error: "Username (email) is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
      return new Response(
        JSON.stringify({
          error: "Invalid email format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if user already exists
    if (ServerStorage.userExists(username)) {
      return new Response(
        JSON.stringify({
          error: "User already exists",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create new user in persistent storage (use email as username)
    ServerStorage.createUser({
      username,
      firstName: profile.firstName,
      lastName: profile.lastName,
    });

    // Store the credential
    // We use the provided credentialId and public key from attestation
    const credential: StoredCredential = {
      id: credentialId,
      publicKey: attestation?.public_key,
      createdAt: new Date().toISOString(),
      transports: ["internal"],
      type: "public-key",
    };

    // Update user with credential and mark as blockchain registered
    ServerStorage.updateUserCredentials(username, credential);

    // Return the complete user data
    const storedUser = ServerStorage.getUser(username);

    return new Response(
      JSON.stringify({
        success: true,
        message: "User registered successfully. WebAuthn credential created.",
        user: storedUser,
        credential: {
          id: credential.id,
          publicKey: credential.publicKey,
          type: credential.type,
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({
        error: "Registration failed: " + (error as Error).message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
export interface AttestationData {
  authenticator_data: string;
  client_data: string;
  public_key: string;
  meta: {
    deviceId: string;
    context: number;
    authority_id: string;
  };
}
