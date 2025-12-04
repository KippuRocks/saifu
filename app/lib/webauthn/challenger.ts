"use client";

/**
 * Mock Challenge Generation Utilities for Virtonetwork WebAuthn
 * This provides the blockchain-based challenge generation functionality
 * following Virtonetwork patterns for use in mock implementations
 */
export class MockChallengeGenerator {
  /**
   * Generate a blockchain-based challenge using Virtonetwork pattern
   *
   * @param ctx - Context data (e.g., block number or context bytes)
   * @param xtc - Additional context data (e.g., user identifier)
   * @returns Generated challenge bytes
   */
  async generate(ctx: Uint8Array, xtc: Uint8Array): Promise<Uint8Array> {
    console.log("🎯 Mock Challenge Generator: Generating blockchain challenge");
    console.log("📊 Context (ctx):", Array.from(ctx));
    console.log("👤 User context (xtc):", Array.from(xtc));

    // Convert ctx to block number (assuming ctx contains block data)
    let blockNumber = 0;
    if (ctx.byteLength >= 8) {
      const view = new DataView(
        ctx.buffer.slice(ctx.byteOffset, ctx.byteOffset + 8)
      );
      blockNumber = Number(view.getBigUint64(0, false));
    } else {
      // Fallback to timestamp-based block number
      blockNumber = Math.floor(Date.now() / 1000 / 15);
    }

    // Virtonetwork pattern for challenge generation
    const challenge = new Uint8Array(32);
    const blockBytes = new Uint8Array(8);
    const blockView = new DataView(blockBytes.buffer);
    blockView.setBigUint64(0, BigInt(blockNumber), false);

    // Mix block number with user context for unique challenge
    for (let i = 0; i < 32; i++) {
      if (i < 8) {
        challenge[i] = blockBytes[i];
      } else if (i < 16 && xtc.length > 0) {
        // Include some user context
        challenge[i] = xtc[i - 8] || (i * 17 + blockNumber) % 256;
      } else {
        // Use block number and user context as seed
        const userByte = xtc.length > 0 ? xtc[(i - 16) % xtc.length] : 0;
        challenge[i] = (i * 17 + blockNumber * 31 + userByte * i) % 256;
      }
    }

    console.log("🔑 Generated challenge:", Array.from(challenge));
    return challenge;
  }

  /**
   * Verify a blockchain challenge response
   * Mock implementation - in real usage this would verify against blockchain
   */
  async verify(challenge: Uint8Array, response: any): Promise<boolean> {
    console.log("✅ Mock Challenge Generator: Verifying challenge response");
    console.log("🔑 Challenge:", Array.from(challenge));

    // Mock verification - in real implementation this would:
    // 1. Extract signature from response
    // 2. Verify against blockchain network
    // 3. Check user authorization
    // 4. Validate challenge freshness

    // For mock purposes, always return true
    console.log("✅ Mock verification passed");
    return true;
  }

  /**
   * Get the current blockchain context
   * In real implementation, this would fetch latest block from blockchain
   */
  async getCurrentBlock(): Promise<Uint8Array> {
    // Mock current block number (in production, this would fetch from blockchain)
    const mockBlockNumber = Math.floor(Date.now() / 1000 / 15);
    const blockBytes = new Uint8Array(8);
    const view = new DataView(blockBytes.buffer);
    view.setBigUint64(0, BigInt(mockBlockNumber), false);

    console.log(
      "📊 Mock Challenge Generator: Current block context:",
      Array.from(blockBytes)
    );
    return blockBytes;
  }

  /**
   * Generate challenge with current blockchain context
   * @param userContext - User identifier context
   */
  async generateCurrent(userContext?: Uint8Array): Promise<Uint8Array> {
    const currentBlock = await this.getCurrentBlock();
    const xtc = userContext || new Uint8Array(32).fill(0); // Default zero context
    return this.generate(currentBlock, xtc);
  }

  /**
   * Create user context from username
   * @param username - Username to create context from
   */
  createUserContext(username: string): Uint8Array {
    const context = new Uint8Array(32);
    const encoder = new TextEncoder();
    const usernameBytes = encoder.encode(username);

    for (let i = 0; i < 32; i++) {
      if (i < usernameBytes.length) {
        context[i] = usernameBytes[i];
      } else {
        context[i] = 0; // Pad with zeros
      }
    }

    return context;
  }

  /**
   * Create a blockchain challenge for a specific user
   * @param username - Username to create challenge for
   * @returns Promise resolving to challenge bytes
   */
  async createUserChallenge(username: string): Promise<Uint8Array> {
    const userContext = this.createUserContext(username);
    return this.generateCurrent(userContext);
  }

  /**
   * Generate a simple challenge (non-blockchain) for testing
   * @param seed - Optional seed for deterministic challenges
   * @returns Simple challenge bytes
   */
  generateSimple(seed?: string): Uint8Array {
    const challenge = new Uint8Array(32);
    const seedValue = seed ? seed.length : Math.floor(Date.now() / 1000);

    for (let i = 0; i < 32; i++) {
      challenge[i] = (i * 7 + seedValue * 13 + 17) % 256;
    }

    return challenge;
  }
}

// Export singleton instance
export const mockChallengeGenerator = new MockChallengeGenerator();

// Export utility functions
export const generateCurrentChallenge = (userContext?: Uint8Array) =>
  mockChallengeGenerator.generateCurrent(userContext);

export const createUserChallenge = (username: string) =>
  mockChallengeGenerator.createUserChallenge(username);

export const generateSimpleChallenge = (seed?: string) =>
  mockChallengeGenerator.generateSimple(seed);
