// NÃO EXECUTADO. Valida que a canonicalização e o HMAC em Kotlin reproduzem tests/vectors/command-signing.json (gerado pelo TypeScript).
package br.edu.guard

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class VectorsTest {
    private val v = JSONObject(java.io.File("../../../../tests/vectors/command-signing.json").readText())
    @Test fun canonicalMatches() = assertEquals(v.getString("canonical"), CanonicalJson.of(v.getJSONObject("body")))
    @Test fun signatureMatches() {
        val mac = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(v.getString("deviceKey").toByteArray(), "HmacSHA256")) }
        assertEquals(v.getString("signature"), mac.doFinal(v.getString("canonical").toByteArray()).joinToString("") { "%02x".format(it) })
    }
    @Test fun policyBlocksAndEssentialsSurvive() {
        val r = Rules(setOf("yt"), setOf("dialer"), emptySet(), emptyList(), emptyList())
        assertEquals(false, evaluate(r, "yt", 1, 600, 0).allowed); assertEquals(true, evaluate(r.copy(blockedApps = setOf("dialer")), "dialer", 1, 600, 0).allowed)
    }
}
