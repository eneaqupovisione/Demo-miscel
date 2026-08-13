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
# la colonna a raggi X: figura specchiata, bolle che salgono. Texture pura.
clip colonna    38.2  7.6  30

echo "fermi immagine:"
# il ritratto, in due gradazioni perfettamente sovrapposte: la lastra vuota
# e quella piena. La torcia dei "raggi X" passa dall'una all'altra.
fermo ritratto-vuoto 15.6 "eq=contrast=0.46:brightness=0.20,gblur=sigma=1.0"
fermo ritratto-pieno 15.6 "eq=contrast=1.14"
# il profilo netto, per i contatti
fermo profilo        68.0
# fermo della scena d'acqua (anteprima della sequenza)
fermo acqua          53.0

# --- la scena dell'acqua: sequenza di fotogrammi per lo scrub ----------------
# 50.9 -> 55.6 : il viso entra da destra, l'acqua lo prende, poi le bolle.
# Non e' un video: e' una sequenza, perche' lo scroll la comanda fotogramma
# per fotogramma e il seek dentro a un <video> su iOS non e' affidabile.
echo "sequenza acqua:"
TMP="$(mktemp -d)"
ffmpeg -v error -y -ss 50.9 -t 4.7 -i "$SORG" \
  -vf "$G,fps=48/4.7,scale=600:1067:flags=lanczos" \
  -q:v 2 "$TMP/%03d.png"
i=0
for f in "$TMP"/*.png; do
  i=$((i+1))
  cwebp -quiet -q 62 -m 6 -sharp_yuv "$f" -o "$(printf '%s/seq/a-%02d.webp' "$OUT" "$i")"
done
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
