"use client";

// Persistent mock storage using localStorage and file system
// This simulates external identity API and blockchain registration

export interface StoredCredential {
  id: string;
  publicKey: string;
  createdAt: string;
  counter: number;
  transports: string[];
  type: string;
}

export interface StoredUser {
  username: string;
  displayName: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  credentials: StoredCredential[];
  registeredAt: string;
  blockchainRegistered: boolean;
}

const STORAGE_KEY = "saifu_webauthn_users";
const PREDEFINED_USERS = {
  alice: {
    username: "alice",
    displayName: "Alice",
    email: "alice@example.com",
    credentials: [
      {
        id: "mock_credential_alice_1",
        publicKey: "mock_public_key_alice_1_b64url",
        createdAt: new Date().toISOString(),
        counter: 1,
        transports: ["internal"],
        type: "public-key",
      },
    ],
    registeredAt: "2024-01-01T00:00:00.000Z",
    blockchainRegistered: true,
  },
  bob: {
    username: "bob",
    displayName: "Bob",
    email: "bob@example.com",
    credentials: [
      {
        id: "mock_credential_bob_1",
        publicKey: "mock_public_key_bob_1_b64url",
        createdAt: new Date().toISOString(),
        counter: 1,
        transports: ["internal"],
        type: "public-key",
      },
    ],
    registeredAt: "2024-01-01T00:00:00.000Z",
    blockchainRegistered: true,
  },
};

export class PersistentStorage {
  private static loadUsers(): Record<string, StoredUser> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const users = JSON.parse(stored);
        // Merge with predefined users
        return { ...PREDEFINED_USERS, ...users };
      }
    } catch (error) {
      console.warn("Failed to load users from storage:", error);
    }
    return { ...PREDEFINED_USERS };
  }

  private static saveUsers(users: Record<string, StoredUser>): void {
    try {
      // Only save users that aren't predefined
      const userEntries = Object.entries(users).filter(
        ([_, user]) => !Object.keys(PREDEFINED_USERS).includes(user.username)
      );
      const userData = Object.fromEntries(userEntries);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch (error) {
      console.warn("Failed to save users to storage:", error);
    }
  }

  static getUser(username: string): StoredUser | null {
    const users = this.loadUsers();
    return users[username.toLowerCase()] || null;
  }

  static saveUser(user: StoredUser): void {
    const users = this.loadUsers();
    users[user.username.toLowerCase()] = user;
    this.saveUsers(users);
  }

  static createUser(
    userData: Omit<
      StoredUser,
      "credentials" | "registeredAt" | "blockchainRegistered"
    > & { credentials?: StoredCredential[] }
  ): StoredUser {
    const newUser: StoredUser = {
      ...userData,
      credentials: userData.credentials || [],
      registeredAt: new Date().toISOString(),
      blockchainRegistered: false,
    };
    this.saveUser(newUser);
    return newUser;
  }

  static updateUserCredentials(
    username: string,
    credential: StoredCredential
  ): boolean {
    const user = this.getUser(username);
    if (!user) return false;

    // Check if credential already exists
    const existingIndex = user.credentials.findIndex(
      (c) => c.id === credential.id
    );
    if (existingIndex >= 0) {
      user.credentials[existingIndex] = credential;
    } else {
      user.credentials.push(credential);
    }

    // Mark as blockchain registered when first credential is added
    if (user.credentials.length === 1) {
      user.blockchainRegistered = true;
    }

    this.saveUser(user);
    return true;
  }

  static deleteUser(username: string): boolean {
    const users = this.loadUsers();
    if (users[username.toLowerCase()]) {
      delete users[username.toLowerCase()];
      this.saveUsers(users);
      return true;
    }
    return false;
  }

  static getAllUsers(): StoredUser[] {
    return Object.values(this.loadUsers());
  }

  static getUserCredentials(username: string): StoredCredential[] {
    const user = this.getUser(username);
    return user?.credentials || [];
  }

  static userExists(username: string): boolean {
    return this.getUser(username) !== null;
  }

  static isBlockchainRegistered(username: string): boolean {
    const user = this.getUser(username);
    return user?.blockchainRegistered || false;
  }
}
