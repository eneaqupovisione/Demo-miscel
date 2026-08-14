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

- Le sezioni sono cinque e numerate 01→05 nei commenti di `index.html`. Il
  manifesto non esiste più: la sua frase è diventata le tre righe di `#chi`.
- La sequenza dell'acqua è **una sola** (`Sequenza` in `sito.js`), caricata
  una volta e disegnata da due canvas: la scena del singolo e il respiro
  dietro a `#chi`. Non duplicarla.
- La sezione **del singolo** è alta 320vh: quell'altezza *è* la durata della
  scena. Cambiarla cambia il ritmo di tutto. Il numero di fotogrammi (`N` in
  `sito.js`) deve corrispondere a quello che produce `strumenti/media.sh`.
- La **blob mask** sta in `assets/js/blob-mask.js` e implementa
  `blob-mask-spec.md`, che è autoritativo: matematica, shader e costanti
  vengono da lì e non vanno reinterpretati. Tre regole che rompono tutto se
  si toccano: `isolation:isolate` su `main.stage` (senza, la fusione tinge
  anche testata e menu); il fondo dei canvas **nero**, che è il neutro di
  `difference` e `screen`; e la forza fra coppie **continua** — un gradino
  fra repulsione e attrazione produce una vibrazione ad alta frequenza.
- Tutto ciò che non deve essere toccato dalle gocce va tenuto **fuori** da
  `main.stage`. Oggi ci sono già: testata, menu, loader, lastra, grana,
  righe, barra di avanzamento, cursore.
- I **pulsanti-bolla** (`Bolle()` in `sito.js`) e le maschere condividono la
  stessa funzione `forma()`: se cambi la forma, cambiano tutti e due. È
  voluto.
- I **pulsanti-bolla** vivono dentro `#cop` e salgono dal punto definito da
  `--bocca-x` / `--bocca-y`. Il primo posizionamento avviene **subito**, non
  al primo frame: senza, restano nell'angolo in alto a sinistra finché rAF
  non parte.
- Nello shader della blob mask due artefatti sono **risolti e vanno lasciati
  risolti**: (a) la larghezza dell'antialias ha un **tetto**
  (`clamp(fwidth(field)*uEdge, …, soglia*0.55)`) — senza, vicino al centro di
  una goccia il campo cambia di migliaia per pixel, `fwidth()` esplode e la
  maschera ricade a 0.5 proprio lì: un disco a mezza tinta sul centro;
  (b) il livello della tinta usa una **soglia più bassa** di quello
  dell'inversione (`mergeTint` < `mergeInvert`), così è già al massimo quando
  l'inversione comincia. Se le due soglie tornano uguali, sul bordo il canale
  blu fa una conca e ricompare il filo scuro.
- Nello shader della blob mask `gl_FragCoord.y` cresce verso l'**alto**:
  `direction: 1` fa salire le gocce, non scendere. Il commento della
  specifica dice il contrario — comanda il codice.
- Per guardare cosa disegna un canvas WebGL **non serve** `drawImage` né
  `readPixels` da fuori del frame: senza `preserveDrawingBuffer` tornano
  sempre neri, e sembra che l'effetto non ci sia. Si guarda a schermo.
- L'accensione delle gocce è un **interruttore a scatto**: passata metà
  copertina si accende e non si spegne più. Non è un inseguimento della
  visibilità — tornando su, le gocce invadono anche la copertina, ed è
  voluto: vederle sparire sarebbe peggio che vederle lì.
- `BlobMask.livello()` viene chiamata a **ogni evento di scroll**: dentro non
  ci va niente che tocchi l'orologio o lo stato: rimettere `ultimo` a
  `performance.now()` li' dentro azzerava il dt e fermava la simulazione
  proprio mentre si scorreva.
- Nel ciclo dei pulsanti la **rinascita va dove l'attesa scende a zero**, non
  in un ramo piu' in basso: al giro in cui l'attesa finisce in quel ramo non
  si entra piu', la bolla resta fuori schermo e si rimette in attesa da capo.
  Spariva una volta e non tornava piu'.
- La forma delle maschere è generata dal copione (`forma()` in `sito.js`) e
  animata con la Web Animations API, non con un `@keyframes`: servono tre
  ritagli con lo **stesso numero di segmenti**, altrimenti il passaggio
  dall'uno all'altro non interpola. Il `border-radius` nel CSS è solo la rete
  per dove `clip-path: path()` non c'è.

## Pubblicazione

Sta su GitHub Pages: <https://eneaqupovisione.github.io/Demo-miscel/>, ramo
`main`, cartella radice. Si aggiorna con un `git push`.

**A ogni pubblicazione si lancia `./strumenti/versione.sh <n>`**, che alza il
`?v=` su *tutti* i riferimenti di `index.html` — non solo stile e copione, ma
anche video e immagini. Pages tiene i file in cache dieci minuti: senza,
chi ha gia' aperto il sito continua a vedere la versione vecchia — e' gia'
successo di crederlo un difetto del codice quando era solo la cache.

Quel numero se lo prende anche il copione (`VER` in `sito.js`, letto dal
proprio `src`) e lo appende alle immagini della sequenza, che dal documento
non si vedono. Ci sono cascato due volte: una modifica sembrava non essere
stata applicata, ed era solo la cache.

Se il sito cambia indirizzo vanno aggiornati anche `og:url` e `og:image`,
che sono assoluti apposta: molti scanner delle chat non risolvono un
percorso relativo.

## Stato

Forma finita, **contenuti provvisori**. L'elenco di cosa manca è nel
[README](README.md), sezione "Cosa manca per pubblicarlo".
