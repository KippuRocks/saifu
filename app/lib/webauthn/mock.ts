// Mock WebAuthn credential utilities for Virtonetwork ecosystem

import { MockCredentialData, StoredUser, WebAuthnCredential } from "./types.ts";

// Mock user database
export const mockUserDatabase: Record<string, StoredUser> = {
  alice: {
    username: "alice",
    displayName: "Alice",
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Smith",
    credentials: [
      {
        id: "mock_credential_alice_1",
        publicKey: "mock_public_key_alice_1_b64url",
        counter: 1,
        transports: ["internal"],
        type: "public-key",
      },
    ],
    registeredAt: new Date("2024-01-01"),
  },
  bob: {
    username: "bob",
    displayName: "Bob",
    email: "bob@example.com",
    firstName: "Bob",
    lastName: "Doe",
    credentials: [
      {
        id: "mock_credential_bob_1",
        publicKey: "mock_public_key_bob_1_b64url",
        counter: 1,
        transports: ["internal"],
        type: "public-key",
      },
    ],
    registeredAt: new Date("2024-01-01"),
  },
};

// Generate mock credential ID
export function generateMockCredentialId(username: string): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `mock_${username}_${timestamp}_${random}`;
}

// Generate mock public key
export function generateMockPublicKey(username: string): string {
  const mockData = `mock_public_key_${username}_${Date.now()}`;
  return btoa(mockData)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Generate mock WebAuthn credential
export function generateMockCredential(
  username: string,
  displayName: string
): WebAuthnCredential {
  return {
    id: generateMockCredentialId(username),
    publicKey: generateMockPublicKey(username),
    counter: Math.floor(Math.random() * 1000),
    transports: ["internal"],
    type: "public-key",
  };
}

// Create mock user
export function createMockUser(
  username: string,
  displayName: string,
  email?: string,
  firstName?: string,
  lastName?: string
): StoredUser {
  const credential = generateMockCredential(username, displayName);
  return {
    username,
    displayName,
    email,
    firstName,
    lastName,
    credentials: [credential],
    registeredAt: new Date(),
  };
}

// Generate mock challenge
export function generateMockChallenge(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Mock authentication function
export async function mockWebAuthnAuthentication(
  credentials: WebAuthnCredential[],
  challenge: string
): Promise<{ success: boolean; credential?: WebAuthnCredential }> {
  // Simulate WebAuthn authentication delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // For mock purposes, always return first credential as successfully authenticated
  if (credentials && credentials.length > 0) {
    return {
      success: true,
      credential: credentials[0],
    };
  }

  return { success: false };
}
