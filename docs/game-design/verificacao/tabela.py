# -*- coding: utf-8 -*-
import importlib.util, sys, io
spec = importlib.util.spec_from_file_location("mapa", "mapa.py")
m = importlib.util.module_from_spec(spec)
buf = io.StringIO(); old = sys.stdout; sys.stdout = buf
spec.loader.exec_module(m)
sys.stdout = old
REGIOES, ADJ = m.REGIOES, m.ADJ

SIGLA = {"A METRÓPOLE":"MET","MONTES DE FERRO":"FER","PLANÍCIE ERRANTE":"PLA",
         "CINTURÃO SIDERÚRGICO":"SID","ZONA VÍTREA":"VIT","OS ABRIGOS":"ABR"}

CARACT = {
"Distrito Central":"<strong>Ponto de Interesse.</strong> Antiga sala de controle da Malha. Único território com 5 fronteiras na superfície. +1 reforço.",
"Zona Norte":"Conjuntos habitacionais verticais. Porta da Metrópole para os Montes de Ferro.",
"Zona Sul":"Viadutos empilhados e canais secos. Porta para o Cinturão Siderúrgico.",
"Base Ocidental":"Base logística militar saqueada. Porta para a Planície Errante.",
"Ruínas do Leste":"Quarteirões que queimaram durante os onze dias. Porta para a Zona Vítrea.",
"Posto Avançado Norte":"Torre de vigia sobre a cidade. Vê chegar quem sobe.",
"Setor Militar":"<strong>Ponto de Interesse.</strong> Depósito de armamento ainda lacrado. +1 soldado por turno neste território.",
"Mina Profunda":"Poço de extração que desce até as galerias. Boca do <em>Poço da Mina</em>.",
"Crista Quebrada":"Cume partido por deslizamento. Passagem estreita para a Zona Vítrea.",
"Represa Seca":"Comporta travada aberta há doze anos. Cabeceira da <em>Ponte da Represa</em>.",
"Rodovia Morta":"Autoestrada de doze pistas parada no meio de um congestionamento.",
"Campo de Antenas":"<strong>Ponto de Interesse.</strong> Antenas ainda escutando a Malha. Pré-alerta de Evento do Colapso.",
"Vale Cinzento":"Planície coberta de cinza fina. Nada cresce, nada esconde.",
"Salinas":"Crosta salgada sobre um mar interior evaporado. Boca do <em>Poço das Salinas</em>.",
"Cemitério de Comboios":"Centenas de comboios enfileirados e abandonados. Início da <em>Rota Costeira</em>.",
"Região Industrial":"Galpões de montagem automática que nunca pararam a esteira.",
"Alto-Forno":"Forno aceso há doze anos sem comando de desligamento. Boca do <em>Poço do Alto-Forno</em>.",
"Porto Abandonado":"Guindastes travados sobre navios afundados. Fim da <em>Rota Costeira</em>.",
"Pátio de Cargas":"<strong>Ponto de Interesse.</strong> Pátio de contêineres e guindastes funcionais. Recarrega o Transporte Especial mais rápido.",
"Fronteira Vermelha":"Linha de contenção pintada no asfalto. Ninguém lembra o que ela continha.",
"Zona Contaminada":"Vazamento químico permanente. Porta da Zona Vítrea para a Metrópole.",
"Complexo Científico":"<strong>Ponto de Interesse.</strong> Laboratórios com energia própria. Permite trocar 1 carta por turno.",
"Cratera de Vidro":"Areia fundida em placa contínua. O chão reflete o céu.",
"Bosque Fóssil":"Floresta mineralizada de pé. Árvores de pedra, cobertura total.",
"Estação de Escuta":"Antena parabólica ainda transmitindo relatórios para ninguém.",
"Abrigo Zero":"<strong>Ponto de Interesse.</strong> Núcleo dos Abrigos, 5 fronteiras. Boca do <em>Poço Central</em>. +1 reforço.",
"Galeria Norte":"Túnel de serviço sob os Montes de Ferro. Sobe pelo <em>Poço da Mina</em>.",
"Galeria Oeste":"Galeria de drenagem sob as Salinas. Sobe pelo <em>Poço das Salinas</em>.",
"Galeria Sul":"Duto de refrigeração do Cinturão. Sobe pelo <em>Poço do Alto-Forno</em>.",
"Câmara de Máquinas":"Sala de bombas e geradores ainda girando. Sobe pelo <em>Poço Científico</em>.",
}

ESPECIAIS = {
 ("Distrito Central","Abrigo Zero"), ("Mina Profunda","Galeria Norte"),
 ("Salinas","Galeria Oeste"), ("Alto-Forno","Galeria Sul"),
 ("Complexo Científico","Câmara de Máquinas"),
 ("Represa Seca","Campo de Antenas"), ("Cemitério de Comboios","Porto Abandonado"),
}
def marca(a,b):
    if (a,b) in ESPECIAIS or (b,a) in ESPECIAIS:
        return b + " ✦"
    return b

regiao_de = {t: r for r, ts in REGIOES.items() for t in ts}
linhas=[]
for r, ts in REGIOES.items():
    for i,t in enumerate(ts):
        viz = ", ".join(marca(t,v) for v in ADJ[t])
        cel_reg = f'<td class="reg" rowspan="5">{r}</td>' if i==0 else ''
        linhas.append(f'<tr>{cel_reg}<td class="name">{t}</td><td>{viz}</td><td>{CARACT[t]}</td></tr>')
print("\n".join(linhas))
