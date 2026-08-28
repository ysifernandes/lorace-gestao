# -*- coding: utf-8 -*-
"""
MAPA OFICIAL v2 — transcrito da referência visual "MAPA - 30 TERRITÓRIOS".
Os NOMES e as REGIÕES vêm da imagem de referência do criador.
As FRONTEIRAS foram derivadas da geometria mostrada na imagem e verificadas
aqui (simetria, conectividade, grau mínimo 3) antes de virar código.
"""
from collections import deque

REGIOES = {
 "FRONTEIRA NORTE": ["Fortaleza Boreal","Planícies Gélidas","Complexo Ártico","Porto de Ferro","Cidade Fantasma"],
 "TERRAS CENTRAIS": ["Colinas de Titânio","Vale Industrial","Capital Continental","Represa Estilhaçada","Reduto do Comando"],
 "ZONA DEVASTADA": ["Deserto de Cinzas","Cânion dos Ecos","Mina Abandonada","Cidade Submersa","Usina Nuclear"],
 "COSTA SOMBRIA": ["Porto Mercenário","Arquipélago Negro","Doca Enferrujada","Laboratório Marinho","Farol do Abismo"],
 "FLORESTA CORROMPIDA": ["Selva Densa","Templo Antigo","Pântano Tóxico","Vila Desolada","Tronco Gigante"],
 "ZONA DE IMPACTO": ["Cratera Central","Torre da Anomalia","Campo de Ruínas","Santuário Proibido","Núcleo do Colapso"],
}

E = [
 # --- Fronteira Norte (1-5) ---
 ("Fortaleza Boreal","Planícies Gélidas"), ("Planícies Gélidas","Complexo Ártico"),
 ("Complexo Ártico","Porto de Ferro"), ("Fortaleza Boreal","Cidade Fantasma"),
 ("Planícies Gélidas","Cidade Fantasma"), ("Complexo Ártico","Cidade Fantasma"),
 # Norte -> Terras Centrais / Zona Devastada
 ("Fortaleza Boreal","Colinas de Titânio"), ("Cidade Fantasma","Vale Industrial"),
 ("Planícies Gélidas","Capital Continental"), ("Complexo Ártico","Represa Estilhaçada"),
 ("Porto de Ferro","Reduto do Comando"), ("Porto de Ferro","Deserto de Cinzas"),
 # --- Terras Centrais (6-10) ---
 ("Colinas de Titânio","Vale Industrial"), ("Vale Industrial","Capital Continental"),
 ("Capital Continental","Represa Estilhaçada"), ("Capital Continental","Reduto do Comando"),
 ("Represa Estilhaçada","Reduto do Comando"), ("Colinas de Titânio","Capital Continental"),
 # Centrais -> Costa / Floresta / Impacto / Devastada
 ("Colinas de Titânio","Doca Enferrujada"), ("Vale Industrial","Porto Mercenário"),
 ("Vale Industrial","Selva Densa"), ("Capital Continental","Selva Densa"),
 ("Reduto do Comando","Deserto de Cinzas"), ("Reduto do Comando","Cratera Central"),
 ("Represa Estilhaçada","Deserto de Cinzas"),
 # --- Zona Devastada (11-15) ---
 ("Deserto de Cinzas","Cânion dos Ecos"), ("Deserto de Cinzas","Mina Abandonada"),
 ("Cânion dos Ecos","Cidade Submersa"), ("Mina Abandonada","Cidade Submersa"),
 ("Mina Abandonada","Usina Nuclear"), ("Cidade Submersa","Usina Nuclear"),
 ("Cânion dos Ecos","Usina Nuclear"),
 # Devastada -> Impacto
 ("Usina Nuclear","Torre da Anomalia"), ("Usina Nuclear","Santuário Proibido"),
 ("Mina Abandonada","Cratera Central"),
 # --- Costa Sombria (16-20) ---
 ("Porto Mercenário","Arquipélago Negro"), ("Porto Mercenário","Doca Enferrujada"),
 ("Porto Mercenário","Laboratório Marinho"), ("Arquipélago Negro","Laboratório Marinho"),
 ("Doca Enferrujada","Laboratório Marinho"), ("Laboratório Marinho","Farol do Abismo"),
 ("Arquipélago Negro","Farol do Abismo"),
 # Costa -> Floresta
 ("Farol do Abismo","Vila Desolada"), ("Farol do Abismo","Pântano Tóxico"),
 # --- Floresta Corrompida (21-25) ---
 ("Selva Densa","Templo Antigo"), ("Templo Antigo","Pântano Tóxico"),
 ("Templo Antigo","Vila Desolada"), ("Pântano Tóxico","Vila Desolada"),
 ("Pântano Tóxico","Tronco Gigante"), ("Vila Desolada","Tronco Gigante"),
 ("Selva Densa","Vila Desolada"),
 # Floresta -> Impacto
 ("Selva Densa","Cratera Central"), ("Templo Antigo","Cratera Central"),
 ("Tronco Gigante","Núcleo do Colapso"), ("Tronco Gigante","Campo de Ruínas"),
 # --- Zona de Impacto (26-30) ---
 ("Cratera Central","Torre da Anomalia"), ("Cratera Central","Campo de Ruínas"),
 ("Torre da Anomalia","Santuário Proibido"), ("Campo de Ruínas","Núcleo do Colapso"),
 ("Santuário Proibido","Núcleo do Colapso"), ("Torre da Anomalia","Núcleo do Colapso"),
]

todos = [t for r in REGIOES.values() for t in r]
ADJ = {t: [] for t in todos}
problemas = []
for a, b in E:
    if a not in ADJ or b not in ADJ:
        problemas.append(f"aresta com território inexistente: {a} - {b}"); continue
    if b in ADJ[a]:
        problemas.append(f"aresta duplicada: {a} - {b}"); continue
    ADJ[a].append(b); ADJ[b].append(a)

if len(todos) != 30: problemas.append(f"total {len(todos)} != 30")
if len(set(todos)) != len(todos): problemas.append("nome duplicado")
for r, ts in REGIOES.items():
    if len(ts) != 5: problemas.append(f"{r} tem {len(ts)}")

graus = {t: len(ADJ[t]) for t in todos}
for t, g in graus.items():
    if g < 3: problemas.append(f"{t} com grau {g} (mínimo 3)")

inicio = todos[0]; visto = {inicio}; fila = deque([inicio])
while fila:
    for n in ADJ[fila.popleft()]:
        if n not in visto: visto.add(n); fila.append(n)
if len(visto) != 30: problemas.append(f"desconexo: alcança {len(visto)}/30")

regiao_de = {t: r for r, ts in REGIOES.items() for t in ts}
print("=== MAPA v2 — VERIFICAÇÃO ===")
print(f"Territórios: {len(todos)} | Regiões: {len(REGIOES)} | Fronteiras: {sum(graus.values())//2}")
print(f"Grau mínimo: {min(graus.values())} | máximo: {max(graus.values())} | médio: {sum(graus.values())/30:.2f}")
print()
for r, ts in REGIOES.items():
    ext = sum(1 for t in ts for v in ADJ[t] if regiao_de[v] != r)
    portas = sorted({t for t in ts if any(regiao_de[v] != r for v in ADJ[t])})
    internas = sum(1 for t in ts for v in ADJ[t] if regiao_de[v] == r)//2
    print(f"{r}: {len(portas)} portas, {ext} ligações externas, {internas} internas")
print()
print("PROBLEMAS:", "nenhum" if not problemas else "")
for p in problemas: print("  -", p)
