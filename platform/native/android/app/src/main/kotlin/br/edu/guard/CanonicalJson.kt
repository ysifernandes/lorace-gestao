// NÃO COMPILADO. Deve produzir EXATAMENTE a mesma string de packages/security canonicalize() — validar com tests/vectors/command-signing.json.
// Cuidado: números inteiros grandes (epoch ms) devem ser impressos sem notação científica; JSONObject.NULL → "null".
package br.edu.guard

import org.json.JSONArray
import org.json.JSONObject

object CanonicalJson {
    fun of(v: Any?): String = when (v) {
        null, JSONObject.NULL -> "null"
        is JSONObject -> v.keys().asSequence().toList().sorted().joinToString(",", "{", "}") { "${quote(it)}:${of(v.get(it))}" }
        is JSONArray -> (0 until v.length()).joinToString(",", "[", "]") { of(v.get(it)) }
        is String -> quote(v)
        is Boolean -> v.toString()
        is Int, is Long -> v.toString()
        is Double -> if (v % 1.0 == 0.0) v.toLong().toString() else v.toString()
        else -> quote(v.toString())
    }
    // Igual a JSON.stringify: escapa aspas, barra invertida e controles; NÃO escapa caracteres não-ASCII.
    private fun quote(s: String): String = buildString {
        append('"'); for (ch in s) when { ch == '"' -> append("\\\""); ch == '\\' -> append("\\\\"); ch == '\n' -> append("\\n"); ch == '\r' -> append("\\r"); ch == '\t' -> append("\\t"); ch.code < 0x20 -> append("\\u%04x".format(ch.code)); else -> append(ch) }; append('"')
    }
}
