// Shared mock database for WebAuthn implementation

export interface MockUser {
  username: string;
  displayName: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  credentials: Array<{
    id: string;
    publicKey: string;
    counter: number;
    transports: string[];
    type: string;
  }>;
  registeredAt: string;
}

// In-memory mock database
export const mockUserDatabase: Record<string, MockUser> = {
  alice: {
    username: "alice",
    displayName: "Alice",
    credentials: [
      {
        id: "mock_credential_alice_1",
        publicKey: "mock_public_key_alice_1_b64url",
        counter: 1,
        transports: ["internal"],
        type: "public-key",
      },
    ],
    registeredAt: new Date().toISOString(),
  },
  bob: {
    username: "bob",
    displayName: "Bob",
    credentials: [
      {
        id: "mock_credential_bob_1",
        publicKey: "mock_public_key_bob_1_b64url",
        counter: 1,
        transports: ["internal"],
        type: "public-key",
      },
    ],
    registeredAt: new Date().toISOString(),
  },
};

// Utility functions
export function generateMockCredentialId(username: string): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `mock_${username}_${timestamp}_${random}`;
}

export function generateMockPublicKey(username: string): string {
  const mockData = `mock_public_key_${username}_${Date.now()}`;
  return btoa(mockData)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function generateMockChallenge(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createMockUser(
  username: string,
  displayName: string,
  email?: string,
  firstName?: string,
  lastName?: string
): MockUser {
  return {
    username,
    displayName,
    email,
    firstName,
    lastName,
    credentials: [
      {
        id: generateMockCredentialId(username),
        publicKey: generateMockPublicKey(username),
        counter: 1,
        transports: ["internal"],
        type: "public-key",
      },
    ],
    registeredAt: new Date().toISOString(),
  };
}
