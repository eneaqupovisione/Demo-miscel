# Planimetria — sito Michelle

Sito di un'artista indie. **Una pagina sola, mobile-first, una sola azione:
scrivere per una data.** Niente librerie, niente build: si apre `index.html`
servito da un server statico.

## Dove sta cosa

| | |
|---|---|
| `index.html` | la pagina. Sezioni numerate 01→04 nei commenti. |
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
3. **La palette è quattro colori** — carta gialla sporca, grigio chiaro, blu
   acceso, nero — dichiarati in `:root`. Il blu è la voce del sito: compare
   dove si tocca o dove si deve guardare, mai come decorazione. La carta
   (`--osso`) **non è bianca**: il bianco vero è rimasto solo a qualche
   dettaglio, come la bolla chiara dei pulsanti, che sul girato scuro è il
   punto più chiaro dello schermo. Se aggiungi un `rgba()` con quel colore
   dentro, scrivilo con gli stessi numeri di `--osso`.
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

- Le sezioni sono **quattro**, numerate 01→04 nei commenti di `index.html`.
  Il manifesto non esiste più: la sua frase è diventata le tre righe di `#chi`.
- **La sezione del singolo non c'è più** (tolta il 15/08/2026, `git log`): era
  320vh di scroll per una schermata inchiodata su un contenuto — «Nuovo
  singolo», «Cuffie. Volume alto.» — che non esiste ancora. Con lei sono usciti
  il ritratto e la fila di social in fondo ai contatti. Il posto che occupava è
  quello dove va deciso cosa mostrare davvero.
- La sequenza dell'acqua (`Sequenza` in `sito.js`) adesso ha **un solo
  cliente**: il respiro dietro a `#chi`. Il numero di fotogrammi (`N`) deve
  corrispondere a quello che produce `strumenti/media.sh`.
- **Due cose sono pronte e non collegate**, e vanno considerate morte finché
  qualcuno non le riattacca (`repo-in-ordine`): la classe `body.notte` con
  tutta la sua palette — la accendeva la scena del singolo e adesso non la
  accende nessuno — e `assets/media/profilo.jpg`, che `strumenti/media.sh`
  continua a generare e nessuno usa.
- La **blob mask** sta in `assets/js/blob-mask.js` e implementa
  `blob-mask-spec.md`, che è autoritativo: matematica, shader e costanti
  vengono da lì e non vanno reinterpretati. Tre regole che rompono tutto se
  si toccano: `isolation:isolate` su `main.stage` (senza, la fusione tinge
  anche testata e menu); il fondo dei canvas **nero**, che è il neutro di
  `difference` e `screen`; e la forza fra coppie **continua** — un gradino
  fra repulsione e attrazione produce una vibrazione ad alta frequenza.
- ⚠️ **I due `<canvas>` della maschera stanno in fondo a `main.stage`, e senza
  di loro NIENTE È BLU.** Non la massa fra copertina e testo, non il
  riempimento della firma: `BlobMask.monta()` non trova i canvas, torna
  `null`, e tutta la catena tace **senza un errore in console**. Li ho
  cancellati una volta riscrivendo il fondo della pagina, e il difetto è
  sembrato per due giri un problema delle animazioni. Se qualcosa che
  dovrebbe essere blu non lo è, la prima cosa da guardare è se i canvas
  esistono ancora.
- Tutto ciò che non deve essere toccato dalle gocce va tenuto **fuori** da
  `main.stage`. Oggi ci sono già: testata, menu, loader, lastra, grana,
  righe, barra di avanzamento, cursore.
- Il pulsante **Menu sta fuori dalla testata**, che è un elemento a sé. La
  testata si fonde in `difference` per restare leggibile sul girato scuro e
  sulla carta chiara, e dentro a quella fusione il blu diventa arancio sulla
  carta. Un `mix-blend-mode` sul figlio non lo salva: la testata è già un
  contesto di impilamento, i figli ci finiscono dentro comunque.
- La sagoma dei **pulsanti-bolla** (`bordo()` in `sito.js`) è la stessa
  matematica delle gocce ridotta a **una metaball sola**: il punto del
  contorno viene spostato dal rumore prima di essere misurato, e con una
  metaball sola quello spostamento è una variazione del raggio lungo il giro.
  `hash21`/`vnoise`/`fbm` sono quelli della specifica, tradotti in JS.
  Due cose non vanno rovesciate, perché sono la richiesta a cui risponde:
  **il raggio non scende mai sotto `NUCLEO`** — una bolla si gonfia, si
  allunga, si mescola, non si stringe da sola — e **il rumore si campiona
  nello spazio della pagina**, quindi il profilo cambia perché la bolla
  attraversa il campo salendo, non perché scandisce un ciclo. La versione
  precedente era un `animate()` fra quattro ritagli in `iterations:Infinity`:
  respirava, e il ritorno al primo fotogramma chiave si sentiva.
