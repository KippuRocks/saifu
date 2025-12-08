export interface StoredCredential {
  id: string;
  createdAt: string;
  type: PublicKeyCredentialType;
}
export interface StoredUser {
  username: string;
  firstName?: string;
  lastName?: string;
  credentials: StoredCredential[];
  registeredAt: string;
}
