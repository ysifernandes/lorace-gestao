// NÃO COMPILADO. Verifica HMAC-SHA256 do envelope (chave por dispositivo, derivada no servidor) + expiração + nonce.
// ATENÇÃO: a canonicalização JSON deve ser byte-a-byte igual à de packages/security (chaves ordenadas, sem espaços).
// Cobrir com vetores de teste compartilhados antes de usar.
package br.edu.guard

import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class CommandVerifier(private val deviceKey: String, private val deviceId: String, private val seenNonces: MutableSet<String>) {
    sealed interface Result { object Ok : Result; data class Rejected(val reason: String) : Result }

    fun verify(canonicalBody: String, signatureHex: String, nonce: String, deviceIdInBody: String, issuedAt: Long, expiresAt: Long, now: Long): Result {
        val mac = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(deviceKey.toByteArray(), "HmacSHA256")) }
        val expected = mac.doFinal(canonicalBody.toByteArray())
        val given = signatureHex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
        if (!MessageDigest.isEqual(expected, given)) return Result.Rejected("bad_signature")   // tempo constante
        if (deviceIdInBody != deviceId) return Result.Rejected("wrong_device")
        if (issuedAt - 60_000 > now) return Result.Rejected("not_yet_valid")
        if (now > expiresAt) return Result.Rejected("expired")
        if (!seenNonces.add(nonce)) return Result.Rejected("replay")   // persistir o conjunto (EncryptedSharedPreferences)
        return Result.Ok
    }
}
