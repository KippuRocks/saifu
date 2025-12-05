import type { NextRequest } from "next/server";
import { ServerStorage } from "../../../lib/server-db";
import { StoredCredential } from "../../../lib/webauthn/storage";

function generateMockCredentialId(username: string): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `mock_${username}_${timestamp}_${random}`;
}

function generateMockPublicKey(username: string): string {
  const mockData = `mock_public_key_${username}_${Date.now()}`;
  return btoa(mockData)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { email, displayName, firstName, lastName } = data;

    if (!email || !displayName) {
      return new Response(
        JSON.stringify({
          error: "Email and displayName are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
    if (ServerStorage.userExists(email)) {
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
    const newUser = ServerStorage.createUser({
      username: email,
      displayName,
      email,
      firstName,
      lastName,
    });

    // Generate initial credential for the user
    const credential: StoredCredential = {
      id: generateMockCredentialId(email),
      publicKey: generateMockPublicKey(email),
      createdAt: new Date().toISOString(),
      counter: 0,
      transports: ["internal"],
      type: "public-key",
    };

    // Update user with credential and mark as blockchain registered
    ServerStorage.updateUserCredentials(email, credential);

    // Return the complete user data
    const storedUser = ServerStorage.getUser(email);

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
