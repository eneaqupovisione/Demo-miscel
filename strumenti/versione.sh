#!/usr/bin/env bash
# ============================================================================
#  Alza il numero di versione su TUTTI i riferimenti di index.html: il foglio
#  di stile, il copione, i video e le immagini.
#
#  Serve perche' i file cambiano contenuto tenendo lo stesso nome — la
#  sequenza, la clip di copertina — e senza un numero nuovo il browser
#  continua a servire quelli vecchi. E' gia' successo due volte di credere che
#  una modifica non fosse stata applicata quando era solo la cache.
#
#  Uso:  ./strumenti/versione.sh 11
# ============================================================================
set -euo pipefail

V="${1:-}"
[ -n "$V" ] || { echo "uso: $0 <numero>"; exit 1; }

QUI="$(cd "$(dirname "$0")/.." && pwd)"
F="$QUI/index.html"

python3 - "$F" "$V" <<'PY'
import re, sys
f, v = sys.argv[1], sys.argv[2]
s = open(f, encoding='utf-8').read()

# 1. i riferimenti che hanno gia' un ?v=  -> si aggiorna il numero
s = re.sub(r'(\.(?:css|js|mp4|jpg|png|webp))\?v=[^"\']*', r'\1?v=' + v, s)

# 2. quelli che non ce l'hanno ancora -> glielo si mette.
#    Solo assets/, e mai dentro a un data: URI.
def aggiungi(m):
    url = m.group(2)
    return m.group(1) + url + ('' if '?v=' in url else '?v=' + v) + m.group(3)
s = re.sub(r'((?:src|href|poster)=")(assets/[^"?]+\.(?:css|js|mp4|jpg|png|webp))(")',
           aggiungi, s)

open(f, 'w', encoding='utf-8').write(s)
n = len(re.findall(r'\?v=' + re.escape(v), s))
print('  ' + str(n) + ' riferimenti portati a v=' + v)
PY

grep -o 'assets/[^"]*?v=[0-9]*' "$F" | sed 's/^/  · /'
