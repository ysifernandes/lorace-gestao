# Verificação do mapa de INVASÃO: COLAPSO — 30 territórios, 6 regiões.
from collections import deque

REGIOES = {
 "A METRÓPOLE": ["Distrito Central","Zona Norte","Zona Sul","Ruínas do Leste","Base Ocidental"],
 "MONTES DE FERRO": ["Posto Avançado Norte","Setor Militar","Mina Profunda","Crista Quebrada","Represa Seca"],
 "PLANÍCIE ERRANTE": ["Rodovia Morta","Campo de Antenas","Vale Cinzento","Salinas","Cemitério de Comboios"],
 "CINTURÃO SIDERÚRGICO": ["Região Industrial","Alto-Forno","Porto Abandonado","Pátio de Cargas","Fronteira Vermelha"],
 "ZONA VÍTREA": ["Zona Contaminada","Complexo Científico","Cratera de Vidro","Bosque Fóssil","Estação de Escuta"],
 "OS ABRIGOS": ["Abrigo Zero","Galeria Norte","Galeria Oeste","Galeria Sul","Câmara de Máquinas"],
}

ADJ = {
 # A METRÓPOLE
 "Distrito Central": ["Zona Norte","Zona Sul","Ruínas do Leste","Base Ocidental","Abrigo Zero"],
 "Zona Norte": ["Distrito Central","Base Ocidental","Ruínas do Leste","Posto Avançado Norte"],
 "Zona Sul": ["Distrito Central","Base Ocidental","Ruínas do Leste","Região Industrial"],
 "Base Ocidental": ["Distrito Central","Zona Norte","Zona Sul","Rodovia Morta"],
 "Ruínas do Leste": ["Distrito Central","Zona Norte","Zona Sul","Zona Contaminada"],
 # MONTES DE FERRO
 "Posto Avançado Norte": ["Setor Militar","Crista Quebrada","Zona Norte"],
 "Setor Militar": ["Posto Avançado Norte","Mina Profunda","Represa Seca"],
 "Mina Profunda": ["Setor Militar","Crista Quebrada","Represa Seca","Galeria Norte"],
 "Crista Quebrada": ["Posto Avançado Norte","Mina Profunda","Represa Seca","Estação de Escuta"],
 "Represa Seca": ["Setor Militar","Mina Profunda","Crista Quebrada","Campo de Antenas"],
 # PLANÍCIE ERRANTE
 "Rodovia Morta": ["Campo de Antenas","Cemitério de Comboios","Vale Cinzento","Base Ocidental"],
 "Campo de Antenas": ["Rodovia Morta","Vale Cinzento","Represa Seca"],
 "Vale Cinzento": ["Rodovia Morta","Campo de Antenas","Salinas"],
 "Salinas": ["Vale Cinzento","Cemitério de Comboios","Galeria Oeste"],
 "Cemitério de Comboios": ["Rodovia Morta","Salinas","Porto Abandonado"],
 # CINTURÃO SIDERÚRGICO
 "Região Industrial": ["Alto-Forno","Pátio de Cargas","Fronteira Vermelha","Zona Sul"],
 "Alto-Forno": ["Região Industrial","Pátio de Cargas","Porto Abandonado","Galeria Sul"],
 "Porto Abandonado": ["Alto-Forno","Pátio de Cargas","Cemitério de Comboios"],
 "Pátio de Cargas": ["Região Industrial","Alto-Forno","Porto Abandonado","Fronteira Vermelha"],
 "Fronteira Vermelha": ["Região Industrial","Pátio de Cargas","Cratera de Vidro"],
 # ZONA VÍTREA
 "Zona Contaminada": ["Complexo Científico","Cratera de Vidro","Estação de Escuta","Ruínas do Leste"],
 "Complexo Científico": ["Zona Contaminada","Bosque Fóssil","Estação de Escuta","Câmara de Máquinas"],
 "Cratera de Vidro": ["Zona Contaminada","Bosque Fóssil","Fronteira Vermelha"],
 "Bosque Fóssil": ["Complexo Científico","Cratera de Vidro","Estação de Escuta"],
 "Estação de Escuta": ["Zona Contaminada","Complexo Científico","Bosque Fóssil","Crista Quebrada"],
 # OS ABRIGOS
 "Abrigo Zero": ["Galeria Norte","Galeria Oeste","Galeria Sul","Câmara de Máquinas","Distrito Central"],
 "Galeria Norte": ["Abrigo Zero","Galeria Oeste","Câmara de Máquinas","Mina Profunda"],
 "Galeria Oeste": ["Abrigo Zero","Galeria Norte","Galeria Sul","Salinas"],
 "Galeria Sul": ["Abrigo Zero","Galeria Oeste","Câmara de Máquinas","Alto-Forno"],
 "Câmara de Máquinas": ["Abrigo Zero","Galeria Norte","Galeria Sul","Complexo Científico"],
}

todos = [t for r in REGIOES.values() for t in r]
problemas = []

if len(todos) != 30: problemas.append(f"Total de territórios = {len(todos)}, esperado 30")
if len(set(todos)) != len(todos): problemas.append("Nomes de território duplicados")
for r, ts in REGIOES.items():
    if len(ts) != 5: problemas.append(f"{r} tem {len(ts)} territórios")

for t in todos:
    if t not in ADJ: problemas.append(f"{t} sem lista de fronteiras")
for t in ADJ:
    if t not in todos: problemas.append(f"{t} não pertence a nenhuma região")

# Simetria
for a, viz in ADJ.items():
    if len(set(viz)) != len(viz): problemas.append(f"{a} tem vizinho repetido")
    for b in viz:
        if b not in ADJ: problemas.append(f"{a} aponta para inexistente {b}"); continue
        if a not in ADJ[b]: problemas.append(f"ASSIMETRIA: {a}->{b} sem volta")
        if a == b: problemas.append(f"{a} vizinho de si mesmo")

# Conectividade
inicio = todos[0]; visto = {inicio}; fila = deque([inicio])
while fila:
    for n in ADJ[fila.popleft()]:
        if n not in visto: visto.add(n); fila.append(n)
if len(visto) != 30: problemas.append(f"Mapa desconexo: alcança {len(visto)}/30")

# Graus e isolamento
graus = {t: len(ADJ[t]) for t in todos}
for t, g in graus.items():
    if g < 3: problemas.append(f"{t} tem só {g} fronteiras (mínimo 3)")

regiao_de = {t: r for r, ts in REGIOES.items() for t in ts}
print("=== MAPA — VERIFICAÇÃO ===")
print(f"Territórios: {len(todos)} | Regiões: {len(REGIOES)}")
print(f"Fronteiras (arestas únicas): {sum(graus.values())//2}")
print(f"Grau mínimo: {min(graus.values())} | máximo: {max(graus.values())} | médio: {sum(graus.values())/30:.2f}")
print()
for r, ts in REGIOES.items():
    ext = sum(1 for t in ts for v in ADJ[t] if regiao_de[v] != r)
    portas = sorted({t for t in ts if any(regiao_de[v] != r for v in ADJ[t])})
    internas = sum(1 for t in ts for v in ADJ[t] if regiao_de[v] == r)//2
    print(f"{r}: {len(portas)} portas de entrada, {ext} ligações externas, {internas} fronteiras internas")
print()
print("PROBLEMAS:", "nenhum" if not problemas else "")
for p in problemas: print("  -", p)
