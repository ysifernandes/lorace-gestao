// NÃO COMPILADO. O push (FCM, prioridade alta) apenas ACORDA o app; o comando é buscado e verificado via SyncWorker.
package br.edu.guard

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class CommandMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(m: RemoteMessage) { SyncWorker.enqueue(applicationContext, BuildConfig.API_BASE_URL) }
    override fun onNewToken(token: String) { /* enviar ao backend em /devices/:id/push-token (rota pendente) */ }
}
