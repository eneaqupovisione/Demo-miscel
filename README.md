# MICHELLE — sito

Sito di un'artista indie. Una pagina sola, pensata per il telefono, con una sola
azione: **scrivere per una data**.

Tutta la lingua visiva viene dal videoclip: bianco sporco, nero che tende al blu,
caleidoscopio, colonne di bolle a raggi X. L'unico colore che nel girato non c'è
— il **blu acceso** — è la voce del sito: compare dove si deve toccare o
guardare, e dentro le maschere che ogni tanto attraversano la pagina.

```
sito/
├── index.html              la pagina (una sola)
├── assets/
│   ├── css/sito.css        stili
│   ├── js/sito.js          comportamento — in cima c'è DATI, il pannello dei contenuti
│   └── media/              ARTEFATTI: si rigenerano, non si modificano a mano
│       └── seq/            52 fotogrammi (3 scene in fila), comandati dallo scroll
└── strumenti/media.sh      il costruttore dei media a partire dal girato
```

**Il girato è la sorgente** e sta fuori dalla repo, in `../Michelle/`. Tutto ciò
che è in `assets/media/` esce da lì: si rifà con un comando.

```bash
./strumenti/media.sh
```

Serve `ffmpeg`, `cwebp` e (per il marchio sull'anteprima) `magick`. Lo script
taglia le clip, applica la gradazione duotone, estrae la sequenza e compone
l'immagine di anteprima per le chat.

**Dopo aver rigenerato i media, si alza il numero di versione:**

```bash
./strumenti/versione.sh 13
```

Riscrive il `?v=` su tutti i riferimenti di `index.html` — stile, copione,
video, immagini. Serve perché i file cambiano contenuto tenendo lo stesso
nome, e senza un numero nuovo il browser continua a servire quelli vecchi.

## Guardarlo in locale

```bash
python3 -m http.server 8756 --directory .
```

Poi `http://localhost:8756`. Serve un server vero: la sequenza e i video non si
caricano aprendo il file con doppio clic.

---

## Le sei sezioni

| | | |
|---|---|---|
| 01 | **Copertina** | il nome, il volto in anello, e i pulsanti che salgono |
| 02 | **Ascolta** | le uscite |
| 03 | **Il singolo** | tre stacchi del girato come sfondo di due cose da dire |
| 04 | **Chi è** | tre righe grandi, e dietro il respiro |
| 05 | **Scrivi** | booking, e la silhouette |

## ⚠ Cosa manca per pubblicarlo

Il sito è finito nella forma; **i contenuti sono provvisori**. Sta tutto in un
unico posto: l'oggetto `DATI` in cima a [`assets/js/sito.js`](assets/js/sito.js).

| Cosa | Dove | Stato |
|---|---|---|
| Nome d'arte | `DATI.nome` | `Michelle` — da confermare |
| Titoli, anni e link delle uscite | `DATI.uscite` | **inventati**, da sostituire |
| Link dei tre pulsanti-bolla | `DATI.bolle` | tutti `#` — per ora Spotify, YouTube, Instagram |
| Link ai social | `DATI.social` | tutti `#` |
| Indirizzi booking / management / stampa | `DATI.booking`, `.management`, `.stampa` | finiscono in `.example`, che **non consegna** |
| Frasi del nastro scorrevole | `DATI.nastro` | da rivedere |

Fuori da `DATI`, in [`index.html`](index.html):

- le tre righe di **`#chi`** e la riga di servizio sotto — sono scritte senza
  inventare fatti (niente città, etichette, date o premi): vanno sostituite;
- `<title>`, `meta description` e `og:description`.

Gli indirizzi provvisori usano il dominio `.example`, riservato dallo IANA e non
risolvibile: nessuna mail scritta oggi può partire per sbaglio verso qualcuno.

**Prima di consegnare** (da `~/the-knowledge/clienti/METODO.md`): nessun link che
porta a `#`, il contatto provato con un invio vero, titolo/descrizione/anteprima
corretti, e chi possiede dominio e accessi messo per iscritto.

---

## Com'è fatto dentro

Nessuna libreria. Scroll, `IntersectionObserver` e due canvas.

- **Copertina** — la scena 2 del girato (20,6→22,4): il volto rovesciato con
  l'acqua che cola. Dura 1,8 secondi, troppo poco per un anello che non si
  senta, quindi va **avanti e poi indietro** — 3,6 secondi che si richiudono su
  sé stessi senza nessuno scatto, perché il primo fotogramma è anche l'ultimo.
  È l'unica parte del sito che non segue i ruoli di `:root`: qui il fondo non è
  una scelta, è il girato, quindi è scura e tutto quello che ci sta sopra si
  rilegge in chiaro. Il nome è in
  `mix-blend-mode: difference`: si scurisce sul bianco e si schiarisce sul nero,
  quindi cambia da solo mentre il video scorre. La misura del carattere non è una
  `clamp`: è calcolata, perché la larghezza di una parola dipende da quali
  lettere ha dentro (stessa cosa per i titoli e per il menu).
- **Il singolo** — 320vh di scroll per una schermata inchiodata. Lo sfondo non
  è un piano unico: sono **tre stacchi scelti a mano sul girato**, rimessi
  in fila — colonna di bolle, la testa sul pelo dell'acqua, sott'acqua (il
  volto è salito in copertina, e ripeterlo qui sarebbe una rima involontaria).
  Lo scroll comanda 52 fotogrammi WebP disegnati su
  canvas (una sequenza e non un `<video>`, perché il seek dentro a un video su
  iOS non è affidabile). Tre cose la rendono fluida: il progresso *insegue* lo
  scroll invece di copiarlo, così il rimbalzo di iOS non si vede; fra un
  fotogramma e il successivo si disegna anche quello dopo in trasparenza,
  quindi 52 fotogrammi si comportano come qualche centinaio; e sopra i due
  punti di stacco la trasparenza si toglie, perché uno stacco sfumato non è
  uno stacco. La pagina si ribalta in negativo per tutta la scena.
- **Blob mask** — gocce di metaball che attraversano la pagina e **rimappano i
  colori** di quello che sta sotto: dentro la sagoma il fondo diventa blu e il
  testo bianco, fuori non cambia un pixel. Il testo resta testo — selezionabile
  e cliccabile — perché le gocce non ci sono disegnate sopra: sono una
  finestra.
  Due canvas WebGL, entrambi con le gocce su **fondo nero**, che è l'elemento
  neutro sia di `difference` sia di `screen`. Il primo inverte, il secondo
  colora. Un motore fisico solo li alimenta tutti e due: metaball con
  tensione superficiale, legami che si formano e si spezzano, e velocità di
  caduta che va col **quadrato del raggio** — le piccole restano indietro, le
  grandi le raggiungono e si fondono. Da lì nasce quasi tutto il movimento.
  Sta in [`assets/js/blob-mask.js`](assets/js/blob-mask.js), senza dipendenze,
  con `CONFIG` in cima. La specifica completa è in
  [`blob-mask-spec.md`](blob-mask-spec.md).
  **Non arrivano finché si è sulla copertina**: lì salgono già i pulsanti, e
  due sciami insieme sarebbero rumore. Cominciano quando la copertina scende
  sotto il 30% di schermo visibile.
- **Pulsanti-bolla** — stanno **dentro la copertina**, e sono la seconda cosa
  che si vede dopo il nome. Escono all'altezza della bocca del volto e salgono
  piano — dai venti ai trenta secondi per attraversare lo schermo, perché una
  bolla che schizza via non la si fa in tempo a premere. Quando escono dal
  bordo alto vengono **risputate** dopo un paio di secondi. Le velocità sono
  scalate per indice, se no dopo un giro uscirebbero all'unisono.
  Il punto di emissione sta in un posto solo: `--bocca-x` e `--bocca-y` su
  `#cop`, frazioni del riquadro. Sono link veri e si possono premere mentre
  galleggiano.
- **Chi è** — il respiro dietro alle righe. Lo sfondo è la stessa sequenza del
  singolo — ma solo l'ultimo pezzo, quello sott'acqua, che è il più calmo e non
  si porta dietro gli stacchi (nessun byte in più: le immagini sono caricate
  una volta sola e disegnate da due canvas). E **non compare in dissolvenza:
  si apre da destra come un taglio**, e solo quando la sezione è arrivata davvero. È la
  differenza fra «c'era già e non l'avevi visto» e «è appena successo». Le tre
  righe entrano da sinistra, ognuna dentro alla sua feritoia, sfalsate.
- **Movimento ridotto** — con `prefers-reduced-motion` le maschere spariscono,
  la scena si accorcia e la sequenza segue il dito senza smorzamento.

## Pubblicazione

Sono file statici: qualunque hosting va bene (GitHub Pages, Netlify, Vercel).
Non c'è build. La cartella da pubblicare è questa.
