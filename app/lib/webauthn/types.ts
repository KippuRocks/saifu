// WebAuthn types and interfaces for Virtonetwork ecosystem

// Base credential structure matching Virtonetwork's approach
export interface WebAuthnCredential {
  id: string; // Base64URL encoded credential ID
  publicKey: string; // Base64URL encoded public key
  counter?: number;
  transports?: AuthenticatorTransport[];
  type: "public-key";
}

// User registration data structure
export interface UserRegistrationData {
  username: string;
  displayName: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  credentials: WebAuthnCredential[];
}

// User credential request structure for login
export interface CredentialRequest {
  username: string;
  userVerification: UserVerificationRequirement;
  timeout: number;
}

// Response from credentials API
export interface CredentialsResponse {
  credentials: WebAuthnCredential[];
  challenge: string;
  rpId: string;
  origin: string;
}

// User data stored in mock database
export interface StoredUser {
  username: string;
  displayName: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  credentials: WebAuthnCredential[];
  registeredAt: Date;
}

// Mock database of users
export interface MockUserDatabase {
  [username: string]: StoredUser;
}

// Registration response
export interface RegistrationResponse {
  success: boolean;
  message?: string;
  user?: StoredUser;
}

// Authentication state
export interface AuthenticationState {
  isAuthenticated: boolean;
  user?: StoredUser;
  error?: string;
}

// WebAuthn options for creation (simplified for mock)
export interface RegistrationOptions {
  username: string;
  displayName: string;
  userVerification: UserVerificationRequirement;
  timeout: number;
}

// Mock credential data for testing
export interface MockCredentialData {
  username: string;
  credentialId: string;
  publicKey: string;
}
