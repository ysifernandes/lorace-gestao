// NÃO COMPILADO / NÃO TESTADO EM DISPOSITIVO. WorkManager: heartbeat → buscar comandos → verificar → aplicar → confirmar.
// Falhas: rede → Result.retry() (backoff exponencial); assinatura inválida → ack sync_failed; sem permissão → ack permission_unavailable.
// NUNCA confirma bloqueio sem que o mecanismo esteja ativo (PermissionState.enforcement).
package br.edu.guard

import android.content.Context
import androidx.work.*
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

class SyncWorker(private val ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val (deviceId, token, key) = PolicyStore.credentials(ctx) ?: return Result.failure()
        val base = inputData.getString("baseUrl") ?: return Result.failure()
        return try {
            Api.post("$base/devices/$deviceId/heartbeat", token, JSONObject().put("capabilities", JSONObject()
                .put("usageAccess", PermissionState.usageAccess(ctx)).put("enforcement", PermissionState.enforcement(ctx))).toString())
            val cmds = org.json.JSONArray(Api.get("$base/devices/$deviceId/commands", token))
            val nonces = PolicyStore.seenNonces(ctx)
            var rules = PolicyStore.load(ctx) ?: Rules(emptySet(), emptySet(), emptySet(), emptyList(), emptyList())
            val verifier = CommandVerifier(key, deviceId, nonces)
            for (i in 0 until cmds.length()) {
                val c = cmds.getJSONObject(i); val id = c.getString("id"); val env = c.getJSONObject("envelope"); val body = env.getJSONObject("body")
                val ack = { s: String, d: String? -> Api.post("$base/devices/$deviceId/commands/$id/ack", token, JSONObject().put("status", s).put("detail", d).toString()) }
                val res = verifier.verify(CanonicalJson.of(body), env.getString("signature"), body.getString("nonce"), body.getString("deviceId"), body.getLong("issuedAt"), body.getLong("expiresAt"), System.currentTimeMillis())
                ack("received", null)
                if (res is CommandVerifier.Result.Rejected) { ack("sync_failed", res.reason); continue }
                if (!PermissionState.enforcement(ctx)) { ack("permission_unavailable", "accessibility_disabled"); continue }
                val app = body.getJSONObject("payload").optString("appId")
                when (body.getString("type")) {
                    "block_app" -> { rules = rules.copy(blockedApps = rules.blockedApps + app, grants = rules.grants.filterNot { it.appId == app }); PolicyStore.save(ctx, rules); ack("block_applied", null) }
                    "unblock_app" -> { rules = rules.copy(blockedApps = rules.blockedApps - app); PolicyStore.save(ctx, rules); ack("unblock_applied", null) }
                    "grant_time" -> { val m = body.getJSONObject("payload").getInt("minutes"); rules = rules.copy(grants = rules.grants + Grant(app, System.currentTimeMillis() + m * 60_000L)); PolicyStore.save(ctx, rules); ack("unblock_applied", null) }
                    else -> ack("sync_failed", "unsupported_type")
                }
            }
            PolicyStore.saveNonces(ctx, nonces); Result.success()
        } catch (e: IOException) { Result.retry() }   // offline/servidor indisponível: tenta de novo com backoff
        catch (e: Exception) { Result.failure() }
    }
    companion object {
        fun enqueue(ctx: Context, baseUrl: String) = WorkManager.getInstance(ctx).enqueueUniqueWork("guard-sync", ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<SyncWorker>().setInputData(workDataOf("baseUrl" to baseUrl)).setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST).build())
        fun schedulePeriodic(ctx: Context, baseUrl: String) = WorkManager.getInstance(ctx).enqueueUniquePeriodicWork("guard-periodic", ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES).setInputData(workDataOf("baseUrl" to baseUrl)).build())   // heartbeat/rede de segurança se o push falhar
    }
}
object Api {
    fun get(url: String, token: String) = call("GET", url, token, null)
    fun post(url: String, token: String, body: String) = call("POST", url, token, body)
    private fun call(m: String, url: String, token: String, body: String?): String {
        val c = URL(url).openConnection() as HttpURLConnection
        c.requestMethod = m; c.connectTimeout = 10_000; c.readTimeout = 10_000; c.setRequestProperty("Authorization", "Bearer $token"); c.setRequestProperty("Content-Type", "application/json")
        if (body != null) { c.doOutput = true; c.outputStream.use { it.write(body.toByteArray()) } }
        if (c.responseCode >= 500) throw IOException("server ${c.responseCode}")
        return (if (c.responseCode < 400) c.inputStream else c.errorStream).bufferedReader().readText()
    }
}
