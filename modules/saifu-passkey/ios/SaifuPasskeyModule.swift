// Native passkey bridge — iOS (T-030-02).
//
// Performs platform passkey ceremonies with ASAuthorization and returns their
// raw outputs, base64url-encoded, for src/passkey/credentials-container.ts to
// shape into WebAuthn responses. User verification is always required.
// Nothing here stores, derives, or interprets credentials.

import AuthenticationServices
import ExpoModulesCore

struct CreateRequest: Record {
  @Field var rpId: String = ""
  @Field var rpName: String = ""
  @Field var challenge: String = ""
  @Field var userId: String = ""
  @Field var userName: String = ""
  @Field var userDisplayName: String = ""
  @Field var excludeCredentialIds: [String] = []
  @Field var timeoutMs: Double = 60000
}

struct GetRequest: Record {
  @Field var rpId: String = ""
  @Field var challenge: String = ""
  @Field var allowCredentialIds: [String] = []
  @Field var timeoutMs: Double = 60000
}

final class PasskeyCancelledException: Exception {
  override var reason: String { "The passkey request was cancelled" }
}

final class PasskeyNoCredentialException: Exception {
  override var reason: String { "No passkey is available for this request" }
}

final class PasskeyFailedException: GenericException<String> {
  override var reason: String { "The passkey request failed: \(param)" }
}

public final class SaifuPasskeyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SaifuPasskey")

    // Platform passkeys need iOS 16; the deployment target is above it.
    Function("isSupported") { () -> Bool in
      true
    }

    AsyncFunction("create") { (request: CreateRequest, promise: Promise) in
      guard
        let challenge = Data(base64URL: request.challenge),
        let userId = Data(base64URL: request.userId)
      else {
        promise.reject(PasskeyFailedException("malformed base64url input"))
        return
      }
      let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: request.rpId)
      let registration = provider.createCredentialRegistrationRequest(
        challenge: challenge, name: request.userName, userID: userId)
      registration.displayName = request.userDisplayName
      registration.userVerificationPreference = .required
      registration.attestationPreference = .none
      if #available(iOS 17.4, *) {
        registration.excludedCredentials = request.excludeCredentialIds.compactMap {
          Data(base64URL: $0).map { ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: $0) }
        }
      }
      PasskeyCeremony(request: registration, promise: promise).perform()
    }.runOnQueue(.main)

    AsyncFunction("get") { (request: GetRequest, promise: Promise) in
      guard let challenge = Data(base64URL: request.challenge) else {
        promise.reject(PasskeyFailedException("malformed base64url input"))
        return
      }
      let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: request.rpId)
      let assertion = provider.createCredentialAssertionRequest(challenge: challenge)
      assertion.userVerificationPreference = .required
      assertion.allowedCredentials = request.allowCredentialIds.compactMap {
        Data(base64URL: $0).map { ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: $0) }
      }
      PasskeyCeremony(request: assertion, promise: promise).perform()
    }.runOnQueue(.main)
  }
}

/// Ceremonies in flight, retained until their delegate callback arrives.
private var pendingCeremonies = Set<PasskeyCeremony>()

private final class PasskeyCeremony: NSObject, ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding
{
  private let request: ASAuthorizationRequest
  private let promise: Promise
  private var controller: ASAuthorizationController?

  init(request: ASAuthorizationRequest, promise: Promise) {
    self.request = request
    self.promise = promise
  }

  func perform() {
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self
    self.controller = controller
    pendingCeremonies.insert(self)
    controller.performRequests()
  }

  func authorizationController(
    controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    defer { pendingCeremonies.remove(self) }
    switch authorization.credential {
    case let credential as ASAuthorizationPlatformPublicKeyCredentialRegistration:
      guard let attestationObject = credential.rawAttestationObject else {
        promise.reject(PasskeyFailedException("the platform returned no attestation object"))
        return
      }
      promise.resolve([
        "rawId": credential.credentialID.base64URLEncodedString(),
        "clientDataJSON": credential.rawClientDataJSON.base64URLEncodedString(),
        "attestationObject": attestationObject.base64URLEncodedString(),
      ])
    case let credential as ASAuthorizationPlatformPublicKeyCredentialAssertion:
      promise.resolve([
        "rawId": credential.credentialID.base64URLEncodedString(),
        "clientDataJSON": credential.rawClientDataJSON.base64URLEncodedString(),
        "authenticatorData": credential.rawAuthenticatorData.base64URLEncodedString(),
        "signature": credential.signature.base64URLEncodedString(),
        "userHandle": credential.userID.base64URLEncodedString(),
      ])
    default:
      promise.reject(PasskeyFailedException("the platform returned an unexpected credential"))
    }
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    defer { pendingCeremonies.remove(self) }
    guard let error = error as? ASAuthorizationError else {
      promise.reject(PasskeyFailedException(error.localizedDescription))
      return
    }
    switch error.code {
    case .canceled:
      promise.reject(PasskeyCancelledException())
    case .notHandled, .notInteractive:
      promise.reject(PasskeyNoCredentialException())
    default:
      // Includes a missing or unverified associated domain for the RP id.
      promise.reject(PasskeyFailedException(error.localizedDescription))
    }
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    return scenes.flatMap(\.windows).first(where: \.isKeyWindow) ?? ASPresentationAnchor()
  }
}

extension Data {
  init?(base64URL text: String) {
    var base64 = text.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    base64 += String(repeating: "=", count: (4 - base64.count % 4) % 4)
    self.init(base64Encoded: base64)
  }

  func base64URLEncodedString() -> String {
    base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }
}
