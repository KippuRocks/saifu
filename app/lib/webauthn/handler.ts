"use client";

import { createUserChallenge, mockChallengeGenerator } from "./challenger";

import { CredentialsHandler } from "@virtonetwork/authenticators-webauthn";
import { PersistentStorage } from "./storage";

// Mock Virtonetwork WebAuthn handler using the actual library interface
export class MockVirtonetworkCredentialsHandler implements CredentialsHandler {
  async publicKeyCreateOptions(
    challenge: Uint8Array,
    user: PublicKeyCredentialUserEntity
  ): Promise<CredentialCreationOptions["publicKey"]> {
    console.log("🔐 Mock WebAuthn publicKeyCreateOptions called");
    console.log("👤 User:", user);
    console.log("🔑 Challenge (bytes):", challenge);

    // Step 1: Check if username exists (local storage)
    const username = user.name;
    if (PersistentStorage.userExists(username)) {
      // User exists - this would be an "add new device" flow
      console.log("📋 User exists - would proceed with device addition flow");
    } else {
      // User doesn't exist - proceed with registration
      console.log("📋 User doesn't exist - proceeding with registration");
    }

    // Ensure we have a proper ArrayBuffer for BufferSource
    const challengeArray = new Uint8Array(challenge);
    const challengeBuffer = challengeArray.buffer.slice();

    // WebAuthn registration options
    return {
      challenge: challengeBuffer,
      rp: {
        name: "Virto Passkeys",
      },
      user: {
        id: user.id,
        name: user.name,
        displayName: user.displayName || user.name,
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 /* ES256 */ }],
      authenticatorSelection: {
        userVerification: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    };
  }

