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
│       └── seq/            60 fotogrammi della scena d'acqua, comandati dallo scroll
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
| Scheda (genere, lingua, formazione) | `DATI.scheda` | da confermare |

Fuori da `DATI`, in [`index.html`](index.html):

- il **manifesto** (la frase grande) e i due paragrafi sotto;
- la **biografia** in `#chi` — è scritta senza inventare fatti (niente città,
  etichette, date o premi): va sostituita con quella vera;
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
- **Il singolo** — 320vh di scroll per una schermata inchiodata. La scena
  d'acqua non è il contenuto: è lo **sfondo** di tre messaggi che fanno un
  lavoro — cosa è uscito, dove si ascolta, e il bottone per ascoltarlo. Lo
  scroll comanda 60 fotogrammi WebP disegnati su canvas (una sequenza e non un
  `<video>`, perché il seek dentro a un video su iOS non è affidabile). Due
  cose la rendono fluida: il progresso *insegue* lo scroll invece di copiarlo,
  così il rimbalzo di iOS non si vede; e fra un fotogramma e il successivo si
  disegna anche quello dopo in trasparenza, quindi 60 fotogrammi si comportano
  come qualche centinaio. La pagina si ribalta in negativo per tutta la scena.
- **Maschere** — non sono nuvole sfumate: sono forme piene, a bordo netto, che
  salgono dal basso e **ribaltano quello che coprono**. Dentro la sagoma il
  fondo diventa blu e il testo bianco; fuori non cambia un pixel.
  `backdrop-filter: grayscale(1) invert(1)` rovescia il fondo, poi il colore
  della forma in `screen` tinge ciò che è diventato nero e lascia stare ciò che
  è diventato bianco. Il `grayscale` non è un vezzo: senza, il blu del sito
  rovesciato diventa giallo, e il giallo qui dentro non esiste. Una forma nera
  al posto del blu dà l'inversione pura. Partono a caso ogni tanto, a gruppi di
  una o due, e arrivano tutte insieme sull'ultima battuta del singolo.
- **Specchi** — caleidoscopio interattivo su canvas 2D. Ogni spicchio è un
  triangolo: il ritaglio del fotogramma ha esattamente quelle proporzioni, e si
  ripete due volte lungo il raggio (la seconda specchiata) come in un
  caleidoscopio vero. Si trascina in orizzontale per girare, in verticale per
  cambiare il numero di specchi.
- **Ritratto a raggi X** — due gradazioni dello stesso fotogramma, sovrapposte
  al pixel: la torcia scopre quella piena dentro a un cerchio. Se nessuno tocca,
  la torcia gira da sola — sul telefono è l'unico modo perché l'effetto si
  mostri senza istruzioni.
- **Movimento ridotto** — con `prefers-reduced-motion` le maschere spariscono,
  la scena si accorcia e la sequenza segue il dito senza smorzamento.

## Pubblicazione

Sono file statici: qualunque hosting va bene (GitHub Pages, Netlify, Vercel).
Non c'è build. La cartella da pubblicare è questa.
