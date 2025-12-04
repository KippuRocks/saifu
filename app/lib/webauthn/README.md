# WebAuthn Implementation for Virtonetwork Ecosystem

This implementation provides a complete WebAuthn login and registration flow compatible with the Virtonetwork ecosystem, including `@virtonetwork/authenticators-webauthn` and `@virtonetwork/signer`.

## 🏗️ Architecture Overview

The implementation follows the Virtonetwork WebAuthn pattern with the following components:

### 📁 File Structure

```
app/
├── lib/webauthn/
│   ├── types.ts           # TypeScript interfaces for WebAuthn
│   ├── mock-database.ts   # Shared mock user database
│   ├── mock.ts           # Mock utility functions
│   ├── handler.ts        # Client-side WebAuthn service
│   └── README.md         # This file
├── api/
│   ├── credentials/route.ts      # GET /api/credentials
│   └── auth/register/route.ts    # POST /api/auth/register
└── (public)/page.tsx            # Updated login page
```

## 🔧 Core Components

### 1. TypeScript Interfaces (`types.ts`)

- `WebAuthnCredential` - Base credential structure
- `UserRegistrationData` - Registration data structure
- `CredentialsResponse` - API response format
- `StoredUser` - User data model
- `AuthenticationState` - Auth state management

### 2. Mock Database (`mock-database.ts`)

- **Shared database** for both API routes
- **Pre-populated users**: `alice` and `bob`
- **Utility functions**:
  - `generateMockCredentialId()` - Creates realistic credential IDs
  - `generateMockPublicKey()` - Generates base64url encoded public keys
  - `generateMockChallenge()` - Creates authentication challenges
  - `createMockUser()` - Creates new user records

### 3. WebAuthn Handler (`handler.ts`)

- **VirtonetworkWebAuthnHandler** class implementing `WebAuthnHandler` interface
- **WebAuthnService** singleton for client-side operations
- **Key methods**:
  - `loginWithUsername()` - Complete login flow
  - `registerUser()` - User registration
  - `isLoggedIn()` - Auth state check
  - `logout()` - Session cleanup

### 4. API Routes

#### `GET /api/credentials?username={username}`

- **Purpose**: Fetch user credentials for login
- **Mock**: Simulates external identity API
- **Returns**: Credentials array, challenge, RP ID, origin

#### `POST /api/auth/register`

- **Purpose**: Register new users
- **Mock**: Simulates blockchain registration via identity server
- **Returns**: User data with generated credentials

### 5. Updated Login Page (`(public)/page.tsx`)

- **Username input** instead of account selection
- **Login/Register buttons** with modal dialog
- **WebAuthn service integration** for authentication
- **Error handling** and loading states

## 🔄 Authentication Flow

### Login Process

1. **User enters username** → `handleLogin()`
2. **Fetch credentials** → `GET /api/credentials`
3. **WebAuthn authentication** → Mock browser API call
4. **Session storage** → `localStorage` with user data
5. **Redirect** → `/authenticated/events`

### Registration Process

1. **User clicks "Register"** → Opens modal dialog
2. **Fill user details** → Form validation
3. **Submit registration** → `POST /api/auth/register`
4. **Generate credentials** → Mock WebAuthn credential creation
5. **Store in database** → Add to mock user database
6. **Auto-login** → Optionally log in after registration

## 🔑 WebAuthn Data Structures

### Mock Credentials

```typescript
{
  id: "mock_credential_alice_1",
  publicKey: "mock_public_key_alice_1_b64url",
  counter: 1,
  transports: ["internal"],
  type: "public-key"
}
```

### User Records

```typescript
{
  username: "alice",
  displayName: "Alice",
  email: "alice@example.com",
  credentials: [...],
  registeredAt: "2024-01-01T00:00:00.000Z"
}
```

## 🚀 Usage

### Login

```typescript
const result = await webAuthnService.loginWithUsername("alice");
if (result.success) {
  // User authenticated, redirect or update UI
}
```

### Register

```typescript
const userData = {
  username: "newuser",
  displayName: "New User",
  email: "user@example.com"
};
const result = await webAuthnService.registerUser(userData);
```

### Check Auth State

```typescript
if (webAuthnService.isLoggedIn()) {
  const user = webAuthnService.getCurrentUser();
  // User is authenticated
}
```

## 🔮 Future Integration

This implementation is designed for easy upgrade to real WebAuthn:

### Replace Mock Handler

```typescript
import { VirtonetworkWebAuthnHandler } from "@virtonetwork/authenticators-webauthn";

// In production, replace with real handler
const realHandler = new VirtonetworkWebAuthnHandler();
const webAuthnService = new WebAuthnService(realHandler);
```

### External API Integration

```typescript
// Replace mock database with real API calls
const response = await fetch(`${IDENTITY_API}/credentials/${username}`);
// Replace with: await identityApi.getUserCredentials(username);
```

### Blockchain Registration

```typescript
// Replace mock registration with blockchain call
const result = await blockchain.registerUser(userData);
// Replace with: await signer.registerUser(userData);
```

## 🧪 Testing

### Mock Users

- **Username**: `alice`, **Password**: Any (uses WebAuthn)
- **Username**: `bob`, **Password**: Any (uses WebAuthn)

### Test Flow

1. **Visit** `/` (login page)
2. **Try login** with `alice` or `bob`
3. **Register new user** with "Register" button
4. **Check console logs** for authentication steps

## 📊 Key Features

✅ **Virtonetwork Compatible** - Ready for `@virtonetwork/authenticators-webauthn`  
✅ **Client-side Login** - No server-side session management needed  
✅ **Mock Implementation** - Fully functional with fake data  
✅ **TypeScript Support** - Complete type definitions  
✅ **Error Handling** - Comprehensive error management  
✅ **Session Management** - Local storage based authentication  
✅ **Registration Flow** - Complete user onboarding  
✅ **Modular Architecture** - Easy to extend and modify  

## 🔄 Migration Path

1. **Phase 1**: Current mock implementation (✅ Complete)
2. **Phase 2**: Replace `VirtonetworkWebAuthnHandler` with real handler
3. **Phase 3**: Connect to external identity API
4. **Phase 4**: Implement blockchain registration
5. **Phase 5**: Production deployment

The implementation provides a solid foundation that closely matches the Virtonetwork ecosystem patterns while maintaining full functionality through mocked implementations.
