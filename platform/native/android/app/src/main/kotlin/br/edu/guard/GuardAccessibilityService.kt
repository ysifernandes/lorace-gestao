// NÃO COMPILADO / NÃO TESTADO EM DISPOSITIVO.
// Estratégia: detectar o app em primeiro plano (TYPE_WINDOW_STATE_CHANGED) e, se a política negar, levar o usuário à Home
// e exibir a tela de bloqueio do Plataforma Educacional (nome provisório). Limitações reais: ver docs/PARENTAL_CONTROL.md (Play Store: AccessibilityService
// exige declaração e divulgação proeminente; fabricantes podem matar o serviço; o usuário pode desativá-lo → detectado no heartbeat).
package br.edu.guard

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import java.util.Calendar

class GuardAccessibilityService : AccessibilityService() {
    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName) return
        val rules = PolicyStore.load(this) ?: return          // regras assinadas e verificadas, persistidas localmente (funciona offline)
        val cal = Calendar.getInstance()
        val d = evaluate(rules, pkg, cal.get(Calendar.DAY_OF_WEEK) - 1, cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE), System.currentTimeMillis())
        if (!d.allowed) {
            performGlobalAction(GLOBAL_ACTION_HOME)
            startActivity(Intent(this, BlockedActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK).putExtra("pkg", pkg))
        }
    }
    override fun onInterrupt() {}
}

/** Persistência local das regras (a implementar com EncryptedSharedPreferences). */
object PolicyStore { fun load(ctx: android.content.Context): Rules? = TODO("persistência local — pendente") }
class BlockedActivity : android.app.Activity()   // tela "Hora de focar!" — UI pendente
