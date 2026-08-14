/* ===========================================================================
   BLOB MASK — gocce di metaball che attraversano la pagina e rimappano i
   colori di quello che sta sotto. Il testo resta testo: selezionabile,
   indicizzabile, cliccabile.

   Implementa `blob-mask-spec.md`. Matematica, shader e costanti vengono da li'
   e non sono state reinterpretate.

   IL PRINCIPIO
   Due livelli sovrapposti, entrambi con le gocce su fondo NERO — il nero e'
   l'elemento neutro sia di `difference` sia di `screen`, quindi fuori dalla
   sagoma il contenuto non cambia di un'unita'.

     livello 1  gocce bianche  difference  inverte: bianco->nero, nero->bianco
     livello 2  gocce tinta    screen      colora:  nero->tinta, bianco resta

   Nessuna dipendenza. Senza WebGL i canvas restano vuoti e la pagina funziona
   normalmente: miglioramento progressivo, non requisito.
   =========================================================================== */
var BlobMask = (function(){
'use strict';

/* --- parametri tarati (specifica §4) ------------------------------------- */
var CONFIG = {
  /* FORMA — la singola goccia */
  count:      30,
  sizeMax:    0.040,
  spread:     0.42,
  merge:      1.00,
  warp:       0.055,
  warpScale:  2.80,
  stretch:    0.54,

  /* MOTO — come si relazionano */
  speed:      0.140,
  viscosity:  1.04,
  cohesion:   0.66,
  repulsion:  2.00,
  damping:    11.0,
  snap:       0.018,
  sway:       0.065,
  warpSpeed:  0.26,

  /* IL FILO SCURO SUL BORDO — perche' nasceva e come si toglie.
     Sul bordo la maschera vale m fra 0 e 1. Su carta chiara il canale blu
     fa: 0.945 -> 0.72 (a m=0.5) -> 1.0. Sale, ma prima scende: quella
     conca e' il filo scuro. Rosso e verde invece calano dritti.
     Non e' un problema di larghezza del bordo, e' un problema di ordine:
     se la tinta e' gia' al massimo quando l'inversione comincia, il canale
     blu resta a 1 per tutta la transizione e la conca sparisce.
     Percio' il livello della tinta usa una soglia piu' bassa — goccia un
     10% piu' larga — mentre l'inversione tiene la sua. */
  mergeInvert: 1.00,
  mergeTint:   0.95,
  edgeInvert:  0.80,
  edgeTint:    1.00,

  /* La dissolvenza dell'inchiostro serve solo a non far scattare il primo
     fotogramma: le gocce non devono "materializzarsi" a meta' schermo, devono
     entrare da sotto. A occuparsene e' semina(), non questa. */
  fadeIn:     0.10,
  fadeOut:    0.075,

  /* ATTENZIONE al verso. Nello shader `gl_FragCoord.y` cresce verso l'ALTO,
     quindi la Y della fisica e' rovesciata rispetto a quella del documento:
     direction = 1 fa entrare le gocce da sotto e salire. Il commento della
     specifica dice il contrario, ma comanda il codice. */
  direction:  1,
  tint:      '#1B3BFF',
  mode:      'tinta',         /* 'tinta' = due livelli · 'negativo' = solo il primo */

  /* --- modalita' MASSA ---------------------------------------------------
     Le gocce non cadono: stanno ferme, disposte a griglia, e si fondono in
     una massa sola che fa da raccordo fra due sezioni. Poi si scioglie.
     Il moto lo da' il domain warp dello shader, non la fisica: la massa e'
     immobile ma il suo bordo respira. */
  /* La massa e' fatta di due cose. Un CORPO pieno sotto il confine, che non
     ha bisogno di essere irregolare perche' esce dallo schermo ai lati; e una
     CRESTA di gocce piccole sul bordo alto, che e' l'unica parte che si vede
     davvero come profilo. Una griglia sola non funzionava: gocce abbastanza
     grandi da riempire il corpo sono anche troppo grandi per fare un bordo
     mosso, e veniva una cupola liscia. */
  crestaQuota: 0.42,  /* frazione di gocce dedicate alla cresta */
  crestaSu:    0.09,  /* di quanto la cresta sale sopra il confine, a pieno gonfiore */
  crestaOnda:  0.085, /* ampiezza dei bitorzoli, in altezze di schermo */
  crestaR:     0.92,  /* raggio della cresta in frazioni del passo */
  massaGiu:    0.46,  /* quanto scende il corpo sotto il confine */
  massaR:      0.80,  /* raggio del corpo in frazioni della cella */

  /* Il profilo irregolare NON viene dalla geometria: viene da qui. La
     deformazione del dominio sposta il punto prima di misurarlo, quindi
     increspa il contorno di tutta la massa — comprese le parti dove sotto
     c'e' una goccia grande che altrimenti darebbe una cupola liscia.
     Sono i valori usati in modalita' massa, piu' forti di quelli delle
     gocce sparse. */
  massaWarp:      0.115,
  massaWarpScale: 4.20
};

/* costanti della fisica, non esposte (specifica §4) */
var CORE = 1.00, REACH = 1.34, FORM = 1.06, BREAK = 1.30;
var MIN_BOND = 0.5, MASS_MIN = 0.20, SUBSTEP = 1/90;

/* --- shader (specifica §5) ----------------------------------------------- */
var VERT = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}';

function frag(count, deriv){ return (deriv
? '#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV 1\n' : '') +
'precision highp float;\n' +
'#define COUNT ' + count + '\n' + [
'uniform vec4  uBlobs[COUNT];',
'uniform vec2  uRes;',
'uniform float uAspect;',
'uniform float uTime;',
'uniform float uMerge;',
'uniform float uWarp;',
'uniform float uWarpScale;',
'uniform vec3  uInk;',
'uniform float uEdge;',
'uniform float uMergeK;',
/* Fin dove arriva questo livello, in quota di schermo (0 = fondo, 1 = cima).
   Serve a UNA cosa sola, ed e' quella che rende blu la massa sul girato:
   l'inversione si ferma al confine fra le due sezioni, e sopra resta la sola
   tinta in `screen`. Su un fondo scuro `screen` con il blu da' il blu, e il
   bianco che ci trova sopra — il nome — resta bianco. E' esattamente il
   verso della specifica ribaltato, perche' qui il fondo e' scuro e non
   chiaro. Negativo = il livello vale dappertutto. */
'uniform float uSotto;',
'float hash21(vec2 p){',
'  p = fract(p * vec2(123.34, 456.21));',
'  p += dot(p, p + 45.32);',
'  return fract(p.x * p.y);',
'}',
'float vnoise(vec2 p){',
'  vec2 i = floor(p), f = fract(p);',
'  vec2 u = f * f * (3.0 - 2.0 * f);',
'  float a = hash21(i);',
'  float b = hash21(i + vec2(1.0, 0.0));',
'  float c = hash21(i + vec2(0.0, 1.0));',
'  float d = hash21(i + vec2(1.0, 1.0));',
'  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
'}',
'float fbm(vec2 p){',
'  float v = 0.0, a = 0.5;',
'  for (int i = 0; i < 3; i++){ v += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }',
'  return v;',
'}',
'void main(){',
'  vec2 p = gl_FragCoord.xy / uRes;',
/* domain warp: si sposta il punto PRIMA di misurarlo. E' questo, non la
   geometria, a rendere i bordi irregolari e liquidi. */
'  vec2 wp = vec2(p.x * uAspect, p.y) * uWarpScale;',
'  vec2 n = vec2(fbm(wp + vec2(0.0, uTime)),',
'                fbm(wp + vec2(5.7, -uTime) + 31.4)) - 0.5;',
'  vec2 q = p + n * uWarp * vec2(1.0 / uAspect, 1.0);',
'  float field = 0.0;',
'  for (int i = 0; i < COUNT; i++){',
'    vec4 b = uBlobs[i];',
'    vec2 d = (q - b.xy) * vec2(uAspect, 1.0);',
'    d.y /= b.w;',
'    field += (b.z * b.z) / max(dot(d, d), 1e-6);',
'  }',
'  float soglia = uMerge * uMergeK;',
/* I PALLINI AL CENTRO — perche' c\'erano.
   Il campo va come 1/d²: vicino al centro di una goccia cambia di migliaia
   per pixel, quindi fwidth() esplode. Con una larghezza piu' grande del
   campo stesso, smoothstep(s-w, s+w, campo) torna circa 0.5 anche dove il
   campo e' enorme: un disco a meta' tinta esattamente sul centro. Bastava
   mettere un tetto alla larghezza. */
'  #ifdef HAS_DERIV',
'    float w = clamp(fwidth(field) * uEdge, 1e-5, soglia * 0.55);',
'    float mask = smoothstep(soglia - w, soglia + w, field);',
'  #else',
'    float mask = smoothstep(soglia * 0.97, soglia * 1.03, field);',
'  #endif',
/* Il taglio e' quasi netto, e deve esserlo. Una sfumatura larga cade sul
   girato scuro e li' l'inversione a meta' strada da' un grigio, che sotto la
   tinta diventa una fascia azzurra per tutta la larghezza dello schermo. Il
   confine e' anche il punto in cui il contenuto sotto cambia di netto — dal
   video alla carta — quindi un taglio secco non si vede. */
'  if (uSotto >= 0.0) mask *= smoothstep(uSotto + 0.004, uSotto - 0.004, p.y);',
'  gl_FragColor = vec4(uInk * mask, 1.0);',   /* fuori = nero = neutro */
'}'].join('\n');
}

function rgb(h){
  var v = parseInt(h.slice(1), 16);
  return [(v>>16&255)/255, (v>>8&255)/255, (v&255)/255];
}

/* --- un livello = un canvas + un contesto ------------------------------- */
function livello(canvas, inkHex, bordo, soglia, sotto){
  var gl = null;
  try {
    gl = canvas.getContext('webgl', { antialias:false, alpha:false })
      || canvas.getContext('experimental-webgl', { antialias:false, alpha:false });
  } catch(e){ gl = null; }
  if (!gl) return null;

  var deriv = !!gl.getExtension('OES_standard_derivatives');
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

  var prog = null, U = {}, ink = rgb(inkHex);

  function compila(tipo, src){
    var s = gl.createShader(tipo);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
      console.error(gl.getShaderInfoLog(s)); return null;
    }
    return s;
  }

  return {
    /* COUNT e' costante di compilazione in WebGL 1: cambiare il numero di
       gocce vuol dire ricompilare il programma */
    conta: function(n){
      var vs = compila(gl.VERTEX_SHADER, VERT);
      var fs = compila(gl.FRAGMENT_SHADER, frag(n, deriv));
      if (!vs || !fs) return;
      var p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)){
        console.error(gl.getProgramInfoLog(p)); return;
      }
      if (prog) gl.deleteProgram(prog);
      prog = p; gl.useProgram(prog);
      var loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      U = {};
      ['uBlobs','uRes','uAspect','uTime','uMerge','uWarp','uWarpScale','uInk','uEdge','uMergeK','uSotto']
        .forEach(function(k){ U[k] = gl.getUniformLocation(prog, k); });
    },
    tinta: function(hex){ ink = rgb(hex); },
    misura: function(w, h){ canvas.width = w; canvas.height = h; gl.viewport(0,0,w,h); },
    /* `velo` da 0 a 1: moltiplica l'inchiostro. A zero l'inchiostro e' nero,
       cioe' neutro, cioe' l'effetto non c'e' — e la dissolvenza e' gratis. */
    disegna: function(data, W, H, A, orologio, velo){
      if (!prog) return;
      gl.useProgram(prog);
      gl.uniform4fv(U.uBlobs, data);
      gl.uniform2f(U.uRes, W, H);
      gl.uniform1f(U.uAspect, A);
      gl.uniform1f(U.uTime, orologio);
      gl.uniform1f(U.uMerge, CONFIG.merge);
      var massa = CONFIG._massa;
      gl.uniform1f(U.uWarp,      massa ? CONFIG.massaWarp * CONFIG._gonfio : CONFIG.warp);
      gl.uniform1f(U.uWarpScale, massa ? CONFIG.massaWarpScale : CONFIG.warpScale);
      gl.uniform1f(U.uEdge, bordo());
      gl.uniform1f(U.uMergeK, soglia());
      gl.uniform1f(U.uSotto, sotto ? sotto() : -1);
      gl.uniform3f(U.uInk, ink[0]*velo, ink[1]*velo, ink[2]*velo);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  };
}

