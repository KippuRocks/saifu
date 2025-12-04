import type { NextRequest } from "next/server";
import { ServerStorage } from "../../lib/server-db.ts";
import { StoredCredential } from "../../lib/webauthn/storage.ts";

// Mock blockchain challenge generation
// In real implementation, this would come from blockchain context
function generateBlockchainChallenge(blockNumber: number): Uint8Array {
  const challenge = new Uint8Array(32);
  const blockBytes = new Uint8Array(8);
  const view = new DataView(blockBytes.buffer);
  view.setBigUint64(0, BigInt(blockNumber), false); // big-endian

  for (let i = 0; i < 32; i++) {
    if (i < 8) {
      challenge[i] = blockBytes[i];
    } else {
      // Add some deterministic pattern based on username
      challenge[i] = (i * 17 + blockNumber) % 256;
    }
  }

  return challenge;
}

// Convert Uint8Array to base64url for JSON serialization
function toBase64Url(data: Uint8Array): string {
  let base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get("username");

  if (!username) {
    return new Response(JSON.stringify({ error: "Username is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = ServerStorage.getUser(username);

  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Mock blockchain context (in real implementation, this would be actual block data)
  const mockBlockNumber = Math.floor(Date.now() / 1000 / 15); // Roughly one per 15 seconds
  const challenge = generateBlockchainChallenge(mockBlockNumber);

  // Check if user is registered on blockchain
  if (!user.blockchainRegistered) {
    return new Response(
      JSON.stringify({
        error: "User not registered on blockchain",
        requiresRegistration: true,
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const response = {
    credentials: user.credentials.map((cred: StoredCredential) => ({
      id: cred.id,
      publicKey: cred.publicKey,
      counter: cred.counter,
      transports: cred.transports,
      type: cred.type,
    })),
    challenge: toBase64Url(challenge),
    blockNumber: mockBlockNumber,
    rpId: "localhost",
    origin: request.nextUrl.origin,
    blockchainContext: {
      blockNumber: mockBlockNumber,
      challenge: toBase64Url(challenge),
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
