// Native passkey bridge — Android (T-030-02).
//
// Performs platform passkey ceremonies with Credential Manager and returns their
// raw outputs, base64url-encoded, for src/passkey/credentials-container.ts to
// shape into WebAuthn responses. User verification is always required.
// Nothing here stores, derives, or interprets credentials.

package rocks.kippu.saifu.passkey

import android.os.Build
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PublicKeyCredential
import androidx.credentials.exceptions.CreateCredentialCancellationException
import androidx.credentials.exceptions.CreateCredentialException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import org.json.JSONArray
import org.json.JSONObject

class CreateRequest : Record {
  @Field val rpId: String = ""
  @Field val rpName: String = ""
  @Field val challenge: String = ""
  @Field val userId: String = ""
  @Field val userName: String = ""
  @Field val userDisplayName: String = ""
  @Field val excludeCredentialIds: List<String> = emptyList()
  @Field val timeoutMs: Double = 60000.0
}

class GetRequest : Record {
  @Field val rpId: String = ""
  @Field val challenge: String = ""
  @Field val allowCredentialIds: List<String> = emptyList()
  @Field val timeoutMs: Double = 60000.0
}

private fun cancelled(cause: Throwable) =
  CodedException("ERR_PASSKEY_CANCELLED", "The passkey request was cancelled", cause)

private fun noCredential(cause: Throwable) =
  CodedException("ERR_PASSKEY_NO_CREDENTIAL", "No passkey is available for this request", cause)

private fun failed(message: String, cause: Throwable? = null) =
  CodedException("ERR_PASSKEY_FAILED", "The passkey request failed: $message", cause)

class SaifuPasskeyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SaifuPasskey")

    // Credential Manager serves passkeys from Android 9 (API 28), through Google
    // Play services below Android 14.
    Function("isSupported") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
    }

    AsyncFunction("create") Coroutine { request: CreateRequest ->
      val activity = appContext.currentActivity ?: throw failed("no current activity")
      val options = JSONObject()
        .put("challenge", request.challenge)
        .put("rp", JSONObject().put("id", request.rpId).put("name", request.rpName))
        .put(
          "user",
          JSONObject()
            .put("id", request.userId)
            .put("name", request.userName)
            .put("displayName", request.userDisplayName),
        )
        .put("pubKeyCredParams", JSONArray().put(JSONObject().put("type", "public-key").put("alg", -7)))
        .put("timeout", request.timeoutMs.toLong())
        .put("attestation", "none")
        .put("excludeCredentials", descriptors(request.excludeCredentialIds))
        .put(
          "authenticatorSelection",
          JSONObject()
            .put("authenticatorAttachment", "platform")
            .put("residentKey", "required")
            .put("requireResidentKey", true)
            .put("userVerification", "required"),
        )
      val response = try {
        CredentialManager.create(activity)
          .createCredential(activity, CreatePublicKeyCredentialRequest(options.toString()))
      } catch (e: CreateCredentialCancellationException) {
        throw cancelled(e)
      } catch (e: CreateCredentialException) {
        // Includes a Digital Asset Links failure for the RP id.
        throw failed("${e.type}: ${e.errorMessage}", e)
      }
      val json = (response as? CreatePublicKeyCredentialResponse)?.registrationResponseJson
        ?: throw failed("the platform returned an unexpected credential")
      val credential = JSONObject(json)
      val body = credential.getJSONObject("response")
      mapOf(
        "rawId" to base64Url(credential.getString("rawId")),
        "clientDataJSON" to base64Url(body.getString("clientDataJSON")),
        "attestationObject" to base64Url(body.getString("attestationObject")),
      )
    }

    AsyncFunction("get") Coroutine { request: GetRequest ->
      val activity = appContext.currentActivity ?: throw failed("no current activity")
      val options = JSONObject()
        .put("challenge", request.challenge)
        .put("rpId", request.rpId)
        .put("allowCredentials", descriptors(request.allowCredentialIds))
        .put("timeout", request.timeoutMs.toLong())
        .put("userVerification", "required")
      val response = try {
        CredentialManager.create(activity).getCredential(
          activity,
          GetCredentialRequest(listOf(GetPublicKeyCredentialOption(options.toString()))),
        )
      } catch (e: GetCredentialCancellationException) {
        throw cancelled(e)
      } catch (e: NoCredentialException) {
        throw noCredential(e)
      } catch (e: GetCredentialException) {
        throw failed("${e.type}: ${e.errorMessage}", e)
      }
      val json = (response.credential as? PublicKeyCredential)?.authenticationResponseJson
        ?: throw failed("the platform returned an unexpected credential")
      val credential = JSONObject(json)
      val body = credential.getJSONObject("response")
      mapOf(
        "rawId" to base64Url(credential.getString("rawId")),
        "clientDataJSON" to base64Url(body.getString("clientDataJSON")),
        "authenticatorData" to base64Url(body.getString("authenticatorData")),
        "signature" to base64Url(body.getString("signature")),
        "userHandle" to body.optString("userHandle").takeIf { it.isNotEmpty() }?.let(::base64Url),
      )
    }
  }

  private fun descriptors(ids: List<String>): JSONArray =
    ids.fold(JSONArray()) { array, id ->
      array.put(
        JSONObject()
          .put("type", "public-key")
          .put("id", id)
          .put("transports", JSONArray().put("internal").put("hybrid")),
      )
    }

  /** Normalises the platform's base64 or base64url to unpadded base64url. */
  private fun base64Url(text: String): String =
    text.replace('+', '-').replace('/', '_').trimEnd('=')
}
