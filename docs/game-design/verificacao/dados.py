# Matemática do combate — regra oficial: empate favorece o DEFENSOR.
from itertools import product
from fractions import Fraction

def rodada(na, nd):
    """Distribuição de perdas (perde_atacante, perde_defensor) numa rodada."""
    res = {}
    for a in product(range(1,7), repeat=na):
        for d in product(range(1,7), repeat=nd):
            A = sorted(a, reverse=True); D = sorted(d, reverse=True)
            pa = pd = 0
            for i in range(min(na, nd)):
                if A[i] > D[i]: pd += 1
                else: pa += 1          # empate → defensor vence
            res[(pa,pd)] = res.get((pa,pd), 0) + 1
    tot = 6**(na+nd)
    return {k: Fraction(v, tot) for k, v in res.items()}

print("=== UMA RODADA DE DADOS ===")
for na, nd in [(3,2),(3,1),(2,2),(2,1),(1,1),(3,3),(2,3),(1,2)]:
    dist = rodada(na, nd)
    esp_a = sum(k[0]*p for k,p in dist.items())
    esp_d = sum(k[1]*p for k,p in dist.items())
    print(f"{na}A x {nd}D → perdas médias: atacante {float(esp_a):.3f} | defensor {float(esp_d):.3f}"
          f"  (razão D/A = {float(esp_d/esp_a):.2f})")

# Batalha completa: atacante com A tropas no território (1 fica), defensor com D.
import functools
@functools.lru_cache(maxsize=None)
def batalha(a, d):
    """P(atacante conquista) com a = tropas que podem atacar, d = defensores."""
    if d == 0: return 1.0
    if a == 0: return 0.0
    na = min(3, a); nd = min(3, d)
    p = 0.0
    for (pa, pd), prob in rodada(na, nd).items():
        p += float(prob) * batalha(a - pa, d - pd)
    return p

print()
print("=== BATALHA COMPLETA (atacante insiste até o fim) ===")
print("tropas atacantes disponíveis x defensores → P(conquista)")
for a in [3,5,7,10,14]:
    linha = []
    for d in [1,2,3,5,7,10]:
        linha.append(f"{d}D:{batalha(a,d)*100:5.1f}%")
    print(f"  {a:2d} atacantes  " + "  ".join(linha))

print()
print("Paridade (mesmo número): ", end="")
for n in [3,5,7,10]:
    print(f"{n}x{n}={batalha(n,n)*100:.1f}%  ", end="")
print()
