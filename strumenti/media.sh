#!/usr/bin/env bash
# ============================================================================
#  MICHELLE — costruzione dei media del sito a partire dal girato.
#
#  Il girato e' la sorgente, tutto cio' che sta in assets/media/ e' un
#  artefatto: si rigenera con questo script, non si modifica a mano.
#
#  Uso:  ./strumenti/media.sh
#  Serve: ffmpeg, cwebp
# ============================================================================
set -euo pipefail

QUI="$(cd "$(dirname "$0")/.." && pwd)"
SORG="${SORG:-$QUI/../Michelle/3943381821699552651.mp4}"
OUT="$QUI/assets/media"

[ -f "$SORG" ] || { echo "girato non trovato: $SORG"; exit 1; }
rm -rf "$OUT"; mkdir -p "$OUT/seq"

# --- la gradazione -----------------------------------------------------------
# Il girato nasce con una dominante giallo-verde. Lo portiamo a duotone:
# ombre nero-blu (#0B0E1C), luci bianco sporco (#F1EEE6). Non e' un filtro
# estetico a caso: e' la palette del sito applicata alla sorgente, cosi' il
# video e l'interfaccia sono la stessa materia.
G="hue=s=0,curves=r='0/0.043 0.25/0.20 0.5/0.50 0.75/0.79 1/0.945':g='0/0.055 0.25/0.21 0.5/0.505 0.75/0.785 1/0.933':b='0/0.110 0.25/0.27 0.5/0.55 0.75/0.80 1/0.902',eq=contrast=1.06"

W=540   # 540x960: copre uno schermo di telefono senza pesare
H=960

clip () { # nome  inizio  durata  [crf]
  local n=$1 ss=$2 d=$3 crf=${4:-30}
  echo "  · $n  ($ss s, ${d}s)"
  ffmpeg -v error -y -ss "$ss" -t "$d" -i "$SORG" \
    -vf "$G,scale=$W:$H:flags=lanczos" -an \
    -c:v libx264 -profile:v main -pix_fmt yuv420p -crf "$crf" -preset slow \
    -movflags +faststart -g 48 \
    "$OUT/$n.mp4"
  ffmpeg -v error -y -ss "$ss" -i "$SORG" -frames:v 1 \
    -vf "$G,scale=$W:$H:flags=lanczos" -q:v 4 "$OUT/$n.jpg"
}

fermo () { # nome  istante  [filtro extra]
  local n=$1 ss=$2 x=${3:-null}
  ffmpeg -v error -y -ss "$ss" -i "$SORG" -frames:v 1 \
    -vf "$G,scale=$W:$H:flags=lanczos,$x" -q:v 4 "$OUT/$n.jpg"
  echo "  · $n.jpg  ($ss s)"
}

echo "clip:"
# La copertina e' la scena 2 (20.6 -> 22.4): il volto rovesciato con l'acqua
# che cola. Dura 1.8s, troppo poco per un anello che non si senta, quindi va
# avanti e poi indietro: 3.6 secondi che si richiudono su se stessi senza
# nessuno scatto, perche' il primo fotogramma e' anche l'ultimo.
echo "  · copertina (scena 2, andata e ritorno)"
ffmpeg -v error -y -ss 20.6 -t 1.8 -i "$SORG" \
  -filter_complex "[0:v]$G,eq=brightness=0.055,scale=$W:$H:flags=lanczos,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]" \
  -map "[v]" -an -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 28 -preset slow \
  -movflags +faststart -g 45 "$OUT/copertina.mp4"
# --- la scena che accompagna le parole ---------------------------------------
# Scena 1 (18.8 -> 20.4): la figura nera, e a sinistra il vuoto dove vanno le
# parole.
# LA FUSIONE CON LA PAGINA SI FA QUI, NON A SCHERMO. Le luci non vanno al
# bianco: vanno esattamente al colore della carta del sito (--osso #F3ECD2).
# Cosi' sul sito il video non ha bisogno di nessun effetto — niente
# `mix-blend-mode`, niente maschera — e il rettangolo non si vede perche' il
# suo fondo E' la pagina. Se un giorno cambia `--osso`, cambia anche questa
# riga: sono la stessa cosa scritta in due posti, ed e' il prezzo di non
# avere effetti a schermo.
# Andata e ritorno come la copertina: 3.2s che si richiudono senza scatto.
# Il gradino piatto in cima (da 0.84 a 1 il valore non cambia piu') non e' una
# svista: schiaccia TUTTO il fondo del girato su un colore solo, quello della
# carta. Con una rampa fino a 1 il fondo resta variabile di qualche unita' e
# il rettangolo del video si vede lo stesso.
GS="hue=s=0,curves=r='0/0.043 0.28/0.14 0.62/0.61 0.84/0.941 1/0.941':g='0/0.055 0.28/0.15 0.62/0.60 0.84/0.907 1/0.907':b='0/0.110 0.28/0.20 0.62/0.55 0.84/0.806 1/0.806'"
echo "  · scena (scena 1, andata e ritorno)"
ffmpeg -v error -y -ss 18.8 -t 1.6 -i "$SORG" \
  -filter_complex "[0:v]$GS,scale=$W:$H:flags=lanczos,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]" \
  -map "[v]" -an -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 24 -preset slow \
  -movflags +faststart -g 45 "$OUT/scena.mp4"
ffmpeg -v error -y -ss 19.4 -i "$SORG" -frames:v 1 \
  -vf "$GS,scale=$W:$H:flags=lanczos" -q:v 4 "$OUT/scena.jpg"

