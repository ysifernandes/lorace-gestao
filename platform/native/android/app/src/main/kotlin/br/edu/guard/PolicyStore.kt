// NÃO COMPILADO / NÃO TESTADO EM DISPOSITIVO. Dependência: androidx.security:security-crypto (EncryptedSharedPreferences).
// Persiste regras, concessões, chave do dispositivo e nonces vistos — sobrevive a reinício e funciona offline.
package br.edu.guard

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import org.json.JSONObject

object PolicyStore {
    private fun prefs(ctx: Context) = EncryptedSharedPreferences.create(
        ctx, "guard_secure", MasterKey.Builder(ctx).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV, EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM)

    fun save(ctx: Context, r: Rules) {
        val j = JSONObject()
            .put("blocked", JSONArray(r.blockedApps.toList())).put("essential", JSONArray(r.essentialApps.toList()))
            .put("restricted", JSONArray(r.restrictedInWindows.toList()))
            .put("windows", JSONArray(r.windows.map { JSONObject().put("days", JSONArray(it.days.toList())).put("s", it.startMin).put("e", it.endMin) }))
            .put("grants", JSONArray(r.grants.map { JSONObject().put("app", it.appId).put("until", it.untilMs) }))
        prefs(ctx).edit().putString("rules", j.toString()).apply()
    }
    fun load(ctx: Context): Rules? {
        val raw = prefs(ctx).getString("rules", null) ?: return null
        val j = JSONObject(raw)
        fun set(a: JSONArray) = (0 until a.length()).map { a.getString(it) }.toSet()
        return Rules(set(j.getJSONArray("blocked")), set(j.getJSONArray("essential")), set(j.getJSONArray("restricted")),
            (0 until j.getJSONArray("windows").length()).map { i -> j.getJSONArray("windows").getJSONObject(i).let { w ->
                Window((0 until w.getJSONArray("days").length()).map { w.getJSONArray("days").getInt(it) }.toSet(), w.getInt("s"), w.getInt("e")) } },
            (0 until j.getJSONArray("grants").length()).map { i -> j.getJSONArray("grants").getJSONObject(i).let { Grant(it.getString("app"), it.getLong("until")) } })
    }
    fun credentials(ctx: Context): Triple<String, String, String>? = prefs(ctx).let { p -> p.getString("deviceId", null)?.let { Triple(it, p.getString("token", "")!!, p.getString("key", "")!!) } }
    fun saveCredentials(ctx: Context, id: String, token: String, key: String) { prefs(ctx).edit().putString("deviceId", id).putString("token", token).putString("key", key).apply() }
    fun seenNonces(ctx: Context): MutableSet<String> = prefs(ctx).getStringSet("nonces", emptySet())!!.toMutableSet()
    fun saveNonces(ctx: Context, s: Set<String>) { prefs(ctx).edit().putStringSet("nonces", s.toList().takeLast(500).toSet()).apply() }   // janela limitada
}
