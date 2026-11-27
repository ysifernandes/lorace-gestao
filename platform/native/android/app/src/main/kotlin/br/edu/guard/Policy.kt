// NÃO COMPILADO. Espelho de packages/parental-control (evaluate/inWindow). Manter casos de teste idênticos (tests/vectors).
package br.edu.guard

data class Window(val days: Set<Int>, val startMin: Int, val endMin: Int)
data class Grant(val appId: String, val untilMs: Long)
data class Rules(
    val blockedApps: Set<String>, val essentialApps: Set<String>, val restrictedInWindows: Set<String>,
    val windows: List<Window>, val grants: List<Grant>,
)
enum class Reason { ESSENTIAL, GRANT, BLOCKED_APP, WINDOW, DEFAULT_ALLOW }
data class Decision(val allowed: Boolean, val reason: Reason)

fun inWindow(w: Window, day: Int, minutes: Int): Boolean {
    if (w.startMin == w.endMin) return false
    return if (w.startMin < w.endMin) day in w.days && minutes >= w.startMin && minutes < w.endMin
    else (day in w.days && minutes >= w.startMin) || (((day + 6) % 7) in w.days && minutes < w.endMin)
}

fun evaluate(r: Rules, appId: String, day: Int, minutes: Int, nowMs: Long): Decision = when {
    appId in r.essentialApps -> Decision(true, Reason.ESSENTIAL)
    r.grants.any { (it.appId == appId || it.appId == "*") && it.untilMs > nowMs } -> Decision(true, Reason.GRANT)
    appId in r.blockedApps -> Decision(false, Reason.BLOCKED_APP)
    appId in r.restrictedInWindows && r.windows.any { inWindow(it, day, minutes) } -> Decision(false, Reason.WINDOW)
    else -> Decision(true, Reason.DEFAULT_ALLOW)
}
