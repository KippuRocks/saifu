import { StoredCredential, StoredUser } from "./webauthn/storage";

import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "users.json");

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Initialize DB file if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
}

export class ServerStorage {
  private static loadUsers(): Record<string, StoredUser> {
    try {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to load users from server DB:", error);
      return {};
    }
  }

  private static saveUsers(users: Record<string, StoredUser>): void {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error("Failed to save users to server DB:", error);
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
      (c: StoredCredential) => c.id === credential.id
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

  static userExists(username: string): boolean {
    return this.getUser(username) !== null;
  }
}
