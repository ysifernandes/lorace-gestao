import random
random.mean=None
def sim(rodadas=20, base=0.12, passo=0.08, teto=0.60, cooldown=2, maxev=6, inicio=3):
    ev=[]; acum=0; cd=0
    for r in range(1, rodadas+1):
        if r < inicio or len(ev)>=maxev:
            continue
        if cd>0:
            cd-=1; continue
        p=min(teto, base+passo*acum)
        if random.random()<p:
            ev.append(r); acum=0; cd=cooldown
        else:
            acum+=1
    return ev

N=200000
tot=0; primeiro=[]; sem=0; gaps=[]
for _ in range(N):
    e=sim()
    tot+=len(e)
    if e: primeiro.append(e[0])
    else: sem+=1
    for a,b in zip(e,e[1:]): gaps.append(b-a)
print(f"Partida de 20 rodadas — média de eventos: {tot/N:.2f}")
print(f"Rodada média do 1º evento: {sum(primeiro)/len(primeiro):.1f}")
print(f"Partidas sem nenhum evento: {sem/N*100:.2f}%")
print(f"Intervalo médio entre eventos: {sum(gaps)/len(gaps):.1f} rodadas")
for R in (10,15,30):
    t=0; s=0
    for _ in range(50000):
        e=sim(R); t+=len(e); s+= (1 if not e else 0)
    print(f"  {R} rodadas → média {t/50000:.2f} eventos | sem evento {s/50000*100:.2f}%")
