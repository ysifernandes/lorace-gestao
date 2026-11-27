// NÃO COMPILADO. Detecta perda de permissões (reportada no heartbeat → status permission_unavailable).
package br.edu.guard

import android.app.AppOpsManager
import android.content.Context
import android.os.Process
import android.provider.Settings

object PermissionState {
    fun usageAccess(ctx: Context): Boolean {
        val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        @Suppress("DEPRECATION")
        val mode = ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
        return mode == AppOpsManager.MODE_ALLOWED
    }
    fun accessibilityEnabled(ctx: Context): Boolean {
        val enabled = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        return enabled.split(':').any { it.startsWith("${ctx.packageName}/") && it.endsWith("GuardAccessibilityService") }
    }
    /** "enforcement" só é verdadeiro se o mecanismo de bloqueio realmente está ativo. */
    fun enforcement(ctx: Context) = accessibilityEnabled(ctx)
}
