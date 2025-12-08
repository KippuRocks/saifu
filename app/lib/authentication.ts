import { ClientAccountProvider } from "@ticketto/protocol";

/**
 * Represents the basic profile information for a user.
 */
export type ProfileInfo = {
  /** The user's display name. */
  displayName: string;
  /** The user's first name (optional). */
  firstName?: string;
  /** The user's last name (optional). */
  lastName?: string;
};

/**
 * Represents the result of an operation.
 * It can be either a success or a failure with an error message.
 */
export type Result =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Interface for an authentication service.
 * This service handles user registration, login, session management, and provides an account provider for blockchain interactions.
 *
 * @template L The type of the login info returned by `getCurrentUser`.
 * @template P The type of the profile information, extending `ProfileInfo`. Defaults to `ProfileInfo`.
 */
export interface AuthenticationService<L, P extends ProfileInfo = ProfileInfo> {
  /**
   * Registers a new user with the provided profile information.
   *
   * @param email The email of the new user.
   * @param userData The profile information for the new user.
   * @returns A promise that resolves to a `Result` object indicating success or failure.
   */
  register(email: string, profileInfo: P): Promise<Result>;

  /**
   * Logs in a user using their email address.
   *
   * @param email The email address of the user to log in.
   * @returns A promise that resolves to a `Result` object indicating success or failure.
   */
  login(email: string): Promise<Result>;

  /**
   * Checks if a user is currently logged in.
   *
   * @returns `true` if a user is logged in, `false` otherwise.
   */
  isLoggedIn(): boolean;

  /**
   * Retrieves the currently logged-in user and their profile information.
   *
   * @returns An object containing the user and optional profile, or `undefined` if no user is logged in.
   */
  getCurrentUser(): { login: L; profile?: P } | undefined;

  /**
   * Retrieves the account provider for the authenticated user.
   * This provider is used for signing transactions and interacting with the blockchain.
   *
   * @returns A promise that resolves to a `ClientAccountProvider`.
   */
  getAccountProvider(): Promise<ClientAccountProvider>;

  /**
   * Logs out the current user.
   *
   * @returns A promise that resolves when the logout operation is complete, or void if synchronous.
   */
  logout(): Promise<void> | void;
}
