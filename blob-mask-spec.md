# Blob mask — specifica di implementazione

Effetto metaball fluide che attraversano la pagina e **invertono e colorano** il
contenuto che si trova sotto di loro. Il testo resta testo HTML vero: selezionabile,
indicizzabile, accessibile.

Questo documento è autosufficiente: contiene la matematica, lo shader, le costanti
della fisica e i parametri già tarati. Chi implementa non deve inventare nulla.

> **Nota per chi integra**: nel progetto esiste già un primo tentativo di effetto bolla.
> Va **rimosso integralmente**, non adattato. L'approccio descritto qui è diverso alla
> radice e i due non possono convivere.

---

## 1. Il principio

Le gocce non sono oggetti disegnati sopra al contenuto. Sono una **finestra** che
rimappa i colori di ciò che sta sotto.

Il risultato si ottiene con due livelli sovrapposti, entrambi con le gocce su **fondo
nero**. Il nero è l'elemento neutro sia di `difference` sia di `screen`: fuori dalla
sagoma il contenuto non subisce alcuna variazione, nemmeno di un'unità.

| livello | colore gocce | `mix-blend-mode` | effetto dentro la goccia |
|---|---|---|---|
| 1 | bianco `#ffffff` | `difference` | inverte: bianco → nero, nero → bianco |
| 2 | tinta `#1a3cff` | `screen` | colora: nero → tinta, bianco → resta bianco |

Verifica della matematica, con sfondo pagina bianco `(1,1,1)` e testo nero `(0,0,0)`:

```
FUORI dalla goccia (livelli = nero)
  difference(0, X) = X          invariato
  screen(0, X)     = X          invariato

DENTRO la goccia
  sfondo:  difference(1, 1) = 0        →  screen(B, 0) = B     tinta
  testo:   difference(1, 0) = 1        →  screen(B, 1) = 1     bianco
```