- Una bolla **nasce gonfiandosi sulla bocca**, non compare già fatta. `nasc`
  va da 0 a 1 in un paio di secondi, `gonfiore()` ne fa il raggio (radice
  cubica: il volume cresce a ritmo costante, quindi il raggio è svelto
  all'inizio), e il centro sale perché il fondo resta sulla bocca. Mentre si
  gonfia è **ferma e non viene spostata** da niente — spinge le altre, ma con
  il raggio che ha adesso, non con quello finale. La scritta compare fra il
  55% e il 94%: quando è tutta lì, la bolla si stacca. A `nasc = 1` scatta
  `stacca()` — parte più svelta della sua velocità di crociera, si allunga nel
  verso in cui va, e il collo (`attacco`) si ritira in tre decimi di secondo.
  È lo `snap` della specifica applicato all'unico legame che una bolla appena
  nata ha: quello con la bocca.
- Fra due bolle c'è **tutta la fisica delle coppie della specifica** (§6):
  repulsione sotto `CONTATTO`, coesione oltre, smorzamento sulla velocità
  relativa, legame con isteresi `FORMA`/`ROTTURA` e rinculo `STRAPPO` quando
  un collo si spezza — con lo stesso allungamento della nascita. La forza
  attraversa lo zero con continuità: un gradino lì produce una vibrazione ad
  alta frequenza, ed è l'errore che ha già rotto una versione delle gocce.
  C'è un tetto alla velocità: dopo uno strappo nessuna deve poter schizzare.
- La sagoma si riscrive a **ogni fotogramma** in `rendi()`. `vesti()` decide
  solo le misure e disegna la prima sagoma — serve perché il ciclo può non
  partire per un pezzo (scheda in secondo piano, finestra di larghezza zero)
  e nel frattempo un quadrato blu resterebbe un quadrato blu.
- Il riquadro del pulsante è **più largo della bolla**: il ritaglio non può
  mostrare colore fuori dal riquadro, e al raggio serve posto per gonfiarsi.
  La somma `NUCLEO + CRESCE + ONDA + LOBO` sta sotto `TETTO`, e sopra 0.44 c'è
  un tetto morbido esponenziale — se il raggio arriva al riquadro il ritaglio
  taglia dritto, e un lato piatto su una bolla si vede subito.
- Le bolle **eruttano una volta sola**: nascono in fila sulla bocca sfalsate
  di mezzo secondo, si gonfiano in meno di un secondo e attraversano in tre.
  Uscite dal bordo alto **non rinascono** — ma si riarmano se si lascia la
  copertina e ci si torna, se no i tre link alle piattaforme sparirebbero per
  sempre dopo dieci secondi.
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
- La sezione **«Chi è»**: un blocco di testo solo, che **si scrive scendendo**
  sopra alla scena. Tre cose da non rovesciare:
  **(a)** ogni parola si scrive quando arriva al suo posto **sullo schermo**,
  non a un tempo né a una percentuale della sezione — con un ciclo unico un
  blocco più alto dello schermo si scriverebbe per metà sotto al bordo;
  **(b)** le righe **non stanno nel markup**: si ricavano dalle posizioni vere
  dopo l'impaginazione, perché il testo va a capo dove vuole. Le parole della
  stessa riga si dividono la fascia in fette che non si sovrappongono — una
  alla volta davvero;
  **(c)** le misure stanno nel **markup** (`.p .m .g .xg`, più `.blu`) e sono
  una **lettura del testo**, non una sequenza: grande ciò che porta il peso —
  cuore, rabbia, colpa, dolore, umani, grandi — piccolo ciò che tiene insieme.
  Il blu su cinque parole, non una in più. Se cambia il testo le decide di
  nuovo una persona. L'unico intervento del codice è su una parola più larga
  della colonna, che si rimpicciolisce quanto basta.
- **La scena** (`scena.mp4`) sta a destra, dove il girato è vuoto, va in anello
  per conto suo e **non c'è da subito**: entra quando un quinto delle parole è
  passato. La sua gradazione è diversa da quella del resto (`media.sh`): il
  fondo dev'essere **bianco pieno**, perché va in `multiply` sulla carta.
  **Non ha nessun effetto addosso**: niente fusione, niente maschera. Sembra
  fusa nella pagina perché il suo fondo **è** il colore della pagina — la
  fusione è gradata dentro al file, non calcolata dal browser. Nella curva
  c'è un gradino piatto in cima (da 0.84 in su il valore non cambia più) che
  schiaccia tutto il fondo del girato su un colore solo: con una rampa fino a
  1 resterebbe variabile di qualche unità e il rettangolo si vedrebbe lo
  stesso.
  ⚠️ **Il colore della carta sta scritto in due posti**: `--osso` nel CSS e la
  gradazione della scena in `media.sh`. Se cambi l'uno, cambia l'altro — è il
  prezzo di non avere effetti a schermo, ed è un prezzo scelto.
  (Prima ci avevo provato con `multiply`: non funziona, perché
  `position:sticky` crea di suo un contesto di impilamento e lì dentro la
  fusione avviene col contenitore, cioè con niente. La nota resta perché la
  trappola vale per qualunque fusione dentro a uno sticky.)
- La **banda di «Ascolta»** scorre di lato mentre la sezione arriva: fondo
  blu, scritta bianca. Finita la corsa si spegne (`.spenta`) e continua ad
  andare avanti e indietro nel colore della carta — il blu, a quel punto, sta
  sotto alla riga delle uscite. Detto una volta basta.
- **Quanto dura la massa in scroll**- **Quanto dura la massa in scroll**- **Quanto dura la massa in scroll** si decide in un posto solo: la finestra
  di `diss` in `sito.js` (`(0.68 - bordo) / 0.46`). Da un capo all'altro sono
  otto decimi di schermata. È l'unico numero da toccare per farla durare di
  più o di meno.
- La **massa fluida** (`BlobMask.massa()`) è il raccordo fra copertina e
  "Ascolta": non c'è più un taglio netto. È fatta di due parti — un corpo
  pieno sotto il confine e una cresta di gocce piccole sopra — ma il profilo
  irregolare **non viene dalla geometria**, viene dal domain warp dello
  shader (`massaWarp`): gocce grandi abbastanza da riempire il corpo sono
  anche troppo grandi per fare un bordo mosso, e davano una cupola liscia.
- **La massa a pagina ferma sfocia sopra il nome, ed è voluto.** Prima era il
  contrario — era spinta tutta sotto lo schermo perché la cupola si mangiava
  il nome — e la nota di allora diceva di lasciarla lì. Adesso il nome ci sta
  *dentro*, bianco su blu, e per farlo funzionare servono tre cose insieme:
  `giu` che la tiene sotto solo in parte, `gonfio` che **non parte più da
  zero** (da lui dipendono cresta, bitorzoli e ampiezza del domain warp: a
  zero restava un mezzo cerchio liscio), e il taglio dell'inversione qui
  sotto.
- **Perché la massa si vede blu e non bianca.** L'effetto rimappa due toni: su
  carta chiara la goccia diventa blu, ma sul girato scuro l'inversione la fa
  *bianca*. Quindi l'inversione si ferma al confine fra le due sezioni
  (`uSotto` nello shader, `CONFIG._sotto` da `massa()`): sopra resta la sola
  tinta in `screen`, che su fondo scuro dà blu e lascia bianco il bianco che
  ci trova — il nome. È il verso della specifica ribaltato, perché qui il
  fondo è scuro e non chiaro. Il taglio è quasi netto apposta: una sfumatura
  larga cade sul girato e produce una fascia azzurra per tutto lo schermo.
- La massa **è viva anche da ferma**: ogni goccia fa un giro lentissimo
  (`vita`, tre seni di frequenze non multiple, un giro dura un minuto
  abbondante). Deterministico e senza `Math.random`: per lo stesso istante la
  massa dev'essere identica, se no vibra invece di muoversi.
- Nel posizionamento della massa c'è un **correttivo sull'aspect** (`A`) ed è
  di forma, non di gusto: lo spazio è isotropo, quindi su uno schermo largo le
  gocce vengono più grandi *in altezze di schermo* e la stessa massa monta il
  doppio. Vale solo a riposo — appena il confine sale deve poter allagare
  "Ascolta" come prima.
- L'allungamento dei pulsanti verso le vicine va nel **raggio del bordo**, non
  in una scala sul corpo: una scala che tira da una parte stringe dall'altra,
  e per tenere dritta la scritta serviva la scala inversa su di lei — due
  rimedi a un problema che non deve esistere. Adesso è un lobo additivo verso
  la vicina (cubo del coseno, così anche la derivata è zero dove finisce), e
  la repulsione lascia che i bordi si compenetrino un poco: è lì che le due
  bolle sembrano una cosa sola invece di due palle appoggiate.
- L'accensione delle gocce sparse è un **interruttore a scatto**: passata metà
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
- Il `border-radius` nel CSS dei pulsanti-bolla è solo la rete per dove
  `clip-path: path()` non c'è: lì la sagoma resta tonda e ferma, e va bene
  così.

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
