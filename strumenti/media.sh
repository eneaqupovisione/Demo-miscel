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
# copertina — il caleidoscopio di mani con cui il girato si apre
clip copertina   1.4  5.2  30

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
# ha dentro N = 70 e i tre punti di stacco. Se si cambiano le scene qui, vanno
# cambiati anche li'.
#
#   scena  1   18.8 -> 20.4   1.6s   16 fotogrammi   (colonna di bolle)
#   scena  2   20.6 -> 22.4   1.8s   18              (il volto, l'acqua che cola)
#   scena  3   34.4 -> 36.0   1.6s   16              (la testa sul pelo dell'acqua)
#   scena  4   53.4 -> 55.4   2.0s   20              (sott'acqua, le bolle)
#                                    --------------
#                                    70, stacchi a 16 · 34 · 50
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
pezzo 20.6 1.8
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
