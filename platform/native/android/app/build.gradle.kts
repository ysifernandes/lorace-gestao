// NÃO COMPILADO — esqueleto do módulo. Ajustar versões ao projeto Android real (Android Studio).
plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("com.google.gms.google-services") /* requer google-services.json (NÃO versionar) */ }
android {
    namespace = "br.edu.guard"; compileSdk = 35
    defaultConfig { applicationId = "br.edu.platform"  /* nome provisório; vem de packages/brand */; minSdk = 26; targetSdk = 35; buildConfigField("String", "API_BASE_URL", "\"https://CONFIGURAR\"") }
    buildFeatures { buildConfig = true }
}
dependencies {
    implementation("androidx.work:work-runtime-ktx:2.9.1"); implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation(platform("com.google.firebase:firebase-bom:33.5.1")); implementation("com.google.firebase:firebase-messaging")
    testImplementation("junit:junit:4.13.2"); testImplementation("org.json:json:20240303")
}