# --- la scena di "Scrivi" ----------------------------------------------------
# Scena 4 (53.4 -> 55.4): la superficie dell'acqua vista da sotto. Scura nei
# due terzi bassi, schiuma chiara in cima. Qui la gradazione E' quella duotone
# del resto ($G): non deve fondersi con la carta, deve fare da fondo scuro a
# una scritta chiara.
# Andata e ritorno: 4s che si richiudono senza scatto.
echo "  · scrivi (scena 4, andata e ritorno)"
ffmpeg -v error -y -ss 53.4 -t 2.0 -i "$SORG" \
  -filter_complex "[0:v]$G,eq=brightness=-0.02,scale=$W:$H:flags=lanczos,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]" \
  -map "[v]" -an -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 28 -preset slow \
  -movflags +faststart -g 45 "$OUT/scrivi.mp4"
ffmpeg -v error -y -ss 54.6 -i "$SORG" -frames:v 1 \
  -vf "$G,eq=brightness=-0.02,scale=$W:$H:flags=lanczos" -q:v 4 "$OUT/scrivi.jpg"

# il fermo non e' il primo fotogramma: quello e' quasi nero, e chi arriva
# vedrebbe un rettangolo vuoto finche' il video non parte.
# Il filo di luce in piu' (eq brightness) non e' una correzione estetica: la
# scena ha momenti quasi neri, e su quelli chi arriva vedrebbe uno schermo
# spento invece di una copertina.
ffmpeg -v error -y -ss 21.2 -i "$SORG" -frames:v 1 \
  -vf "$G,eq=brightness=0.055,scale=$W:$H:flags=lanczos" -q:v 4 "$OUT/copertina.jpg"

echo "fermi immagine:"
# la colonna a raggi X: e' la miniatura della lastra che si apre sulle uscite
fermo colonna        41.0
# il profilo netto, per i contatti
fermo profilo        68.0

# --- la scena del singolo: quattro pezzi, una sequenza sola ------------------
# Non e' piu' un piano unico: sono quattro stacchi scelti a mano sul girato,
# rimessi in fila. L'arco e' bolle -> volto -> pelo dell'acqua -> sott'acqua.
#
# Dieci fotogrammi al secondo per tutte, cosi' la durata sullo schermo e'
# proporzionale a quella vera. I numeri contano: il copione (assets/js/sito.js)
# ha dentro N = 52 e i due punti di stacco. Se si cambiano le scene qui, vanno
# cambiati anche li'.
#
# La scena 2 non e' piu' qui: e' diventata la copertina, e ripeterla dentro
# alla stessa pagina sarebbe una rima involontaria.
#
#   scena  1   18.8 -> 20.4   1.6s   16 fotogrammi   (colonna di bolle)
#   scena  3   34.4 -> 36.0   1.6s   16              (la testa sul pelo dell'acqua)
#   scena  4   53.4 -> 55.4   2.0s   20              (sott'acqua, le bolle)
#                                    --------------
#                                    52, stacchi a 16 · 32
echo "sequenza del singolo:"
TMP="$(mktemp -d)"
i=0
pezzo () {  # inizio  durata
  ffmpeg -v error -y -ss "$1" -t "$2" -i "$SORG" \
    -vf "$G,fps=10,scale=560:996:flags=lanczos" \
    -q:v 2 "$TMP/p%03d.png"
  for f in "$TMP"/p*.png; do
    i=$((i+1))
    cwebp -quiet -q 58 -m 6 -sharp_yuv "$f" -o "$(printf '%s/seq/a-%02d.webp' "$OUT" "$i")"
  done
  rm -f "$TMP"/p*.png
}
pezzo 18.8 1.6
pezzo 34.4 1.6
pezzo 53.4 2.0
rm -rf "$TMP"
echo "  · $i fotogrammi"

# --- anteprima per le chat ---------------------------------------------------
# Il primo posto dove il sito viene visto e' una chat, non Google: il verticale
# intero appoggiato su un fondo osso, con sopra il marchio nel carattere del
# sito. Il .ttf si scarica una volta e resta in strumenti/ (non versionato).
ffmpeg -v error -y -ss 53.0 -i "$SORG" -frames:v 1 \
  -vf "$G,scale=-1:630:flags=lanczos,pad=1200:630:786:0:color=0xF1EEE6" \
  -q:v 3 "$OUT/og.jpg"

TTF="$QUI/strumenti/.syne-800.ttf"
if [ ! -f "$TTF" ]; then
  URL=$(curl -s "https://fonts.googleapis.com/css2?family=Syne:wght@800" \
        -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
        | grep -o "https://[^)]*\.ttf" | head -1)
  [ -n "$URL" ] && curl -s -o "$TTF" "$URL" || true
fi
if [ -f "$TTF" ] && command -v magick >/dev/null; then
  magick "$OUT/og.jpg" \
    -font "$TTF" -kerning -3 -pointsize 104 -fill '#0B0E1C' -annotate +64+340 'MICHELLE' \
    -kerning 0  -pointsize 26  -fill '#1B3BFF' -annotate +68+390 'Trattieni il fiato.' \
    -quality 88 "$OUT/og.jpg"
  echo "  · og.jpg (con marchio)"
else
  echo "  · og.jpg (senza marchio: manca il carattere o magick)"
fi

echo
du -sh "$OUT" "$OUT/seq"
