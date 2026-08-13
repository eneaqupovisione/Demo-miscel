# Planimetria — sito Michelle

Sito di un'artista indie. **Una pagina sola, mobile-first, una sola azione:
scrivere per una data.** Niente librerie, niente build: si apre `index.html`
servito da un server statico.

## Dove sta cosa

| | |
|---|---|
| `index.html` | la pagina. Sezioni numerate 01→07 nei commenti. |
| `assets/css/sito.css` | stili. In testa l'indice delle 15 parti, in ordine. |
| `assets/js/sito.js` | comportamento. **`DATI`, in cima, è l'unico punto dei contenuti.** |
| `assets/media/` | **artefatti**: rigenerati da `strumenti/media.sh`, mai a mano. |
| `strumenti/media.sh` | taglia il girato, lo grada, esporta clip, fermi e sequenza. |
| `../Michelle/*.mp4` | **la sorgente**. Fuori dalla repo perché pesa 32 MB. |

## Regole di questa repo

1. **Non modificare niente dentro `assets/media/`.** Se un taglio è sbagliato si
   cambia `strumenti/media.sh` e si rilancia. Il file è la ricetta, la cartella
   è il risultato.
2. **I contenuti stanno in `DATI`**, non sparsi nell'HTML. Se serve un campo
   nuovo si aggiunge lì e si stampa da JS.
3. **La palette è quattro colori** — bianco sporco, grigio chiaro, blu acceso,
   nero — dichiarati in `:root`. Il blu è la voce del sito: compare dove si
   tocca o dove si deve guardare, mai come decorazione.
4. **Le misure grandi non sono `clamp`.** Nome, titoli, respiri e voci di menu
   sono calcolati a runtime (`[data-adatta]`, `adattaUno`), perché la larghezza
   di una parola dipende dalle lettere che ha dentro. Se aggiungi un titolo
   grande, marcalo `data-adatta` con il suo `data-max`.
5. **Ogni effetto ha una via d'uscita.** `prefers-reduced-motion`, dispositivi
   lenti (`LEGGERO`), autoplay negato: sono già gestiti, e vanno gestiti anche
   dalle aggiunte.
6. **Niente `mix-blend-mode` dentro a un contesto di impilamento.** Il nome in
   copertina si fonde col video solo perché né lui né il suo contenitore hanno
   `z-index`. È già successo di romperlo così.

## Da sapere prima di toccare

- La sezione **del singolo** è alta 320vh: quell'altezza *è* la durata della
  scena. Cambiarla cambia il ritmo di tutto. Il numero di fotogrammi (`N` in
  `sito.js`) deve corrispondere a quello che produce `strumenti/media.sh`.
- Le **maschere** (`.maschera`) invertono e tingono ciò che coprono. Tre
  vincoli: il `grayscale(1)` prima di `invert(1)` toglie il giallo che
  altrimenti nasce dal blu rovesciato; le tinte devono reggere il bianco
  sopra, perché una maschera passa sul testo mentre lo si legge; e ognuna
  costa un `backdrop-filter` a tutto schermo, quindi poche e mai tutte
  insieme.
- Il **caleidoscopio** legge `colonna.mp4`, non un girato già specchiato:
  rispecchiare una cosa già specchiata restituisce una macchia.

## Stato

Forma finita, **contenuti provvisori**. L'elenco di cosa manca è nel
[README](README.md), sezione "Cosa manca per pubblicarlo".