  async publicKeyRequestOptions(
    userId: string,
    challenge: Uint8Array
  ): Promise<CredentialRequestOptions["publicKey"]> {
    console.log("🔐 Mock WebAuthn publicKeyRequestOptions called");
    console.log("👤 User ID:", userId);
    console.log("🔑 Challenge (bytes):", challenge);

    // Step 1: Fetch credentials from local storage using username as userId
    let allowCredentials: PublicKeyCredentialDescriptor[] = [];

    let credentials = PersistentStorage.getUserCredentials(userId);

    // If no credentials found locally, try fetching from server
    if (credentials.length === 0) {
      console.log("⚠️ No local credentials found, fetching from server...");
      try {
        const response = await fetch(
          `/api/credentials?username=${encodeURIComponent(userId)}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.credentials && data.credentials.length > 0) {
            console.log(
              "✅ Fetched credentials from server:",
              data.credentials
            );

            // Save fetched credentials to local storage for future offline use
            // We also need to ensure the user exists locally
            if (!PersistentStorage.userExists(userId)) {
              PersistentStorage.createUser({
                username: userId,
                displayName: userId, // Placeholder until we fetch profile
                email: "",
                firstName: "",
                lastName: "",
              });
            }

            data.credentials.forEach((cred: any) => {
              const storedCred = {
                id: cred.id,
                publicKey: cred.publicKey,
                createdAt: new Date().toISOString(),
                counter: cred.counter || 0,
                transports: cred.transports || ["internal"],
                type: cred.type || "public-key",
              };
              PersistentStorage.updateUserCredentials(userId, storedCred);
            });

            // Update local variable
            credentials = PersistentStorage.getUserCredentials(userId);
          }
        } else {
          console.warn("❌ Failed to fetch credentials from server");
        }
      } catch (error) {
        console.error("❌ Error fetching credentials from server:", error);
        // If fetch fails and we have no local credentials, we can't proceed
        // But we return empty list and let the authenticator fail or handle it
      }
    }

    console.log("📋 Using credentials:", credentials);

    if (credentials.length === 0) {
      console.warn("❌ No credentials found for user (local or server)");
      // If we return empty allowCredentials, browser might show resident key prompt.
      // But if we know the user has no credentials, we should probably fail here.
      // However, the interface expects options.
      // Let's return null to signal failure to the caller.
      return null as any;
    }

    // Convert stored credentials to WebAuthn format
    allowCredentials =
      credentials.map((cred) => {
        // Convert base64url string to ArrayBuffer
        const normalizedId = cred.id.replace(/-/g, "+").replace(/_/g, "/");
        const paddedId =
          normalizedId + "=".repeat((4 - (normalizedId.length % 4)) % 4);
        const binary = atob(paddedId);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return {
          id: bytes.buffer.slice(),
          type: "public-key" as const,
          transports: (cred.transports as AuthenticatorTransport[]) || [
            "internal",
          ],
        };
      }) || [];

    // Ensure we have a proper ArrayBuffer for BufferSource
    const challengeArray = new Uint8Array(challenge);
    const challengeBuffer = challengeArray.buffer.slice();

    return {
      challenge: challengeBuffer,
      timeout: 60000,
      allowCredentials,
      userVerification: "preferred",
    };
  }

  async onCreatedCredentials(
    userId: string,
    credential: PublicKeyCredential
  ): Promise<void> {
    console.log("📝 Mock onCreatedCredentials called");
    console.log("👤 User ID:", userId);
    console.log("🔑 Credential:", {
      id: Array.from(new Uint8Array(credential.rawId)),
      type: credential.type,
    });

    // Step 1: Prepare credential data for local storage
    const rawIdArray = new Uint8Array(credential.rawId);
    const credentialId = btoa(String.fromCharCode(...rawIdArray))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const storedCredential = {
      id: credentialId,
      publicKey: "stored_public_key", // In real implementation, this would be the actual public key
      createdAt: new Date().toISOString(),
      counter: 0,
      transports: (
        credential.response as AuthenticatorAttestationResponse
      )?.getTransports() || ["internal"],
      type: credential.type,
    };

    // Step 2: Save to local storage
    PersistentStorage.updateUserCredentials(userId, storedCredential);
    console.log("✅ Credential saved to local storage");

    // Step 3: Sync with server (best effort)
    try {
      const credentialData = {
        userId,
        credentialId: credentialId,
        publicKey: "stored_public_key", // In real implementation, this would be the actual public key
        createdAt: new Date().toISOString(),
        counter: 0,
        transports: (
          credential.response as AuthenticatorAttestationResponse
        )?.getTransports() || ["internal"],
        type: credential.type,
        attestationData: {
          // Mock attestation data that would be sent to blockchain
          attestationResponse: btoa("mock_attestation_response"),
          clientData: btoa("mock_client_data"),
          authenticatorData: btoa("mock_authenticator_data"),
          signature: btoa("mock_signature"),
        },
        // Add user profile data for server sync
        username: userId, // Assuming userId is username for now
        displayName: userId, // Placeholder
      };

      // We need to fetch the user details from storage to send to server
      const user = PersistentStorage.getUser(userId);
      if (user) {
        Object.assign(credentialData, {
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      }

      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentialData),
      });

      if (registerResponse.ok) {
        console.log("✅ Server sync successful");
      } else {
        console.warn("⚠️ Server sync failed:", await registerResponse.text());
      }
    } catch (error) {
      console.warn("⚠️ Server sync failed (offline?):", error);
    }
  }
}

// Virtonetwork WebAuthn service following the actual library pattern
export class VirtonetworkWebAuthnService {
  private credentialsHandler: CredentialsHandler;
  private currentUserId: string | null = null;

  constructor(handler?: CredentialsHandler) {
    this.credentialsHandler =
      handler || new MockVirtonetworkCredentialsHandler();
  }

  // Mock setup() method that would compute hashedUserId in real implementation
  async setup(userId: string): Promise<this> {
    console.log("🚀 Mock Virtonetwork WebAuthn setup for:", userId);
    this.currentUserId = userId;
    return this;
  }

  // Mock registration that would use real WebAuthn API
  async register(blockNumber: number, displayName?: string): Promise<any> {
    console.log("📝 Virtonetwork WebAuthn register (Real API)");
    console.log("📊 Block Number:", blockNumber);
    console.log("👤 Display Name:", displayName);

    // 1. Get creation options
    // We need a user entity. In a real app, this comes from the server or is generated.
    // Here we construct it from the display name or a temporary ID.
    // Since `registerUser` calls this, we need the username.
    // But `register` signature only takes blockNumber and displayName.
    // We'll assume the username is the displayName for now or we need to refactor `register` signature.
    // However, `registerUser` (lines 285+) has `userData.username`.
    // The `register` method in the library might be more complex.
    // Let's use a temporary user entity based on displayName.

    // Wait, `publicKeyCreateOptions` expects a `PublicKeyCredentialUserEntity`.
    // We need to pass the username to `register` to do this correctly.
    // But let's stick to the interface.

    // Actually, `registerUser` calls `setup(username)` first.
    // Maybe we can store the username in the service instance?
    // Or we can just pass it.

    // Let's assume `displayName` is the username for the ID generation for now,
    // or we can update `register` to take `username`.
    // But `register` is likely defined by an interface we are mocking.

    // Use the currentUserId set by setup() as the userId
    const userId = this.currentUserId || displayName || "user_" + Date.now();
    const userEntity: PublicKeyCredentialUserEntity = {
      id: new TextEncoder().encode(userId),
      name: userId,
      displayName: displayName || userId,
    };

    const challenge = new Uint8Array(32); // Should come from challenger
    window.crypto.getRandomValues(challenge);

    const options = await this.credentialsHandler.publicKeyCreateOptions(
      challenge,
      userEntity
    );

    if (!options) {
      throw new Error("Failed to get public key creation options");
    }

    // 2. Call navigator.credentials.create
    console.log("🔐 Calling navigator.credentials.create", options);
    const credential = (await navigator.credentials.create({
      publicKey: options,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error("WebAuthn registration failed");
    }

    console.log("✅ WebAuthn registration successful", credential);

    // 3. Handle created credentials (save to storage)
    await this.credentialsHandler.onCreatedCredentials(userId, credential);

    // 4. Return result
    return {
      credentialId: credential.id,
      publicKey: "stored_public_key", // We don't extract the real key in this mock handler yet
      meta: {
        authority_id: "mock_authority",
        device_id: "mock_device",
        context: blockNumber,
      },
      authenticator_data: new Uint8Array(32), // Mock data
      client_data: new Uint8Array(32), // Mock data
      public_key: new Uint8Array(32), // Mock data
    };
  }

  // Mock authentication that would use real WebAuthn API
  async authenticate(context: number, challenge: Uint8Array): Promise<any> {
    console.log("🔐 Virtonetwork WebAuthn authenticate (Real API)");
    console.log("📊 Context (Block Number):", context);
    console.log("🔑 Challenge:", Array.from(challenge));

    // We need the userId to get allowed credentials.
    // The `authenticate` method signature doesn't include userId.
    // However, `loginWithUsername` calls `setup(username)` before this.
    // We can store the username in the instance during `setup`.

    // But wait, `publicKeyRequestOptions` takes `userId`.
    // Where do we get `userId` from?
    // In the mock implementation of `publicKeyRequestOptions`, we used `userId` to fetch credentials.

    // Let's add a private property to store the current userId.
    if (!this.currentUserId) {
      throw new Error("User ID not set. Call setup() first.");
    }

    const options = await this.credentialsHandler.publicKeyRequestOptions(
      this.currentUserId,
      challenge
    );

    if (!options) {
      throw new Error("Failed to get public key request options");
    }

    console.log("🔐 Calling navigator.credentials.get", options);
    const credential = (await navigator.credentials.get({
      publicKey: options,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error("WebAuthn authentication failed");
    }

    console.log("✅ WebAuthn authentication successful", credential);

    return {
      meta: {
        authority_id: "mock_authority",
        user_id: new Uint8Array(32),
        context: context,
      },
      authenticator_data: new Uint8Array(32), // Mock data
      client_data: new Uint8Array(32), // Mock data
      signature: new Uint8Array(64), // Mock data
    };
  }

  // Client-side login using Virtonetwork pattern with blockchain challenges
  async loginWithEmail(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("🚀 Starting Virtonetwork login for:", email);

      // Step 1: Setup WebAuthn (mock)
      const webauthn = await this.setup(email);

      // Step 2: Generate blockchain challenge using mock challenge generator
      const blockchainChallenge = await createUserChallenge(email);

      console.log("📊 Using blockchain context with mock challenge generator");

      // Step 3: Mock authentication with blockchain challenge
      const authResult = await webauthn.authenticate(
        Date.now(),
        blockchainChallenge
      );

      if (authResult) {
        // Store user session
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            email,
            loginTime: new Date().toISOString(),
            blockchainContext: {
              challenge: btoa(String.fromCharCode(...blockchainChallenge)),
            },
          })
        );

        console.log("✅ Virtonetwork authentication successful");
        return { success: true };
      } else {
        return { success: false, error: "Authentication failed" };
      }
    } catch (error) {
      console.error("Virtonetwork login error:", error);
      return {
        success: false,
        error: "Login failed: " + (error as Error).message,
      };
    }
  }

  // Client-side registration using Virtonetwork pattern
  async registerUser(userData: {
    email: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("🚀 Starting Virtonetwork registration for:", userData.email);

      // Ensure user exists in storage BEFORE registration so credentials can be attached
      if (!PersistentStorage.userExists(userData.email)) {
        PersistentStorage.createUser({
          username: userData.email, // Use email as username
          displayName: userData.displayName,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
        });
      }

      // Step 1: Setup WebAuthn (mock)
      const webauthn = await this.setup(userData.email);

      // Step 2: Get blockchain context for registration using challenge generator
      const mockBlockNumber = Math.floor(Date.now() / 1000 / 15);
      console.log("📊 Using blockchain context for registration:", {
        blockNumber: mockBlockNumber,
      });

      // Step 3: Mock registration with blockchain context
      const registrationResult = await webauthn.register(
        mockBlockNumber,
        userData.displayName
      );

      if (registrationResult) {
        console.log("✅ Virtonetwork registration successful");
        return { success: true };
      } else {
        return { success: false, error: "Registration failed" };
      }
    } catch (error) {
      console.error("Virtonetwork registration error:", error);
      return {
        success: false,
        error: "Registration failed: " + (error as Error).message,
      };
    }
  }

  // Session management
  getCurrentUser(): { email: string; loginTime: string } | null {
    try {
      const userData = localStorage.getItem("currentUser");
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem("currentUser");
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }
}

// Export singleton instance
export const virtonetworkWebAuthnService = new VirtonetworkWebAuthnService();

// Legacy compatibility
export const webAuthnService = virtonetworkWebAuthnService;
