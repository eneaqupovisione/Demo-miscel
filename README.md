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
│       └── seq/            70 fotogrammi (4 scene in fila), comandati dallo scroll
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
| 01 | **Copertina** | il nome, il caleidoscopio del girato |
| 02 | **Ascolta** | subito sotto il nome: le uscite e le piattaforme |
| 03 | **Il singolo** | quattro stacchi del girato come sfondo di due cose da dire |
| 04 | **Chi è** | tre righe grandi, e dietro il respiro |
| 05 | **Scrivi** | booking, e la silhouette |

## ⚠ Cosa manca per pubblicarlo

Il sito è finito nella forma; **i contenuti sono provvisori**. Sta tutto in un
unico posto: l'oggetto `DATI` in cima a [`assets/js/sito.js`](assets/js/sito.js).

| Cosa | Dove | Stato |
|---|---|---|
| Nome d'arte | `DATI.nome` | `Michelle` — da confermare |
| Titoli, anni e link delle uscite | `DATI.uscite` | **inventati**, da sostituire |
| Link a Spotify / Apple / YouTube / Bandcamp / SoundCloud | `DATI.piattaforme` | tutti `#` |
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

- **Copertina** — il caleidoscopio con cui si apre il girato. Il nome è in
  `mix-blend-mode: difference`: si scurisce sul bianco e si schiarisce sul nero,
  quindi cambia da solo mentre il video scorre. La misura del carattere non è una
  `clamp`: è calcolata, perché la larghezza di una parola dipende da quali
  lettere ha dentro (stessa cosa per i titoli e per il menu).
- **Il singolo** — 320vh di scroll per una schermata inchiodata. Lo sfondo non
  è un piano unico: sono **quattro stacchi scelti a mano sul girato**, rimessi
  in fila — colonna di bolle, il volto con l'acqua che cola, la testa sul pelo
  dell'acqua, sott'acqua. Lo scroll comanda 70 fotogrammi WebP disegnati su
  canvas (una sequenza e non un `<video>`, perché il seek dentro a un video su
  iOS non è affidabile). Tre cose la rendono fluida: il progresso *insegue* lo
  scroll invece di copiarlo, così il rimbalzo di iOS non si vede; fra un
  fotogramma e il successivo si disegna anche quello dopo in trasparenza,
  quindi 70 fotogrammi si comportano come qualche centinaio; e sopra i tre
  punti di stacco la trasparenza si toglie, perché uno stacco sfumato non è
  uno stacco. La pagina si ribalta in negativo per tutta la scena.
- **Maschere** — non sono nuvole sfumate: sono forme piene, a bordo netto, che
  salgono dal basso e **ribaltano quello che coprono**. Dentro la sagoma il
  fondo diventa blu e il testo bianco; fuori non cambia un pixel.
  `backdrop-filter: grayscale(1) invert(1)` rovescia il fondo, poi il colore
  della forma in `screen` tinge ciò che è diventato nero e lascia stare ciò che
  è diventato bianco. Il `grayscale` non è un vezzo: senza, il blu del sito
  rovesciato diventa giallo, e il giallo qui dentro non esiste. Una forma nera
  al posto del blu dà l'inversione pura.
  La forma **non è tonda**: è un giro di nove-dodici punti a raggio irregolare
  raccordati con delle cubiche, generato diverso per ogni maschera e morfato
  fra tre versioni — quindi grande, molle e asimmetrica, non una goccia.
  Escono a **gruppi sparsi** di due-tre, sfalsate di un paio di secondi l'una
  dall'altra perché non salgano tutte alla stessa altezza, e ci mettono dai
  dodici ai venticinque secondi ad attraversare. **Mentre si scorre
  accelerano**: non si tocca la durata (cambiarla farebbe ripartire
  l'animazione da capo), si alza il `playbackRate` dell'animazione già in
  corso, che va da 1 a circa 4.6.
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