**Limite del metodo**: rimappa due toni. Su una fotografia o su una scala di grigi
produce un negativo virato — a volte ottimo, ma va verificato caso per caso. Se serve
mostrare contenuto *arbitrario* dentro le gocce (un'altra immagine, un altro layout)
questo approccio non basta e occorre passare a una maschera CSS su contenuto duplicato,
con le gocce ridisegnate in SVG.

**Modalità negativo**: omettendo il livello 2 si ottiene bianco su nero dentro le gocce,
a metà del costo di disegno. Deve restare selezionabile da configurazione.

---

## 2. Struttura DOM richiesta

```html
<div class="stage">
  <!-- tutto il contenuto reale della sezione -->
  <section>…</section>

  <!-- i due livelli, ultimi nel DOM -->
  <canvas id="c-invert" aria-hidden="true"></canvas>
  <canvas id="c-tint"   aria-hidden="true"></canvas>
</div>
```

I canvas vanno **dentro** `.stage` e **dopo** il contenuto. Tutto ciò che NON deve
essere toccato dalle gocce (header fisso, menu, cookie banner, overlay) va tenuto
**fuori** da `.stage`.

## 3. CSS obbligatorio

```css
.stage {
  position: relative;
  isolation: isolate;     /* NON opzionale: senza, la fusione risale alla radice
                             del documento e tinge elementi estranei */
  background: #fff;       /* la fusione ha bisogno di un fondo su cui operare */
}

.stage canvas {
  position: fixed;        /* le gocce restano ferme, il contenuto scorre sotto */
  inset: 0;
  width: 100%; height: 100%;
  display: block;
  pointer-events: none;   /* il testo sotto resta selezionabile e cliccabile */
}

#c-invert { mix-blend-mode: difference; }
#c-tint   { mix-blend-mode: screen; }
```

**Mai** usare `z-index` negativo sui canvas: con uno sfondo dichiarato su `html`/`body`
finirebbero dietro allo sfondo e resterebbero invisibili.

---

## 4. Parametri tarati

Sono i valori scelti e validati. Vanno usati come default.

```js
const CONFIG = {
  // ── FORMA · caratteristiche della singola goccia ──
  count:      22,      // gocce simultanee
  sizeMax:    0.066,   // raggio della più grande, in frazioni dell'altezza viewport
  spread:     0.42,    // la più piccola = sizeMax × spread
  merge:      1.00,    // soglia del campo: alto = contorni magri, basso = gonfi
  warp:       0.055,   // ampiezza della deformazione del bordo
  warpScale:  2.80,    // grana della deformazione: alto = increspature fitte
  stretch:    0.54,    // allungamento verticale proporzionale alla velocità

  // ── MOTO · come le gocce si relazionano ──
  speed:      0.140,   // velocità limite della goccia PIÙ GRANDE, in viewport/secondo
  viscosity:  1.04,    // tempo di rilassamento in secondi dopo una spinta
  cohesion:   0.66,    // tensione superficiale: attrazione fra bordi vicini
  repulsion:  2.00,    // spinta di nucleo: impedisce il collasso in una macchia unica
  damping:    11.0,    // smorzamento della velocità relativa fra gocce vicine
  snap:       0.018,   // impulso di rinculo quando un collo si spezza
  sway:       0.065,   // deriva orizzontale (convezione)
  warpSpeed:  0.26,    // velocità di rimescolamento del bordo

  direction:  1,       // 1 = alto→basso · -1 = basso→alto
  tint:       '#1a3cff',
  mode:       'tinta'  // 'tinta' (due livelli) · 'negativo' (solo il primo)
};
```

Costanti della fisica, non esposte come parametri:

```js
const CORE     = 1.00;  // sotto la somma dei raggi le gocce si respingono
const REACH    = 1.34;  // oltre questa distanza non si sentono più
const FORM     = 1.06;  // il legame si forma qui…
const BREAK    = 1.30;  // …e si spezza qui. L'isteresi evita lo sfarfallio
const MIN_BOND = 0.5;   // un legame più breve di così non produce rinculo
const MASS_MIN = 0.20;  // pavimento sulla massa: senza, le gocce minuscole schizzano
const DPR_CAP  = 2;     // tetto al devicePixelRatio
const SUBSTEP  = 1/90;  // passo fisso della simulazione
```

---

## 5. Shader

Identico per i due livelli: cambia solo `uInk`. Il fondo è sempre nero, e per questo
il fragment finale è `uInk * mask` e non un `mix()` fra due colori.

`COUNT` va iniettato nel sorgente prima della compilazione: in WebGL 1 gli array
uniform devono avere dimensione costante nota a tempo di compilazione. Cambiare
`count` a runtime richiede quindi di **ricompilare il programma**.

### Vertex

```glsl
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
```

Un solo triangolo che copre lo schermo: `[-1,-1, 3,-1, -1,3]`.

### Fragment

```glsl
// se OES_standard_derivatives è disponibile, anteporre:
// #extension GL_OES_standard_derivatives : enable
// #define HAS_DERIV 1
precision highp float;
#define COUNT 22            // iniettato

uniform vec4  uBlobs[COUNT];   // x, y, raggio, allungamento
uniform vec2  uRes;
uniform float uAspect;
uniform float uTime;
uniform float uMerge;
uniform float uWarp;
uniform float uWarpScale;
uniform vec3  uInk;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = gl_FragCoord.xy / uRes;

  // domain warp: sposto il punto PRIMA di misurarlo. È questo, non la geometria,
  // a rendere i bordi irregolari e liquidi.
  vec2 wp = vec2(p.x * uAspect, p.y) * uWarpScale;
  vec2 n = vec2(fbm(wp + vec2(0.0, uTime)),
                fbm(wp + vec2(5.7, -uTime) + 31.4)) - 0.5;
  vec2 q = p + n * uWarp * vec2(1.0 / uAspect, 1.0);

  // campo metaball: somma dei contributi. Raggio 0 contribuisce 0.
  float field = 0.0;
  for (int i = 0; i < COUNT; i++) {
    vec4 b = uBlobs[i];
    vec2 d = (q - b.xy) * vec2(uAspect, 1.0);
    d.y /= b.w;                                   // allungamento verticale
    field += (b.z * b.z) / max(dot(d, d), 1e-6);
  }

  #ifdef HAS_DERIV
    float w = max(fwidth(field), 1e-5);
    float mask = smoothstep(uMerge - w, uMerge + w, field);
  #else
    float mask = smoothstep(uMerge * 0.94, uMerge * 1.06, field);
  #endif

  gl_FragColor = vec4(uInk * mask, 1.0);          // fuori = nero = neutro
}
```

Contesto da creare con `{ antialias: false, alpha: false }`.

---

## 6. Fisica

Spazio isotropo: `X` va da `0` ad `aspect`, `Y` da `0` a `1`. Così un raggio misura
uguale in orizzontale e in verticale. Allo shader si passa `x = X / aspect`.

### Velocità di caduta

Regime di Stokes, quindi la velocità limite va col **quadrato del raggio**:

```
v(r) = speed × r² / sizeMax²
```

Conseguenza voluta: le gocce piccole restano indietro, le grandi le raggiungono e
si fondono. È da qui che nasce quasi tutto il movimento interessante.

Massa `∝ r³`, con pavimento:

```js
massOf(r) = max(MASS_MIN, (r / sizeMax)³)
```

### Forza fra coppie — deve essere CONTINUA

Con `s = distanza / (r₁ + r₂)`, quindi `s = 1` significa bordi a contatto:

```js
if (s < CORE) {                       // sovrapposte → si respingono
  const t = 1 - s / CORE;
  f = repulsion * t * t;              // massima al centro, ZERO al contatto
} else {                              // vicine → si attraggono
  const u = (s - CORE) / (REACH - CORE);
  f = -cohesion * Math.sin(Math.PI * u);   // gobba, ZERO a entrambi i capi
}
```

> **Attenzione, è l'errore che ha già rotto una versione precedente.** Se la forza ha
> un gradino nel punto di passaggio fra repulsione e attrazione, le gocce oscillano
> attorno a quel confine decine di volte al secondo e l'effetto è una vibrazione ad
> alta frequenza. La curva **deve** attraversare lo zero con continuità.

Smorzamento sulla velocità relativa lungo la normale, che dissipa le oscillazioni:

```js
const vrel = (b.vX - a.vX) * nx + (b.vY - a.vY) * ny;
const damp = -damping * vrel * (1 - s / REACH);
```

Applicazione, con `h` = passo temporale:

```js
a.v -= n * (f + damp) * h / massOf(a.r);
b.v += n * (f + damp) * h / massOf(b.r);
```

### Legami e rinculo

Ogni coppia ha uno stato legato/slegato con **isteresi**: si lega sotto `FORM`, si
slega sopra `BREAK`. Nell'istante della rottura, se il legame è durato più di
`MIN_BOND` secondi, si applica un impulso opposto diviso per la massa:

```js
a.v -= n * snap / massOf(a.r);
b.v += n * snap / massOf(b.r);
```

La goccia piccola parte via, la grande quasi non se ne accorge. È la tensione
superficiale che ritira i due monconi del collo spezzato.

### Integrazione

Passo fisso, con sottopassi:

```js
const sub = Math.max(1, Math.ceil(dt * 90));
const h   = dt / sub;
for (let s = 0; s < sub; s++) substep(h);
```

Nel substep, dopo le forze di coppia, la viscosità riporta ogni goccia verso la sua
velocità naturale. Il rilassamento **esponenziale** è stabile a qualunque `dt`:

```js
const relax = 1 - Math.exp(-h / max(viscosity, 0.02));
b.vY += (v(r) * direction - b.vY) * relax;
b.vX += (sin(clock * b.swayFreq * 2π + b.swayPhase) * sway - b.vX) * relax;
```

Poi limite di velocità `speed * 6 + 0.10`, integrazione `X += vX * h`, e pareti
morbide sui bordi laterali (riflessione con coefficiente 0.3).

### Ciclo di vita

Ogni goccia ha una durata fra 22 e 55 secondi. Negli ultimi 3 il raggio va a zero e
la goccia rinasce dal bordo di ingresso. Serve perché con la legge di Stokes le gocce
più piccole sono quasi ferme e senza questo si accumulerebbero per sempre.

Il raggio va **ricalcolato ogni frame** da una taglia relativa `sizeT ∈ [0,1]`
congelata alla nascita:

```js
r = sizeMax * spread + sizeT * (sizeMax - sizeMax * spread)
```

Così cambiare `sizeMax` o `spread` a runtime agisce immediatamente su tutte le gocce
esistenti, anche in pausa.

---

## 7. Regole non negoziabili

1. **`isolation: isolate`** sul contenitore. Senza, la fusione tinge tutta la pagina.
2. **Fondo dei canvas nero.** È il neutro delle due modalità. Qualsiasi altro colore
   altera il contenuto anche fuori dalle gocce.
3. **`pointer-events: none`** sui canvas, e `aria-hidden="true"`. Sono decorazione.
4. **Nessun `z-index` negativo** sui canvas.
5. **`devicePixelRatio` limitato a 2.** Il costo è per pixel, non per goccia: 40 gocce
   costano quasi come 15, ma un 4K non limitato costa il quadruplo.
6. **Un solo motore fisico** che alimenta entrambi i livelli. Mai due simulazioni.
7. **`prefers-reduced-motion: reduce`** → simulazione ferma, un fotogramma statico
   disegnato. Non rimuovere l'effetto, congelarlo.
8. **Se WebGL non è disponibile**, i canvas restano vuoti e la pagina funziona
   normalmente in nero su bianco. Nessun messaggio d'errore all'utente, nessun
   contenuto nascosto: miglioramento progressivo, non requisito.
9. **Nessuna dipendenza esterna.** Niente three.js, niente librerie di animazione.
10. **Il contenuto non va duplicato né alterato.** L'effetto è puramente visivo e non
    tocca il markup semantico.

---

## 8. Prestazioni

- Il costo dominante è il fragment shader a schermo intero, moltiplicato per il numero
  di livelli. Modalità `negativo` = metà del costo.
- Il ciclo delle coppie è O(n²) sulla CPU: con 22 gocce sono 231 coppie per sottopasso,
  trascurabile. Sopra le 60 gocce servirebbe una griglia spaziale — non è il caso.
- Su viewport sotto i 700 px di larghezza: ridurre `count` a circa 14 e valutare
  `DPR_CAP` a 1.5.
- Mettere in pausa la simulazione quando la sezione è fuori dal viewport
  (`IntersectionObserver`) e quando la scheda è nascosta (`visibilitychange`).

## 9. Verifica prima di considerare il lavoro finito

- [ ] Il testo sotto le gocce è selezionabile col mouse.
- [ ] Fuori dalle gocce i colori sono esattamente `#000` su `#fff`, non un nero
      leggermente scostato. Verificare con un contagocce.
- [ ] Header, menu e overlay fuori da `.stage` non cambiano colore mai.
- [ ] Nessuna vibrazione ad alta frequenza, nemmeno dopo una spinta violenta.
- [ ] Le gocce piccole vanno più lente delle grandi.
- [ ] Ridimensionando la finestra le gocce non si deformano né si accumulano su un lato.
- [ ] Con `prefers-reduced-motion` attivo l'immagine è ferma ma presente.
- [ ] Disattivando WebGL la pagina resta leggibile.
- [ ] Il vecchio effetto bolla è stato rimosso, non disattivato: nessun file, stile o
      import residuo.

---

## 10. Prompt di implementazione

Da incollare all'agente, con questo file presente nel repository.

````text
Devi implementare un effetto "blob mask" sul sito.

CONTESTO
Nel progetto esiste già un primo tentativo di effetto bolla. È sbagliato
concettualmente e va RIMOSSO INTEGRALMENTE: componenti, stili, script, import e
dipendenze usate solo da lui. Non adattarlo e non riciclarne parti.

SPECIFICA
Leggi per intero `blob-mask-spec.md` e trattalo come autoritativo. Contiene la
matematica, lo shader completo, le costanti della fisica e i parametri già tarati.
Non inventare valori, non sostituire le formule con approssimazioni e non introdurre
librerie: l'effetto è WebGL puro senza dipendenze.

PROCEDI IN QUEST'ORDINE, fermandoti dopo ogni punto per mostrarmi il risultato.

1. RICOGNIZIONE
   Trova l'implementazione esistente. Elencami i file coinvolti, cosa fa ciascuno e
   cosa esattamente intendi eliminare. Dimmi anche in quale sezione della pagina
   l'effetto è attualmente montato e con quale contenuto sotto. NON toccare ancora
   niente: aspetta la mia conferma.

2. RIMOZIONE
   Elimina il vecchio effetto. Verifica che il sito compili e che la sezione resti
   leggibile in nero su bianco senza alcun residuo di stile.

3. IMPLEMENTAZIONE
   Costruisci il nuovo effetto seguendo la specifica, rispettando le convenzioni del
   progetto (framework, struttura cartelle, stile del codice, TypeScript se in uso).
   Isola la logica in un modulo riutilizzabile che esponga l'oggetto CONFIG: voglio
   poter cambiare i parametri da un punto solo. Il motore fisico deve essere uno solo
   e alimentare entrambi i livelli di fusione.

4. INTEGRAZIONE
   Monta l'effetto sulla sezione individuata al punto 1, senza duplicare né
   riscrivere il contenuto esistente. Il markup semantico non si tocca.

5. VERIFICA
   Percorri la checklist della sezione 9 della specifica punto per punto e dimmi
   l'esito di ciascuno. Se qualcosa non passa, correggi prima di dichiarare finito.

VINCOLI
- Nessuna dipendenza esterna nuova.
- `isolation: isolate` sul contenitore è obbligatorio.
- La forza fra coppie deve essere continua: un gradino produce vibrazione.
- Il testo sotto le gocce deve restare selezionabile.
- Miglioramento progressivo: senza WebGL la pagina funziona normalmente.

Se qualcosa nella specifica confligge con l'architettura del progetto, fermati e
chiedimi come procedere invece di decidere da solo.
````

---

## 11. Note di consegna

> Questa sezione è indirizzata a te, non all'agente. Spiega perché il documento è
> fatto così e dove può andare storto. Se passi la specifica a qualcun altro, puoi
> anche tagliarla via senza perdere nulla di operativo.

Ho fatto qualche scelta che vale la pena spiegarti.

**La specifica è autosufficiente.** Contiene lo shader per intero e tutte le formule
della fisica, non rimandi al file di prova. Così l'agente non deve dedurre niente da
una demo, e se in futuro rileggi il documento a distanza di mesi ci trovi anche il
*perché* delle scelte, non solo i numeri.

**Il prompt impone di fermarsi dopo la ricognizione.** È il punto in cui si perde più
tempo quando c'è già codice esistente: se l'agente parte a cancellare senza mostrarti
cosa tocca, rischi che porti via qualcosa di condiviso con altre parti del sito.
Meglio spendere un giro di conferma.

**Ho segnalato esplicitamente l'errore della forza discontinua**, con il riquadro di
avviso nella sezione 6. È l'unica cosa che ha davvero rotto una versione durante lo
sviluppo, ed è un errore che si commette in modo naturale: chi implementa scrive "se
sono vicine attrai, se sono troppo vicine respingi" e ottiene la vibrazione ad alta
frequenza. Averlo scritto nero su bianco vale più di dieci righe di commento nel
codice.

**Un punto su cui potresti dover intervenire tu.** Nella regola 8 ho scritto che senza
WebGL i canvas restano vuoti e la pagina funziona normalmente. Nel file di prova
`blob-mask.html` invece compare un messaggio d'errore a schermo intero: per una demo va
bene, su un sito vero sarebbe un disastro — nasconderebbe il contenuto a chiunque abbia
WebGL disattivato o una scheda video in blocklist. Se passi anche l'HTML all'agente
come riferimento, ricordagli che **in caso di conflitto vince questa specifica**. Vale
in generale: il file di prova serve a far vedere l'effetto, non a dettare
l'architettura.

---

## 12. Da valutare più avanti

- **Reazione al puntatore**: una repulsione locale attorno al cursore, con la stessa
  curva continua usata per le coppie. Costa poco e si nota molto.
- **Sorgente e risalita**: gocce che nascono in basso, salgono, si raffreddano in alto
  e ridiscendono. È la lavalamp vera, e con `direction` variabile per goccia è già
  quasi tutto in piedi.
- **Contenuto arbitrario dentro le gocce**: richiede maschera CSS su contenuto
  duplicato e gocce ridisegnate in SVG con `feGaussianBlur` + `feColorMatrix` per la
  fusione e `feTurbulence` + `feDisplacementMap` per l'irregolarità. Più flessibile,
  parecchio più costoso a schermo intero.