/* --- il motore ----------------------------------------------------------- */
function monta(opz){
  var cInv = opz.invert, cTin = opz.tint, palco = opz.palco;
  /* L'inversione si ferma al confine; la tinta vale dappertutto. E' questa
     riga a decidere di che colore si vede la massa sul girato: senza il
     freno, sul fondo scuro l'inversione la fa bianca. */
  var lInv = livello(cInv, '#ffffff',
        function(){ return CONFIG.edgeInvert; }, function(){ return CONFIG.mergeInvert; },
        function(){ return CONFIG._sotto === undefined ? -1 : CONFIG._sotto; });
  var lTin = cTin ? livello(cTin, CONFIG.tint,
        function(){ return CONFIG.edgeTint; }, function(){ return CONFIG.mergeTint; }) : null;
  if (!lInv) return null;          /* niente WebGL: i canvas restano vuoti */

  var CALMO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stretto = window.innerWidth < 700;
  if (stretto){ CONFIG.count = 26; CONFIG.sizeMax = 0.046; }

  var TAU = Math.PI*2;
  var caso = function(a,b){ return a + Math.random()*(b-a); };
  var clamp01 = function(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); };
  var A = 1, gocce = [], data = null, legato = null, eta = null;
  var W = 0, H = 0, clock = 0, warp = 0, vita = 0;
  var velo = 0, obiettivo = 0, acceso = false, vista = true, seminate = false;
  var modo = 'gocce', bordoT = 1.2, diss = 0, gonfio = 0;

  function raggioDi(t){ var M = CONFIG.sizeMax, m = M*CONFIG.spread; return m + t*(M-m); }
  function limite(r){ var M = Math.max(CONFIG.sizeMax,1e-4); return CONFIG.speed*(r*r)/(M*M); }
  function massa(r){ var M = Math.max(CONFIG.sizeMax,1e-4); return Math.max(MASS_MIN, Math.pow(r/M,3)); }

  function nuova(alBordo){
    var t = Math.random(), r = raggioDi(t);
    return {
      sizeT: t, X: caso(0,A),
      Y: alBordo ? (CONFIG.direction > 0 ? -0.25 : 1.25) : caso(-0.2,1.2),
      vX: 0, vY: limite(r)*CONFIG.direction,
      r0: r, r: r, age: 0, life: caso(22,55),
      fase: Math.random()*TAU, freq: caso(0.05,0.18)
    };
  }

  function conta(n){
    if (n < gocce.length) gocce.length = n;
    else while (gocce.length < n) gocce.push(nuova(false));
    data = new Float32Array(n*4);
    legato = new Uint8Array(n*n);
    eta = new Float32Array(n*n);
    lInv.conta(n);
    if (lTin) lTin.conta(n);
  }

  /* Sparpagliate dal bordo d'ingresso fino a poco oltre meta' schermo, e
     tutte con eta' diverse. Cosi' quando il velo si alza il campo si forma
     poco per volta invece di comparire fatto, e non si aspetta un minuto che
     le piu' piccole arrivino: con la legge di Stokes viaggiano a un quinto
     delle grandi. */
  function semina(){
    var d = CONFIG.direction;
    for (var i=0;i<gocce.length;i++){
      var g = gocce[i];
      g.X = caso(0,A);
      var t = Math.pow(Math.random(), 1.7);        /* denso vicino al bordo */
      g.Y = d > 0 ? caso(-0.9, 0.55) * (1-t) + (-0.9)*t
                  : caso(0.45, 1.9)  * (1-t) + ( 1.9)*t;
      g.vX = 0; g.vY = limite(g.r)*d;
      g.age = caso(0, g.life*0.5);
    }
    legato.fill(0); eta.fill(0);
    seminate = true;
  }

  function passo(h){
    var n = gocce.length, i, j;
    for (i=0;i<n;i++){
      var a = gocce[i]; if (a.r <= 0) continue;
      for (j=i+1;j<n;j++){
        var b = gocce[j]; if (b.r <= 0) continue;
        var dx = b.X-a.X, dy = b.Y-a.Y, d2 = dx*dx+dy*dy;
        var somma = a.r+b.r, portata = somma*REACH;
        var k = i*n+j;
        if (d2 > portata*portata){ legato[k]=0; eta[k]=0; continue; }
        var dist = Math.max(Math.sqrt(d2),1e-5);
        var nx = dx/dist, ny = dy/dist, s = dist/somma;
        var mA = massa(a.r), mB = massa(b.r);

        /* La forza DEVE essere continua: un gradino qui produce una
           vibrazione ad alta frequenza attorno al confine. */
        var f;
        if (s < CORE){ var t = 1 - s/CORE; f = CONFIG.repulsion*t*t; }
        else { var u = (s-CORE)/(REACH-CORE); f = -CONFIG.cohesion*Math.sin(Math.PI*u); }

        var vrel = (b.vX-a.vX)*nx + (b.vY-a.vY)*ny;
        var smorza = -CONFIG.damping*vrel*(1-s/REACH);
        var accA = (-f - smorza)*h, accB = (f + smorza)*h;
        a.vX += nx*accA/mA; a.vY += ny*accA/mA;
        b.vX += nx*accB/mB; b.vY += ny*accB/mB;

        /* legame con isteresi: si forma sotto FORM, si spezza sopra BREAK */
        var era = legato[k];
        var ora = era ? (s < BREAK) : (s < FORM);
        if (era && ora) eta[k] += h;
        if (era && !ora){
          if (eta[k] > MIN_BOND){
            var imp = CONFIG.snap;
            a.vX -= nx*imp/mA; a.vY -= ny*imp/mA;
            b.vX += nx*imp/mB; b.vY += ny*imp/mB;
          }
          eta[k] = 0;
        }
        if (!era && ora) eta[k] = 0;
        legato[k] = ora ? 1 : 0;
      }
    }

    /* rilassamento esponenziale: stabile a qualunque passo */
    var relax = 1 - Math.exp(-h/Math.max(CONFIG.viscosity,0.02));
    var vMax = CONFIG.speed*6 + 0.10;
    for (i=0;i<n;i++){
      var g = gocce[i];
      var tY = limite(g.r)*CONFIG.direction;
      var tX = Math.sin(clock*g.freq*TAU + g.fase)*CONFIG.sway;
      g.vY += (tY-g.vY)*relax;
      g.vX += (tX-g.vX)*relax;
      var sp = Math.sqrt(g.vX*g.vX + g.vY*g.vY);
      if (sp > vMax){ g.vX *= vMax/sp; g.vY *= vMax/sp; }
      g.X += g.vX*h; g.Y += g.vY*h;
      if (g.X < g.r*0.4)     { g.X = g.r*0.4;     g.vX =  Math.abs(g.vX)*0.3; }
      if (g.X > A - g.r*0.4) { g.X = A - g.r*0.4; g.vX = -Math.abs(g.vX)*0.3; }
    }
  }

  function ricicla(dt){
    var n = gocce.length;
    for (var i=0;i<n;i++){
      var g = gocce[i]; g.age += dt;
      if (g.age >= g.life || g.Y > 1.4 || g.Y < -0.4){
        gocce[i] = nuova(true);
        for (var j=0;j<n;j++){ legato[i*n+j]=0; legato[j*n+i]=0; eta[i*n+j]=0; eta[j*n+i]=0; }
      }
    }
  }

  /* il raggio si ricalcola ogni frame dalla taglia relativa: cosi' cambiare
     sizeMax o spread a runtime agisce subito su tutte */
  function raggi(){
    for (var i=0;i<gocce.length;i++){
      var g = gocce[i];
      g.r0 = raggioDi(g.sizeT);
      var resta = g.life - g.age;
      g.r = g.r0 * (resta < 3 ? Math.max(0, resta/3) : 1);
    }
  }

  /* --- la massa -----------------------------------------------------------
     Una griglia di gocce grandi abbastanza da fondersi, appoggiata al confine
     fra due sezioni. `bordoT` e' la posizione del confine come frazione
     dall'alto del viewport; `diss` da 0 a 1 e' quanto si e' sciolta.
     Le irregolarita' sono deterministiche (seno dell'indice): la massa deve
     essere identica a ogni frame, se no vibra invece di stare ferma. */
  function disponiMassa(bordoT, diss){
    var n = gocce.length;
    /* Il gonfiore. Da lui dipende TUTTO quello che rende la massa una massa e
       non una cupola: l'altezza della cresta, i bitorzoli, e l'ampiezza del
       domain warp nello shader. Quando partiva da zero, a pagina ferma non ne
       restava niente — un mezzo cerchio liscio. Adesso parte da meta': la
       massa e' gia' viva prima che la si guardi, e cresce mentre il confine
       sale. */
    gonfio = 0.5 + 0.5*clamp01((1.02 - bordoT) / 0.34);
    /* Quanto sta sotto il bordo basso dello schermo a pagina ferma. Era 0.34,
       cioe' tutta nascosta: la cupola si mangiava il nome in copertina, e
       allora era un difetto. Adesso e' voluto — la massa deve sfociare un po'
       sopra il nome — quindi si alza, ma non tanto da coprirlo: il nome ci
       sta DENTRO, e siccome sopra il confine c'e' la sola tinta, resta
       bianco sul blu. */
    /* Il termine con A e' un correttivo di forma, non un gusto. Lo spazio e'
       isotropo — X da 0 ad A, Y da 0 a 1 — quindi su uno schermo largo le
       gocce della griglia vengono piu' grandi IN ALTEZZE DI SCHERMO, e la
       stessa massa monta molto piu' su: in verticale il bordo arrivava sopra
       il nome, in orizzontale a meta' schermo. Si spinge giu' di quanto e'
       larga. Vale solo a riposo: appena il confine sale, gonfio va a 1 e la
       massa deve poter allagare "Ascolta" come prima. */
    var giu = (1 - gonfio) * (0.19 + Math.max(0, A - 0.62)*0.60);
    var nCre = Math.max(4, Math.round(n * CONFIG.crestaQuota));
    var nCor = n - nCre;

    /* la cresta: un filo di gocce piccole lungo il confine, sfalsate in alto
       e in basso. E' quello che si legge come profilo della massa. */
    var passo = A / nCre;
    var rCre = passo * CONFIG.crestaR;

    /* il corpo: griglia sotto il confine, gocce grandi che si fondono */
    var cella = nCor > 0 ? Math.sqrt(A * CONFIG.massaGiu / nCor) : passo;
    var col = Math.max(2, Math.round(A / cella));
    var rig = Math.max(1, Math.ceil(nCor / col));
    var cellaX = A / col, cellaY = CONFIG.massaGiu / rig;
    var rCor = cella * CONFIG.massaR;

    /* LA VITA DELLA MASSA
       La massa sta ferma, ma non e' morta: ogni goccia fa un giro
       lentissimo, e le tre frequenze non sono multiple una dell'altra —
       quindi il profilo non torna mai uguale e non si sente un ritmo. Un
       giro completo del piu' veloce dei tre e' un minuto abbondante.
       Non e' rumore vero e non usa Math.random: la massa deve essere la
       stessa a ogni fotogramma per lo stesso istante, se no vibra invece di
       muoversi. */
    var v = vita * 0.16;

    for (var i=0;i<n;i++){
      var g = gocce[i];
      var jx = Math.sin(i*12.9898 + 1.7) * .5 + .5;
      var jy = Math.sin(i*78.2330 + 4.1) * .5 + .5;
      var jz = Math.sin(i*45.1640 + 9.3) * .5 + .5;
      var respiro = 1 + 0.11*Math.sin(v*0.83 + i*3.11);
      var x, t, raggio;

      if (i < nCre){
        x = (i + .5) * passo + (jx-.5) * passo * .35
          + Math.sin(v*0.63 + i*2.39) * passo * 0.30;
        t = bordoT + giu - CONFIG.crestaSu*gonfio
          + (jy-.5) * CONFIG.crestaOnda * 2 * gonfio
          + Math.sin(v*0.41 + i*1.77) * CONFIG.crestaOnda * 0.6;
        raggio = rCre * (0.78 + jz*0.5) * respiro;
      } else {
        var k = i - nCre, c = k % col, r = (k / col) | 0;
        x = (c + .5) * cellaX + (jx-.5) * cella * .3
          + Math.sin(v*0.52 + i*1.31) * cella * 0.16;
        /* il corpo parte sotto al confine di un raggio abbondante: se no e'
           lui, non la cresta, a sporgere sopra, e viene una cupola liscia */
        t = bordoT + giu + rCor*1.25 + (r + .5) * cellaY * .88 + (jy-.5) * cella * .3;
        raggio = rCor * (0.86 + jz*0.28) * respiro;
      }

      /* sciogliendosi salgono, si sparpagliano e rimpiccioliscono: la massa
         si scompone in gocce invece di svanire tutta insieme */
      t -= diss * (0.35 + jz*1.15);
      x += (jx - .5) * diss * A * .55;

      g.X = x;
      g.Y = 1 - t;                 /* nello shader la y cresce verso l'alto */
      g.r = raggio * (1 - diss*.42);
    }
  }

  function scrivi(){
    for (var i=0;i<gocce.length;i++){
      var g = gocce[i];
      var sp = Math.min(1, Math.abs(g.vY)/Math.max(CONFIG.speed,1e-4));
      data[i*4]   = g.X/A;
      data[i*4+1] = g.Y;
      data[i*4+2] = Math.max(g.r,0);
      data[i*4+3] = 1 + CONFIG.stretch*sp;
    }
  }

  function misura(){
    var dpr = Math.min(window.devicePixelRatio || 1, stretto ? 1.5 : 2);
    W = Math.round(window.innerWidth*dpr);
    H = Math.round(window.innerHeight*dpr);
    lInv.misura(W,H);
    if (lTin) lTin.misura(W,H);
    var nuovoA = W/H;
    if (gocce.length && A > 0){ var s = nuovoA/A; for (var i=0;i<gocce.length;i++) gocce[i].X *= s; }
    A = nuovoA;
  }

  misura();
  conta(CONFIG.count);
  window.addEventListener('resize', misura);

  /* si mette in pausa fuori dallo schermo e a scheda nascosta */
  if (palco && window.IntersectionObserver){
    new IntersectionObserver(function(v){ vista = v[0].isIntersecting; }, {threshold:0})
      .observe(palco);
  }
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) ultimo = performance.now();
  });

  /* riscaldamento: la simulazione parte gia' assestata */
  for (var w=0; w<300; w++){ clock += SUBSTEP; raggi(); passo(SUBSTEP); }
  semina();
  raggi(); scrivi();

  var ultimo = performance.now();

  function giro(ora){
    requestAnimationFrame(giro);
    var dt = Math.min((ora-ultimo)/1000, 1/30); ultimo = ora;

    velo += (obiettivo - velo) * (obiettivo > velo ? CONFIG.fadeIn : CONFIG.fadeOut);
    if (Math.abs(obiettivo - velo) < .002) velo = obiettivo;

    /* fermo e invisibile: non si disegna nemmeno */
    if (velo < .002 && modo !== 'massa') return;
    if (document.hidden || !vista) return;

    if (modo === 'massa'){
      /* l'orologio lento della massa: e' l'unica cosa che si muove quando la
         pagina sta ferma */
      vita += dt;
      disponiMassa(bordoT, diss);
      CONFIG._gonfio = 0.18 + gonfio*0.82;
      scrivi();
      lInv.disegna(data, W, H, A, warp, velo);
      if (lTin && CONFIG.mode === 'tinta') lTin.disegna(data, W, H, A, warp, velo);
      warp += dt*CONFIG.warpSpeed;
      return;
    }

    raggi();
    if (acceso && !CALMO){
      clock += dt; warp += dt*CONFIG.warpSpeed;
      ricicla(dt);
      var sub = Math.max(1, Math.ceil(dt*90)), h = dt/sub;
      for (var s=0;s<sub;s++) passo(h);
    }
    scrivi();

    lInv.disegna(data, W, H, A, warp, velo);
    if (lTin && CONFIG.mode === 'tinta') lTin.disegna(data, W, H, A, warp, velo);
  }
  requestAnimationFrame(giro);

  return {
    CONFIG: CONFIG,
    /* v da 0 a 1: sotto una certa soglia il motore si ferma del tutto */
    livello: function(v){
      obiettivo = v < 0 ? 0 : (v > 1 ? 1 : v);
      if (obiettivo > 0){
        /* SOLO alla transizione. Rimettere l'orologio a ogni chiamata voleva
           dire azzerare il dt a ogni evento di scroll — e siccome la soglia
           si ricontrolla mentre si scorre, la simulazione si fermava proprio
           mentre la si guardava scorrere. */
        if (!acceso){
          if (!seminate) semina();
          ultimo = performance.now();
          acceso = true;
        }
      } else {
        acceso = false;
      }
    },
    semina: semina,
    /* bordo: dove sta il confine, frazione dall'alto del viewport.
       diss:  0 massa compatta · 1 sciolta e sparita. */
    massa: function(bordo, dissoluzione){
      modo = 'massa';
      CONFIG._massa = true;
      bordoT = bordo;
      /* l'inversione arriva fino al confine e non oltre: sopra c'e' il
         girato scuro, e li' la sola tinta in `screen` da' il blu invece del
         bianco. In quota di schermo dal fondo, che e' come la vede lo
         shader. */
      CONFIG._sotto = clamp01(1 - bordo);
      diss = clamp01(dissoluzione);
      acceso = true;
      /* l'inchiostro si spegne solo sul finale dello scioglimento */
      obiettivo = 1 - Math.max(0, (diss - .72) / .28);
      velo = obiettivo;
    }
  };
}

return { CONFIG: CONFIG, monta: monta };
})();
