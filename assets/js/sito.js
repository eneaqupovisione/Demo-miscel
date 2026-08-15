/* ===========================================================================
   MICHELLE — comportamento.

   Niente librerie: tutto quello che c'e' qui e' scroll, IntersectionObserver
   e un paio di canvas. Il sito si guarda dal telefono, quindi ogni effetto ha
   una via d'uscita: se il dispositivo e' lento o l'utente ha chiesto meno
   movimento, l'effetto si toglie e il contenuto resta.

   ---------------------------------------------------------------------------
   DATI — l'unico punto da toccare per mettere i contenuti veri.
   Tutto quello che qui sotto e' segnato PROVVISORIO va sostituito prima di
   pubblicare: titoli, anni, indirizzi e link. Gli indirizzi finiscono in
   `.example`, che e' un dominio riservato e non consegna: nessuna mail
   scritta oggi puo' partire per sbaglio verso qualcuno.
   =========================================================================== */
var DATI = {
  nome: 'Michelle',

  /* PROVVISORIO — indirizzi */
  booking:    'booking@michelle.example',
  management: 'management@michelle.example',
  stampa:     'press@michelle.example',

  /* PROVVISORIO — uscite: titolo, riga di servizio, link alla pagina d'ascolto */
  uscite: [
    { n:'01', t:'Apnea',   meta:'2026 · Singolo', href:'#' },
    { n:'02', t:'Vetro',   meta:'2025 · EP',      href:'#' },
    { n:'03', t:'Michelle',meta:'2024 · Singolo', href:'#' }
  ],

  /* PROVVISORIO — i pulsanti-bolla sotto la copertina.
     Tre per ora: aggiungerne uno vuol dire aggiungere una riga qui, la
     griglia e il volo si adattano da soli. */
  bolle: [
    { nm:'Spotify',   href:'#' },
    { nm:'YouTube',   href:'#' },
    { nm:'Instagram', href:'#' }
  ],

  /* PROVVISORIO — chi ha fatto il sito, in fondo */
  firma: 'Sito · da qualcuno che ascoltava',

  /* PROVVISORIO — social */
  social: [
    { nm:'Instagram', href:'#' },
    { nm:'TikTok',    href:'#' },
    { nm:'YouTube',   href:'#' }
  ],
};

/* --------------------------------------------------------------------------
   utilita'
   -------------------------------------------------------------------------- */
(function(){
'use strict';

var $  = function(s,c){ return (c||document).querySelector(s); };
var $$ = function(s,c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); };
var clamp = function(v,a,b){ return v<a?a:(v>b?b:v); };
var lerp  = function(a,b,t){ return a+(b-a)*t; };
var mappa = function(v,a,b){ return clamp((v-a)/(b-a),0,1); };
var smorza = function(t){ return t*t*(3-2*t); };

var CALMO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* La maschera montata, per chi la deve comandare da lontano: la sezione
   "Chi e'" le chiede la sparata quando il testo e' finito. */
var Mask = null;
/* clip-path: path() non c'e' ovunque. Dove manca si torna al border-radius,
   che e' piu' tondo ma vivo. */
var SUPPORTA_RITAGLIO = !!(window.CSS && CSS.supports && CSS.supports('clip-path','path("M0,0 L1,0 Z")'));
var PUNTATORE = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
/* schermi piccoli o pochi core: si tolgono le cose che costano */
var LEGGERO = (navigator.hardwareConcurrency || 4) <= 4 && !PUNTATORE;

/* La versione dei file: si legge dal ?v= del tag <script> di questa pagina.
   Serve alle immagini della sequenza, che cambiano contenuto mantenendo lo
   stesso nome — senza, il browser continua a servire i fotogrammi vecchi e
   sembra che il taglio non sia stato applicato. Alzando il ?v= in
   index.html si aggiorna tutto insieme. */
var VER = (function(){
  var t = document.querySelector('script[src*="sito.js"]');
  var m = t && t.getAttribute('src').match(/[?&]v=([^&]+)/);
  return m ? '?v=' + m[1] : '';
})();

var alFrame = (function(){
  var q = [], acceso = false;
  function giro(){
    acceso = false;
    var l = q; q = [];
    for (var i=0;i<l.length;i++) l[i]();
  }
  return function(fn){ q.push(fn); if(!acceso){ acceso = true; requestAnimationFrame(giro); } };
})();

/* --------------------------------------------------------------------------
   la misura: i testi marcati [data-adatta] toccano i due margini su qualunque
   schermo. Nessuna clamp ci arriva da sola, perche' la larghezza di una parola
   dipende da quali lettere ha dentro.
   -------------------------------------------------------------------------- */
function adattaUno(el){
  var p = el.parentElement, cs = getComputedStyle(p);
  var largo = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if (largo <= 0) return;
  el.style.fontSize = '100px';
  var w = el.scrollWidth;
  if (!w || w < 20) { el.style.fontSize = ''; return; }
  var min = parseFloat(el.getAttribute('data-min') || '18');
  var max = parseFloat(el.getAttribute('data-max') || '170');
  el.style.fontSize = clamp(100 * largo / w * .995, min, max).toFixed(2) + 'px';
}
function adattaTutti(){ $$('[data-adatta]').forEach(adattaUno); }

/* --------------------------------------------------------------------------
   caricamento
   -------------------------------------------------------------------------- */
var Loader = (function(){
  var el = $('#loader'), bar = $('#loader .lbar i'), pct = $('#lpct'), nome = $('#lnome');
  var q = 0, arrivati = 0, totale = 1, chiuso = false;

  nome.innerHTML = DATI.nome.split('').map(function(c,i){
    return '<span style="--d:'+(60+i*46)+'ms">'+c+'</span>';
  }).join('');
  adattaUno(nome);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ adattaUno(nome); });

  function disegna(){
    var t = totale ? arrivati/totale : 1;
    q = lerp(q, t, .12);
    bar.style.width = (q*100).toFixed(1)+'%';
    pct.textContent = Math.round(q*100)+'%';
    if (q < .995 || !chiuso) requestAnimationFrame(disegna);
  }
  requestAnimationFrame(disegna);

  function attendi(promesse){
    totale = promesse.length || 1;
    var fine = function(){ arrivati++; };
    promesse.forEach(function(p){ p.then(fine, fine); });
    var minimo = new Promise(function(r){ setTimeout(r, CALMO ? 300 : 1500); });
    Promise.all([minimo].concat(promesse.map(function(p){
      return p.catch(function(){});
    }))).then(chiudi);
    setTimeout(chiudi, 6000); /* rete pessima: si entra lo stesso */
  }
  function chiudi(){
    if (chiuso) return; chiuso = true;
    arrivati = totale;
    setTimeout(function(){
      el.classList.add('via');
      document.body.classList.remove('bloccato');
      document.dispatchEvent(new CustomEvent('entrati'));
    }, 260);
  }
  document.body.classList.add('bloccato');
  return { attendi: attendi };
})();

function immagine(src){
  return new Promise(function(ris,rif){
    var i = new Image();
    i.onload = function(){ ris(i); };
    i.onerror = rif;
    i.src = src;
  });
}

/* --------------------------------------------------------------------------
   avanzamento, cursore, orologio
   -------------------------------------------------------------------------- */
(function(){
  var prog = $('#prog');
  function agg(){
    var h = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.width = (h>0 ? (window.scrollY/h)*100 : 0)+'%';
  }
  window.addEventListener('scroll', function(){ alFrame(agg); }, {passive:true});
  window.addEventListener('resize', agg); agg();

  /* il marchio in testata compare quando il nome grande e' uscito di scena:
     due volte lo stesso nome sullo stesso schermo e' una ripetizione, non
     un'identita' */
  var ultimoY = 0;
  var oltre = function(){
    var y = window.scrollY;
    document.body.classList.toggle('oltre', y > window.innerHeight * .72);
    /* la testata si toglie di mezzo mentre si scende e torna appena si risale:
       su una sezione di solo testo, una barra fissa in difference finisce
       sempre addosso a una riga */
    if (Math.abs(y - ultimoY) > 6){
      document.body.classList.toggle('giu', y > ultimoY && y > window.innerHeight * .9);
      ultimoY = y;
    }
  };
  window.addEventListener('scroll', function(){ alFrame(oltre); }, {passive:true});
  oltre();
})();

if (PUNTATORE && !CALMO) (function(){
  var a = $('#cur'), b = $('#cur2'), x=0,y=0,bx=0,by=0;
  document.body.classList.add('puntatore');
  window.addEventListener('pointermove', function(e){
    x = e.clientX; y = e.clientY;
    a.style.transform = 'translate3d('+x+'px,'+y+'px,0)';
  }, {passive:true});
  (function giro(){
    bx = lerp(bx,x,.16); by = lerp(by,y,.16);
    b.style.transform = 'translate3d('+bx+'px,'+by+'px,0)';
    requestAnimationFrame(giro);
  })();
  document.addEventListener('pointerover', function(e){
    var t = e.target.closest('a,button');
    b.classList.toggle('grande', !!t);
  });
})();

/* l'orologio in testata non c'e' piu': diceva l'ora, che il telefono dice
   gia' due centimetri piu' su */
$('#anno').textContent = new Date().getFullYear();

/* --------------------------------------------------------------------------
   menu
   -------------------------------------------------------------------------- */
(function(){
  var menu = $('#menu'), apri = $('#apri'), chiudi = $('#chiudi');
  function stato(on){
    menu.classList.toggle('on', on);
    menu.setAttribute('aria-hidden', String(!on));
    apri.setAttribute('aria-expanded', String(on));
    document.body.classList.toggle('bloccato', on);
  }
  /* tutte le voci alla stessa misura, decisa dalla piu' lunga: cosi' il menu
     tocca i due margini senza che nessuna parola resti tagliata */
  var voci = $$('#menu nav a');
  function misuraMenu(){
    var nav = $('#menu nav'), largo = nav.clientWidth;
    if (!largo) return;
    voci.forEach(function(a){ a.style.fontSize = '100px'; });
    var max = 0;
    voci.forEach(function(a){ max = Math.max(max, a.scrollWidth); });
    if (!max) return;
    var fs = Math.min(100 * largo / max * .995, 88).toFixed(2) + 'px';
    voci.forEach(function(a){ a.style.fontSize = fs; });
  }
  misuraMenu();
  window.addEventListener('resize', function(){ alFrame(misuraMenu); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(misuraMenu);

  apri.addEventListener('click', function(){ misuraMenu(); stato(true); });
  chiudi.addEventListener('click', function(){ stato(false); });
  $$('#menu nav a').forEach(function(a){ a.addEventListener('click', function(){ stato(false); }); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') stato(false); });
})();

/* --------------------------------------------------------------------------
   comparse allo scroll + glitch
   -------------------------------------------------------------------------- */
(function(){
  /* le frasi marcate si spezzano in parole: ognuna entra con il suo ritardo */
  $$('[data-parole]').forEach(function(el){
    var html = el.innerHTML;
    var pezzi = html.split(/(<em>.*?<\/em>|\s+)/g).filter(function(s){ return s && s.trim(); });
    var i = 0;
    el.innerHTML = pezzi.map(function(p){
      var d = (i++)*44;
      return '<span class="rev-p" style="--d:'+d+'ms">'+p+'</span>';
    }).join(' ');
  });

  var oss = new IntersectionObserver(function(vs){
    vs.forEach(function(v){
      if (!v.isIntersecting) return;
      v.target.classList.add('on');
      $$('.rev-p', v.target).forEach(function(p){ p.classList.add('on'); });
      var g = v.target.matches('.gx') ? [v.target] : $$('.gx', v.target);
      g.forEach(function(x){
        setTimeout(function(){
          x.classList.add('scatta');
          setTimeout(function(){ x.classList.remove('scatta'); }, 1400);
        }, 220);
      });
      oss.unobserve(v.target);
    });
  }, { threshold: .22, rootMargin: '0px 0px -8% 0px' });

  $$('.rev, [data-parole], h2.tit').forEach(function(el){ oss.observe(el); });

  /* micro-scatto casuale su un titolo, ogni tanto: la pagina non sta ferma */
  if (!CALMO) setInterval(function(){
    var g = $$('.gx').filter(function(x){
      var r = x.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    if (!g.length) return;
    var x = g[(Math.random()*g.length)|0];
    x.classList.add('scatta');
    setTimeout(function(){ x.classList.remove('scatta'); }, 900);
  }, 5200);
})();

/* --------------------------------------------------------------------------
   la forma dei pulsanti-bolla: UNA metaball sola

   La matematica e' quella delle gocce (`blob-mask-spec.md` §5), ridotta al
   caso di una metaball sola: il punto del contorno viene spostato dal rumore
   PRIMA di essere misurato, quindi l'irregolarita' non viene dalla geometria
   ma dal campo. Con una metaball sola quello spostamento si riduce a una
   variazione del raggio lungo il giro, e si puo' fare in JS senza WebGL.

   Due regole tengono in piedi il movimento, ed erano le due cose sbagliate
   nella versione a fotogrammi chiave che c'era prima:

   · lo spostamento va sempre verso FUORI. Il raggio di base non scende mai
     sotto `NUCLEO` e cresce mentre la bolla sale: una bolla si gonfia, si
     allunga verso una vicina, si smuove — non si stringe mai da sola.
   · il rumore si campiona nello spazio della PAGINA, non della bolla. Il
     profilo cambia perche' la bolla attraversa il campo salendo, non perche'
     scandisce un ciclo. Niente fotogrammi chiave, niente ritorno al punto di
     partenza, nessun tempo: non respira, evolve. E siccome il campo e' uno
     solo per tutte, due bolle vicine si increspano allo stesso modo — sono
     nello stesso fluido.
   -------------------------------------------------------------------------- */
var TAU = Math.PI*2;

/* value noise a tre ottave: hash21 / vnoise / fbm della specifica, tradotti
   in JS senza cambiare un numero. */
function frazione(v){ return v - Math.floor(v); }
function hash21(x, y){
  var px = frazione(x*123.34), py = frazione(y*456.21);
  var d = px*(px+45.32) + py*(py+45.32);
  px += d; py += d;
  return frazione(px*py);
}
function vnoise(x, y){
  var ix = Math.floor(x), iy = Math.floor(y);
  var fx = x-ix, fy = y-iy;
  var ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy);
  return lerp(lerp(hash21(ix,iy),   hash21(ix+1,iy),   ux),
              lerp(hash21(ix,iy+1), hash21(ix+1,iy+1), ux), uy);
}
/* riportato a [0,1]: le tre ottave da sole si fermano a 0.875 */
function fbm(x, y){
  var v = 0, a = .5;
  for (var i=0;i<3;i++){ v += a*vnoise(x,y); x = x*2.03 + 11.7; y = y*2.03 + 11.7; a *= .5; }
  return v*1.1428;
}

/* un giro di punti raccordati con delle cubiche (Catmull-Rom): la tangente
   in ogni punto guarda i due vicini, quindi il giro si chiude senza spigoli */
function orlo(pt){
  var n = pt.length;
  var d = 'M' + pt[0][0].toFixed(1) + ',' + pt[0][1].toFixed(1);
  for (var i=0;i<n;i++){
    var p0 = pt[(i-1+n)%n], p1 = pt[i], p2 = pt[(i+1)%n], p3 = pt[(i+2)%n];
    d += 'C' + (p1[0]+(p2[0]-p0[0])/6).toFixed(1) + ',' + (p1[1]+(p2[1]-p0[1])/6).toFixed(1)
       + ' '  + (p2[0]-(p3[0]-p1[0])/6).toFixed(1) + ',' + (p2[1]-(p3[1]-p1[1])/6).toFixed(1)
       + ' '  + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
  }
  return d + 'Z';
}

/* Quanti pixel vale un'unita' di rumore. Piu' e' piccolo, piu' il bordo e'
   increspato — e piu' in fretta cambia mentre la bolla sale. */
var GRANA  = 132;
var DERIVA = 0.05;          /* di quanto il campo scorre da solo, al secondo */

/* Le misure sono frazioni del LATO del riquadro: 0.5 e' il bordo esatto, e
   oltre il bordo non c'e' colore da mostrare. Sommate tutte al massimo lo
   passerebbero — capita di rado, e a tenerle dentro ci pensa il tetto
   morbido qui sotto. */
var NUCLEO = 0.235,   /* il raggio che non scende mai */
    CRESCE = 0.050,   /* di quanto si gonfia salendo */
    ONDA   = 0.160,   /* l'increspatura del campo */
    LOBO   = 0.085,   /* l'allungamento verso la vicina */
    COLLO  = 0.150,   /* la coda verso la bocca, finche' e' attaccata */
    TETTO  = 0.490;   /* il raggio che il riquadro puo' contenere */

/* Quanto e' gonfia una bolla che sta nascendo. Il volume cresce a ritmo
   costante, quindi il raggio va come la radice cubica: svelta all'inizio,
   che e' come si gonfia una bolla vera su un ugello. Non parte da zero — un
   punto di un pixel non si vede, si vede solo comparire. */
function gonfiore(nasc){ return 0.05 + 0.95*Math.pow(nasc, 0.55); }

function bordo(st, clock, tira, ang, punti){
  var w = st.s, h = st.s*1.06, pt = [], i;
  /* la nascita: tutto il raggio e' moltiplicato per quanto e' gonfia, cosi'
     la bolla cresce sul posto invece di comparire fatta */
  var g = gonfiore(st.nasc);
  /* gonfia salendo, e non torna indietro: la crescita segue il tragitto,
     non un orologio */
  var nucleo = (NUCLEO + CRESCE*smorza(st.cresc)) * g;
  /* anche l'ampiezza dell'increspatura e' rumore, non un seno: cosi' ci sono
     momenti mossi e momenti calmi, e non si sente il tempo */
  var onda = ONDA * g * (0.58 + 0.42*fbm(st.seme*7.3 + clock*0.07, st.seme*3.1 - clock*0.05));

  for (i=0;i<punti;i++){
    var a = (i/punti)*TAU, cx = Math.cos(a), cy = Math.sin(a);
    /* il punto del bordo, in unita' di rumore, nel posto in cui si trova
       davvero sulla pagina */
    var px = (st.x + cx*w*0.40)/GRANA, py = (st.y + cy*w*0.40)/GRANA;
    /* due strati che scorrono in direzioni e a velocita' diverse: non si
       riallineano mai, quindi il profilo non si ripete mai */
    var n = 0.76*fbm(px + st.seme + clock*DERIVA,      py - clock*DERIVA*0.7)
          + 0.24*fbm(px*1.8 + 19.3 - clock*DERIVA*0.5, py*1.8 + st.seme*2.7 + clock*DERIVA*0.9);
    /* il rumore da solo sta quasi sempre a meta' strada e viene fuori un
       cerchio appena ammaccato: si allarga il contrasto perche' i gonfiori
       si leggano come gonfiori. Con smorza() ai due capi la derivata e' zero,
       quindi dove il conto si appiattisce non nasce uno spigolo. */
    n = smorza(clamp((n - 0.28)/0.5, 0, 1));
    var r = nucleo + onda*n;
    /* il lobo verso la vicina: da quella parte la bolla si allunga fino a
       toccarla, dall'altra non succede niente. Cubo del coseno perche' anche
       la derivata sia zero dove il lobo finisce: un raccordo netto qui
       girerebbe attorno alla bolla come uno spigolo. */
    if (tira > 0){
      var k = Math.cos(a - ang);
      if (k > 0) r += tira*k*k*k;
    }
    /* il collo verso la bocca: una coda stretta (quinta potenza invece di
       terza) che tiene la bolla attaccata mentre si gonfia e si ritira da
       sola nei tre decimi di secondo dopo lo stacco. E' quello che si vede
       come "si e' staccata" — senza, la bolla partirebbe e basta. */
    if (st.attacco > 0){
      var kc = Math.sin(a);                   /* la bocca sta sotto: y cresce in giu' */
      if (kc > 0){ var kc2 = kc*kc; r += COLLO*st.attacco*kc2*kc2*kc*g; }
    }
    /* l'allungamento nel verso in cui va: uno strappo al distacco, e la
       coda di quello che resta della velocita'. Si allunga in verticale e si
       stringe appena in orizzontale, come fa una goccia che parte. */
    if (st.allunga > 0.002) r *= 1 + st.allunga*(cy*cy - 0.3*cx*cx);
    /* Tetto morbido. I tre contributi al massimo insieme passerebbero il
       riquadro, e li' il ritaglio taglia dritto: un lato piatto su una bolla
       si vede subito. Cosi' invece il raggio si avvicina a TETTO senza mai
       arrivarci, e nel punto di innesto la curva e la sua pendenza sono le
       stesse — non c'e' un ginocchio. */
    if (r > 0.44) r = TETTO - (TETTO-0.44)*Math.exp((0.44-r)/(TETTO-0.44));
    pt.push([ w*0.5 + cx*w*r, h*0.5 + cy*h*r ]);
  }
  return 'path("' + orlo(pt) + '")';
}

/* --------------------------------------------------------------------------
   la sequenza dell'acqua
   Sessanta fotogrammi, caricati una volta sola e disegnati da due scene
   diverse: quella del singolo e il respiro dietro a "Chi e'". Fra un
   fotogramma e il successivo si disegna anche quello dopo in trasparenza:
   e' la mezza misura che toglie lo scatto.
   -------------------------------------------------------------------------- */
var Sequenza = (function(){
  var N = 52;                 /* deve corrispondere a strumenti/media.sh */
  /* La sequenza non e' un piano unico: sono quattro stacchi rimessi in fila.
     Qui ci sono i fotogrammi in cui comincia una scena nuova, e servono a non
     sfumare fra l'ultimo fotogramma di una e il primo dell'altra: uno stacco
     sfumato non e' uno stacco, e' una pappa. */
  var TAGLI = [16, 32];
  /* la quarta scena, sott'acqua: e' la piu' calma, e fa da respiro dietro a
     "Chi e'" senza portarsi dietro gli stacchi */
  var RESPIRO = [32, N-1];
  var imgs = new Array(N), caricate = 0, chiesta = false, pronta = false;
  var attesa = [];

  function url(i){ return 'assets/media/seq/a-'+('0'+(i+1)).slice(-2)+'.webp' + VER; }

  function carica(){
    if (chiesta) return; chiesta = true;
    for (var i=0;i<N;i++){
      (function(i){
        immagine(url(i)).then(function(im){
          imgs[i] = im;
          if (++caricate >= 4 && !pronta){
            pronta = true;
            for (var k=0;k<attesa.length;k++) attesa[k]();
            attesa = [];
          }
        }, function(){ caricate++; });
      })(i);
    }
  }

  function copri(ctx, im, W, H){
    var r = Math.max(W/im.width, H/im.height);
    var w = im.width*r, h = im.height*r;
    ctx.drawImage(im, (W-w)/2, (H-h)/2, w, h);
  }

  function disegna(ctx, W, H, v, fondo, tratto){
    if (!pronta || !W) return false;
    var da = tratto ? tratto[0] : 0, a2 = tratto ? tratto[1] : N-1;
    var f = da + clamp(v,0,1) * (a2 - da);
    var i0 = Math.floor(f), t = f - i0;
    var a = imgs[i0] || imgs[0];
    var j1 = Math.min(i0+1, a2);
    var b = imgs[j1];
    if (!a) return false;
    ctx.clearRect(0,0,W,H);
    if (fondo){ ctx.fillStyle = fondo; ctx.fillRect(0,0,W,H); }
    ctx.globalAlpha = 1; copri(ctx, a, W, H);
    /* la mezza misura fra due fotogrammi, tranne che sopra a uno stacco */
    var stacco = TAGLI.indexOf(j1) >= 0;
    if (b && b !== a && t > .004 && !stacco){
      ctx.globalAlpha = t; copri(ctx, b, W, H); ctx.globalAlpha = 1;
    }
    return true;
  }

  return {
    N: N,
    RESPIRO: RESPIRO,
    carica: carica,
    disegna: disegna,
    quandoPronta: function(fn){ if (pronta) fn(); else attesa.push(fn); }
  };
})();

/* --------------------------------------------------------------------------
   copertina
   -------------------------------------------------------------------------- */
(function(){
  var cop = $('#cop'), nome = $('#nome'), video = $('#vCop');

  nome.innerHTML = DATI.nome.split('').map(function(c,i){
    return '<span class="l" style="--d:'+(i*52)+'ms">'+c+'</span>';
  }).join('');

  /* l'autoplay puo' essere negato (risparmio energetico, impostazioni): si
     ritenta, e comunque al primo tocco riparte */
  var prove = 0;
  function parti(){
    var p = video.play();
    if (p && p.catch) p.catch(function(){ if (prove++ < 6) setTimeout(parti, 400); });
  }
  document.addEventListener('entrati', function(){ cop.classList.add('pronta'); parti(); });
  document.addEventListener('pointerdown', function(){
    if (video.paused && !document.hidden) { prove = 0; parti(); }
  }, {passive:true});
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden && video.paused){ prove = 0; parti(); }
  });

  /* parallasse leggera: il video scende meno della pagina */
  if (!CALMO){
    var med = $('#cop .med');
    window.addEventListener('scroll', function(){
      alFrame(function(){
        var y = window.scrollY;
        if (y > window.innerHeight*1.2) return;
        med.style.transform = 'translate3d(0,'+(y*.22).toFixed(1)+'px,0) scale('+(1+y/window.innerHeight*.08).toFixed(3)+')';
      });
    }, {passive:true});
  }

  /* lo scioglimento: si tocca il nome e la tipografia si liquefa un istante */
  if (!CALMO){
    var disp = document.getElementById('scD');
    var acceso = false;
    nome.style.cursor = 'pointer';
    nome.addEventListener('pointerdown', function(){
      if (acceso) return; acceso = true;
      var t0 = performance.now(), durata = 900;
      nome.style.filter = 'url(#sciogli)';
      (function giro(t){
        var k = (t - t0)/durata;
        if (k >= 1){ disp.setAttribute('scale','0'); nome.style.filter=''; acceso=false; return; }
        var s = Math.sin(k*Math.PI);
        disp.setAttribute('scale', (s*34).toFixed(1));
        requestAnimationFrame(giro);
      })(t0);
    });
  }
})();

/* --------------------------------------------------------------------------
   chi e': le parole si scrivono scendendo, sopra alla scena

   Tre cose, e ognuna risponde a un perche'.

   · OGNI PAROLA SI SCRIVE QUANDO ARRIVA AL SUO POSTO SULLO SCHERMO, non a un
     tempo e non a una percentuale della sezione. Scendere e' scrivere, e chi
     risale la vede tornare indietro. Con un ciclo unico sulla traversata un
     blocco piu' alto dello schermo si scriverebbe per meta' sotto al bordo,
     cioe' senza farsi vedere.

   · UNA ALLA VOLTA DAVVERO. Le parole della stessa riga si dividono la fascia
     in fette che non si sovrappongono. Le righe non stanno nel markup: si
     ricavano dalle posizioni vere dopo l'impaginazione, perche' il testo va a
     capo dove vuole e dipende dalle misure.

   · LE MISURE SONO IRREGOLARI, anche fra parole vicine, e stanno nel copione
     e non nel markup: sono una proprieta' della composizione, non del
     contenuto. Cambiare il testo le ridistribuisce da solo.
   -------------------------------------------------------------------------- */
(function(){
  var sez = $('#chi'); if (!sez) return;
  var dire = $('[data-scrive]', sez);
  var scena = $('.scena', sez);
  var video = $('#vChi', sez);

  /* Le parole sono gia' nel markup, una per <i>, con la loro misura e il loro
     colore: sono una lettura del testo e stanno col testo. Qui si raccolgono
     e basta. */
  var parole = $$('i', dire);

  var posti = [];
  /* BASSO e' la quota dello schermo dove una riga comincia a scriversi, RIGA
     quanta strada le serve per finire. RIGA va tenuta corta: se una riga ci
     mette piu' di quanto sia alta, quella sotto entra nella fascia mentre la
     prima sta ancora scrivendo, e tornano a scriversi in due posti insieme. */
  var BASSO = 0.74, RIGA = 0.05;

  function misura(){
    var largo = dire.clientWidth;
    if (!largo) return;
    /* La misura la da' la classe nel markup — e' una lettura del testo. Qui
       si interviene su un caso solo: una parola piu' larga della colonna
       sborderebbe, e allora si rimpicciolisce quanto basta. E' l'unico posto
       dove il codice ha l'ultima parola sulla composizione, e succede solo
       agli schermi piu' stretti. */
    for (var i=0;i<parole.length;i++){
      parole[i].style.fontSize = '';
      var w = parole[i].scrollWidth;
      if (w > largo){
        var base = parseFloat(getComputedStyle(parole[i]).fontSize);
        parole[i].style.fontSize = (base * largo / w * 0.98).toFixed(2) + 'px';
      }
    }
    /* le righe vere, dopo l'impaginazione: si raggruppa per quota */
    posti = [];
    var righe = [], ultima = -1e9, gruppo = null;
    for (i=0;i<parole.length;i++){
      var r = parole[i].getBoundingClientRect();
      if (r.top - ultima > 4){ gruppo = []; righe.push(gruppo); ultima = r.top; }
      gruppo.push(i);
      posti.push({ y: r.top + r.height*0.5 + window.scrollY, da:0, a:0 });
    }
    righe.forEach(function(g){
      g.forEach(function(idx, j){
        posti[idx].da = BASSO - (j    / g.length) * RIGA;
        posti[idx].a  = BASSO - ((j+1)/ g.length) * RIGA;
      });
    });
  }

  var acceso = false;
  function scrivi(){
    if (!posti.length) return;
    var vh = window.innerHeight, sy = window.scrollY, scritte = 0;
    for (var i=0;i<parole.length;i++){
      var y = (posti[i].y - sy) / vh;
      var k = CALMO ? 1 : smorza(mappa(y, posti[i].da, posti[i].a));
      parole[i].style.clipPath = 'inset(0 ' + ((1-k)*100).toFixed(1) + '% 0 0)';
      if (k > .5) scritte++;
    }
    /* LA SCENA NON C'E' DA SUBITO: entra quando un quinto delle parole e'
       passato. Prima si legge, poi si alza il sipario — se ci fosse gia', la
       prima cosa che si vede sarebbe lei e le parole sarebbero una didascalia. */
    var q = scritte / parole.length;
    if (video) video.style.opacity = mappa(q, 0.16, 0.40).toFixed(3);
    if (video && !acceso && q > 0.10){ acceso = true; var pr = video.play(); if (pr && pr.catch) pr.catch(function(){}); }
  }

  misura(); scrivi();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ misura(); scrivi(); });
  window.addEventListener('resize', function(){ alFrame(function(){ misura(); scrivi(); }); });
  window.addEventListener('scroll', function(){ alFrame(scrivi); }, {passive:true});
  document.addEventListener('entrati', function(){ misura(); scrivi(); });
})();

/* --------------------------------------------------------------------------
   la banda di "Ascolta"
   Scorre di lato mentre la sezione arriva. Quando ha finito la corsa il blu
   si spegne e passa alle uscite — la riga al centro si accende come prima —
   e la banda continua ad andare avanti e indietro, ma nel colore della carta.
   -------------------------------------------------------------------------- */
(function(){
  var banda = $('#banda'); if (!banda) return;
  var scorre = $('.scorre', banda);
  var corsa = 0, pT = 0, p = 0, dentro = false, finita = false, ondeggio = 0;

  function misura(){
    /* la corsa e' una copia sola: le altre servono a coprire il vuoto mentre
       la prima esce di lato */
    var uno = scorre.firstElementChild;
    corsa = uno ? uno.getBoundingClientRect().width + parseFloat(getComputedStyle(scorre).gap || 0) : 0;
  }
  function daScroll(){
    var r = banda.getBoundingClientRect(), vh = window.innerHeight;
    /* 0 quando la banda entra dal basso, 1 quando ha attraversato mezzo
       schermo: la corsa finisce mentre la si sta guardando, non dopo */
    pT = clamp((vh - r.top) / (vh * 0.62), 0, 1);
    dentro = r.top < vh && r.bottom > 0;
  }
  (function giro(ora){
    requestAnimationFrame(giro);
    if (!dentro) return;
    p += (pT - p) * (CALMO ? 1 : .08);
    if (!finita && p > .985){
      finita = true;
      banda.classList.add('spenta');
    }
    var x;
    if (!finita){
      x = -corsa * p;
    } else {
      /* avanti e indietro, piano: un seno lentissimo, che non torna mai
         esattamente sullo stesso punto perche' parte da dove si e' fermata */
      ondeggio += 0.0035;
      x = -corsa * (0.5 + 0.5*Math.sin(ondeggio - Math.PI/2));
    }
    scorre.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
  })();

  window.addEventListener('scroll', function(){ alFrame(daScroll); }, {passive:true});
  window.addEventListener('resize', function(){ alFrame(function(){ misura(); daScroll(); }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(misura);
  document.addEventListener('entrati', function(){ misura(); daScroll(); });
  misura(); daScroll();
})();

/* --------------------------------------------------------------------------
   la firma: le gocce salgono, si fermano in alto e riempiono lo schermo
   Il testo sotto e' nero su carta e non cambia colore da solo: dentro al blu
   si legge bianco perche' la maschera lo inverte.
   -------------------------------------------------------------------------- */
(function(){
  var sez = $('#firma'); if (!sez) return;
  var v = 0, dentro = false;
  function daScroll(){
    var r = sez.getBoundingClientRect(), vh = window.innerHeight;
    /* 0 quando la sezione arriva, 1 quando ha finito di attraversare */
    v = clamp(-r.top / Math.max(r.height - vh, 1), 0, 1);
    dentro = r.top < vh && r.bottom > 0;
  }
  function applica(){
    if (!dentro || !Mask || !Mask.riempi) return;
    Mask.riempi(v);
  }
  /* si applica allo scroll e non solo nel ciclo: il valore dipende SOLO dalla
     posizione, quindi appena la posizione cambia e' gia' giusto — il ciclo
     serve solo a non perdere il primo fotogramma dopo un salto */
  window.addEventListener('scroll', function(){ alFrame(function(){ daScroll(); applica(); }); }, {passive:true});
  window.addEventListener('resize', function(){ alFrame(function(){ daScroll(); applica(); }); });
  (function giro(){ requestAnimationFrame(giro); applica(); })();
  daScroll(); applica();
})();

/* --------------------------------------------------------------------------
   i pulsanti-bolla
   Escono all'altezza della bocca del volto in copertina e salgono, piano.
   Quando escono dal bordo alto vengono risputati dopo un paio di secondi, e
   ricominciano. Non partono mai tutte insieme: velocita' e ritardi diversi.

   Sono link veri: si possono premere mentre galleggiano.
   -------------------------------------------------------------------------- */
function Bolle(box, cop){
  /* Il bianco vero e' rimasto qui: la carta della pagina adesso e' un giallo
     sporco, e una bolla bianca sul girato scuro e' il punto piu' chiaro dello
     schermo. E' uno dei pochi dettagli che restano bianchi. */
  var TINTE = ['#1B3BFF','#FFFFFF','#1B3BFF','#3A1BFF'];
  var SCURE = { '#FFFFFF': true };          /* su queste il testo va nero */
  /* quanti punti fanno il giro del bordo. Sono raccordati con delle cubiche,
     quindi anche pochi danno una curva: su un telefono lento se ne fanno di
     meno e non si vede la differenza. */
  var PUNTI = LEGGERO ? 16 : 24;
  /* l'orologio del campo: sta qui in alto perche' lo usa anche `vesti()`,
     che disegna la prima sagoma prima che il ciclo parta */
  var clock = 0;

  box.innerHTML = DATI.bolle.map(function(p,i){
    var t = TINTE[i%TINTE.length];
    return '<a href="'+p.href+'" '+(p.href!=='#'?'target="_blank" rel="noopener"':'')+'>'
         +   '<span class="corpo" style="--tinta:'+t+(SCURE[t]?';color:var(--nero)':'')+'">'
         +     '<span class="nm">'+p.nm+'</span>'
         +   '</span></a>';
  }).join('');

  var bolle = $$('a', box), corpi = $$('.corpo', box), n = bolle.length;
  var stato = [];
  /* lo stato di ogni coppia: legata o no, e da quanto. Serve all'isteresi e
     al rinculo di quando un collo si spezza. */
  var legato = new Uint8Array(n*n), eta = new Float32Array(n*n);

  /* Le costanti delle coppie vengono dalla specifica delle gocce (§6), che
     le da' in frazioni di schermo: qui sono px e px/s², perche' le bolle
     stanno in un riquadro e non nel viewport. */
  var CONTATTO = 1.00,   /* sotto, i bordi si compenetrano e si respingono */
      PORTATA  = 1.34,   /* oltre, non si sentono piu' */
      FORMA    = 1.06,   /* il legame si forma qui... */
      ROTTURA  = 1.30,   /* ...e si spezza qui. L'isteresi evita lo sfarfallio */
      MIN_LEGAME = 0.45; /* un legame piu' breve di cosi' non fa rinculo */
  var REPULSIONE = 900,  /* la spinta di nucleo, zero esatto al contatto */
      COESIONE   = 130,  /* la tensione superficiale fra due bordi vicini */
      SMORZO     = 14,   /* mangia la velocita' relativa, se no oscillano */
      STRAPPO    = 16;   /* il rinculo di quando un collo si spezza */

  /* MISURE IN CACHE, E NON E' UN'OTTIMIZZAZIONE PREMATURA.
     `getBoundingClientRect` costringe il browser a rifare il conto del
     layout, e `getComputedStyle` quello degli stili: erano chiamate DUE
     VOLTE per fotogramma, dentro al ciclo. Mentre si scorre — con la
     maschera che disegna due shader a schermo intero, la sequenza d'acqua e
     sedici ritagli di testo — bastava a far perdere fotogrammi alle bolle,
     che e' esattamente il "si fermano quando scrollo".
     La copertina cambia misura solo al ridimensionamento, quindi qui si
     leggono solo li'. */
  var DIM = { w:0, h:0 }, BOCCA = { x:0, y:0 };
  function rileggi(){
    var r = cop.getBoundingClientRect();
    DIM.w = r.width; DIM.h = r.height;
    /* il punto di emissione arriva dal CSS: --bocca-x e --bocca-y su #cop */
    var cs = getComputedStyle(cop);
    var fx = parseFloat(cs.getPropertyValue('--bocca-x')) || 66;
    var fy = parseFloat(cs.getPropertyValue('--bocca-y')) || 46;
    BOCCA.x = DIM.w * fx/100; BOCCA.y = DIM.h * fy/100;
  }
  rileggi();
  function misuraBox(){ return DIM; }
  function bocca(){ return BOCCA; }

  function nasce(i, dim, subito){
    var b = bocca(dim);
    var lato = Math.max(84, Math.min(dim.w * .30, 132));
    /* Il riquadro e' piu' largo della bolla che ci sta dentro: al raggio
       serve il posto per gonfiarsi e per allungarsi verso una vicina, e
       quello che esce dal riquadro non viene disegnato — il ritaglio non
       puo' mostrare colore dove il colore non e' dipinto. Il 1.25 rimette
       la bolla alla misura di prima nonostante il riquadro cresciuto. */
    var s = lato * (0.86 + (i%3)*0.10) * 1.25;
    var f = 0.86 + (i%3)*0.10;
    return {
      /* `r` e' il raggio che si vede, non il riquadro: e' quello che decide
         quando due bolle si toccano, e vale NUCLEO piu' mezza ONDA */
      s: s, r: s*0.32,
      /* la massa va col cubo del raggio, come nella specifica: la piccola
         schizza via, la grande quasi non se ne accorge */
      m: Math.max(0.35, Math.pow(f/1.06, 3)),
      /* il posto della bolla nel campo di rumore: due bolle non si increspano
         mai allo stesso modo nello stesso istante */
      seme: i*3.77 + Math.random()*7,
      cresc: 0,
      /* Nascono tutte sulla bocca, una dietro l'altra: e' l'eruzione. Prima
         erano gia' sparse per strada, che serviva quando il giro era
         continuo — adesso il giro e' uno solo e va visto dall'inizio. */
      nasc: 0, attacco: .5, allunga: 0,
      /* meno di un secondo per gonfiarsi: eruttano, non lievitano */
      vNasc: 1/(0.7 + Math.random()*0.45),
      /* nascono sparse in orizzontale, se no salgono in colonna */
      x: b.x + (Math.random()*2-1) * dim.w * .17,
      y: b.y,
      vx: 0, vy: 0,
      /* Un'eruzione, non una fontana: tre secondi scarsi per attraversare.
         Restano premibili perche' il riquadro e' grande e il dito arriva. */
      vel: 105 + i*22 + Math.random()*25,
      amp: 14 + Math.random()*16,
      freq: 0.09 + Math.random()*0.09,
      fase: Math.random()*Math.PI*2,
      /* sfalsate di mezzo secondo l'una dall'altra: escono in fila */
      attesa: subito ? i*0.5 : 0,
      finita: false
    };
  }

  /* Qui si decidono solo le misure: il riquadro e il corpo della scritta.
     La sagoma non si tocca — la disegna `rendi()` a ogni fotogramma, e
     rifarla da qui vorrebbe dire interromperla proprio mentre si guarda. */
  function vesti(){
    corpi.forEach(function(c,i){
      var st = stato[i]; if (!st) return;
      bolle[i].style.setProperty('--s', st.s.toFixed(0)+'px');
      var w = st.s;
      /* la scritta sta dentro al NUCLEO, cioe' al raggio che la bolla non
         scende mai: quello che c'e' oltre puo' andare e venire */
      var nm = c.firstElementChild, lw = w * .40;
      if (nm){
        nm.style.fontSize = '40px';
        var largo = 0;
        nm.textContent.split(' ').forEach(function(par){
          var m = document.createElement('span');
          m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit';
          m.textContent = par; nm.appendChild(m);
          largo = Math.max(largo, m.offsetWidth); nm.removeChild(m);
        });
        nm.style.fontSize = largo ? clamp(40 * lw / largo, 9, 17).toFixed(1)+'px' : '';
      }
      /* La prima sagoma la si da' subito: il ciclo puo' non partire per un
         pezzo — scheda in secondo piano, finestra di larghezza zero — e nel
         frattempo un quadrato blu resterebbe un quadrato blu.
         Senza clip-path: path() resta il border-radius del CSS, che e' piu'
         tondo ma vivo. */
      if (SUPPORTA_RITAGLIO){
        c.style.borderRadius = '0';
        c.style.clipPath = bordo(st, clock, 0, 0, PUNTI);
      }
    });
  }

  var dim = misuraBox();
  for (var i=0;i<n;i++) stato.push(nasce(i, dim, true));
  vesti();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(vesti);

  window.addEventListener('resize', function(){ alFrame(function(){
    rileggi();
    var d = misuraBox();
    for (var i=0;i<n;i++){
      var b = bocca(d), vecchio = stato[i];
      var f = nasce(i, d, false);
      f.y = Math.min(vecchio.y, b.y);      /* non le si rimanda giu' di colpo */
      f.x = Math.min(Math.max(vecchio.x, f.r), d.w - f.r);
      f.attesa = vecchio.attesa;
      /* il posto nel campo, il gonfiore e la nascita restano quelli:
         ridimensionare la finestra non e' una ragione per rifare la sagoma
         da capo, ne' per rinascere */
      f.seme = vecchio.seme; f.cresc = vecchio.cresc;
      f.nasc = vecchio.nasc; f.attacco = vecchio.attacco;
      f.allunga = vecchio.allunga; f.vNasc = vecchio.vNasc;
      stato[i] = f;
    }
    vesti();
  }); });

  /* Il posizionamento non puo' aspettare il primo frame: senza questo le
     bolle restano ferme nell'angolo in alto a sinistra finche' rAF non parte,
     e su una scheda in secondo piano puo' voler dire parecchio.

     La fisica e' la stessa delle gocce, in piccolo: spinta verso l'alto,
     deriva laterale, e una repulsione a coppie che le tiene separate. La
     forza attraversa lo zero con continuita' — un gradino qui produrrebbe la
     stessa vibrazione ad alta frequenza che rovinerebbe le gocce. */
  /* non ci sono al primo istante: la copertina si presenta da sola per un
     secondo, e solo dopo salgono le bolle */
  var nato = performance.now() + 1000;

  /* Lo stacco. Il collo si spezza e la tensione superficiale ritira i due
     monconi: la bolla parte piu' svelta della sua velocita' di crociera e si
     allunga nel verso in cui va, poi la viscosita' la rimette al passo. E'
     lo `snap` della specifica applicato all'unico legame che una bolla appena
     nata ha — quello con la bocca. */
  function stacca(st){
    st.vy = -st.vel*1.8;
    st.vx = (Math.random()*2-1)*24;
    st.allunga = 0.34;
  }
  function rendi(dt){
    var d = misuraBox();
    if (!d.h || !d.w) return;
    var b = bocca(d);
    var i, j;
    clock += dt;

    /* 1 · nascita, gonfiaggio, spinta di base */
    var relax = 1 - Math.exp(-dt/0.55);
    for (i=0;i<n;i++){
      var st = stato[i];
      if (st.finita) continue;
      if (st.attesa > 0){
        st.attesa -= dt;
        /* La rinascita va QUI, dove il tempo scende a zero. Metterla piu'
           sotto voleva dire non eseguirla mai: al giro in cui l'attesa
           finisce non si entra piu' in quel ramo, la bolla resta con la sua
           ultima posizione fuori schermo e si rimette in attesa da capo —
           spariva una volta e non tornava piu'. */
        if (st.attesa <= 0){
          st.attesa = 0;
          /* gia' nella posizione che avra' da appena spuntata: mettendola
             sulla bocca e lasciando che sia il giro dopo ad ancorarla si
             perdevano sei pixel in un fotogramma solo */
          st.y = b.y - st.r*gonfiore(0);
        }
        continue;
      }

      /* Il gonfiaggio. La bolla e' attaccata alla bocca: il fondo resta li'
         e il centro sale mentre il raggio cresce, quindi si gonfia sul posto
         invece di comparire gia' fatta. Non si muove e non sente le altre —
         e' l'unico momento in cui una bolla e' ferma. */
      if (st.nasc < 1){
        /* con `prefers-reduced-motion` la bolla c'e' gia' fatta: e' un
           movimento anche questo */
        st.nasc = CALMO ? 1 : Math.min(1, st.nasc + st.vNasc*dt);
        st.y = b.y - st.r*gonfiore(st.nasc);
        st.vx = 0; st.vy = 0;
        /* il collo si allunga mentre la bolla cresce — e' il peso che tira —
           e comincia a ritirarsi solo dopo lo strappo */
        st.attacco = 0.5 + 0.5*st.nasc;
        if (st.nasc >= 1){ if (CALMO) st.attacco = 0; else stacca(st); }
        continue;
      }

      /* dopo lo stacco il collo si ritira e l'allungamento si riassorbe:
         due code esponenziali, che finiscono senza un bordo */
      if (st.attacco > 0) st.attacco = Math.max(0, st.attacco - dt/0.30);
      if (st.allunga > 0) st.allunga *= Math.exp(-dt/0.42);

      st.vy += (-st.vel - st.vy) * relax;
      st.vx += (Math.sin(clock*st.freq*6.2832 + st.fase)*st.amp - st.vx) * relax;
    }

    /* 2 · le coppie, con la fisica delle gocce (specifica §6)
       Sotto CONTATTO si respingono, oltre si attraggono, e la forza
       attraversa lo zero con CONTINUITA': un gradino qui produce una
       vibrazione ad alta frequenza, ed e' l'errore che ha gia' rotto una
       versione delle gocce.
       Chi si sta gonfiando non viene spostato — e' attaccata alla bocca —
       ma spinge e attira lo stesso. */
    for (i=0;i<n;i++){
      var a = stato[i]; if (a.attesa > 0 || a.finita) continue;
      for (j=i+1;j<n;j++){
        var c = stato[j]; if (c.attesa > 0 || c.finita) continue;
        var k = i*n + j;
        var dx = c.x-a.x, dy = c.y-a.y;
        /* i raggi sono quelli che si vedono adesso, non quelli finali: una
           bolla che si sta gonfiando spinge via le altre man mano che cresce,
           non da subito.
           Lo 0.92 lascia che i bordi si compenetrino un poco: e' li' che i
           due lobi si incontrano e le bolle sembrano una cosa sola invece di
           due palle appoggiate. */
        var somma = (a.r*gonfiore(a.nasc) + c.r*gonfiore(c.nasc)) * 0.92;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > somma*PORTATA || dist < 1e-4){ legato[k] = 0; eta[k] = 0; continue; }
        var nx = dx/dist, ny = dy/dist, sn = dist/somma;

        var f;
        if (sn < CONTATTO){ var t = 1 - sn/CONTATTO; f = REPULSIONE*t*t; }
        else { var u = (sn-CONTATTO)/(PORTATA-CONTATTO); f = -COESIONE*Math.sin(Math.PI*u); }
        var vrel = (c.vx-a.vx)*nx + (c.vy-a.vy)*ny;
        var acc = (f - SMORZO*vrel*(1 - sn/PORTATA)) * dt;
        if (a.nasc >= 1){ a.vx -= nx*acc/a.m; a.vy -= ny*acc/a.m; }
        if (c.nasc >= 1){ c.vx += nx*acc/c.m; c.vy += ny*acc/c.m; }

        /* Il legame, con isteresi: si forma sotto FORMA e si spezza sopra
           ROTTURA, se no sul confine sfarfalla. Quando si spezza, e se e'
           durato abbastanza da essere un legame e non uno sfioramento, le due
           si danno il rinculo e si allungano un istante: e' lo stesso collo
           che si ritira alla nascita, fra due bolle invece che sulla bocca. */
        var era = legato[k];
        var ora = era ? (sn < ROTTURA) : (sn < FORMA);
        if (era && ora) eta[k] += dt;
        if (era && !ora){
          if (eta[k] > MIN_LEGAME){
            if (a.nasc >= 1){ a.vx -= nx*STRAPPO/a.m; a.vy -= ny*STRAPPO/a.m;
                              if (a.allunga < .16) a.allunga = .16; }
            if (c.nasc >= 1){ c.vx += nx*STRAPPO/c.m; c.vy += ny*STRAPPO/c.m;
                              if (c.allunga < .16) c.allunga = .16; }
          }
          eta[k] = 0;
        }
        if (!era && ora) eta[k] = 0;
        legato[k] = ora ? 1 : 0;
      }
    }

    /* 3 · quanto ognuna sente la vicina piu' prossima: si allunga verso di
       lei invece di sormontarla. E' il residuo della tensione superficiale,
       e va a finire nel raggio del bordo — non in una scala sul corpo, che
       tirando da una parte stringeva dall'altra.
       L'ampiezza sale come 1-e^(-x): non arriva mai al tetto di scatto, e
       quando due bolle si staccano il lobo si ritira senza uno scalino. */
    var tira = [], ang = [];
    for (i=0;i<n;i++){ tira.push(0); ang.push(0); }
    for (i=0;i<n;i++){
      var a2 = stato[i]; if (a2.attesa > 0 || a2.finita) continue;
      for (j=i+1;j<n;j++){
        var c2 = stato[j]; if (c2.attesa > 0 || c2.finita) continue;
        var ddx = c2.x-a2.x, ddy = c2.y-a2.y;
        var dd = Math.sqrt(ddx*ddx + ddy*ddy);
        var portata = (a2.r*gonfiore(a2.nasc) + c2.r*gonfiore(c2.nasc)) * 2.1;
        if (dd >= portata || dd < 1e-4) continue;
        var e = LOBO * (1 - Math.exp(-2.4*(1 - dd/portata)));
        var an = Math.atan2(ddy, ddx);
        if (e > tira[i]){ tira[i] = e; ang[i] = an; }
        if (e > tira[j]){ tira[j] = e; ang[j] = an + Math.PI; }
      }
    }

    /* 4 · integrazione, pareti morbide, scrittura */
    for (i=0;i<n;i++){
      var st2 = stato[i], el = bolle[i];
      if (st2.attesa > 0 || st2.finita){
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        continue;
      }
      /* chi si gonfia sta ferma: la sua posizione l'ha gia' decisa il
         gonfiaggio, e integrarla la staccherebbe dalla bocca */
      if (!CALMO && st2.nasc >= 1){
        /* tetto alla velocita': dopo uno strappo o una rottura di legame
           nessuna deve poter schizzare via */
        var sp = Math.sqrt(st2.vx*st2.vx + st2.vy*st2.vy), vMax = st2.vel*4 + 90;
        if (sp > vMax){ st2.vx *= vMax/sp; st2.vy *= vMax/sp; }
        st2.x += st2.vx*dt; st2.y += st2.vy*dt;
      }
      var m = st2.r*0.8;
      if (st2.x < m)         { st2.x = m;         st2.vx =  Math.abs(st2.vx)*0.4; }
      if (st2.x > d.w - m)   { st2.x = d.w - m;   st2.vx = -Math.abs(st2.vx)*0.4; }

      /* Uscita dal bordo alto: FINITA. Non rinasce — l'eruzione e' una sola.
         Riparte solo se si lascia la copertina e ci si torna, se no i tre
         link alle piattaforme sparirebbero per sempre dopo dieci secondi. */
      if (st2.y < -st2.s*0.6){ st2.finita = true; continue; }

      /* quanto e' avanti nel tragitto: 0 alla bocca, 1 quando esce in cima.
         Sale sempre, quindi la bolla si gonfia e basta. Riparte da zero solo
         quando rinasce, che succede a schermo vuoto. */
      st2.cresc = clamp((b.y - st2.y) / Math.max(b.y + st2.s*0.6, 1), 0, 1);

      /* svanisce in cima, cosi' non sparisce di colpo. In basso non serve
         piu': adesso la bolla non compare, si gonfia. */
      var op = Math.min(1, (st2.y + st2.s*0.6)/(st2.s*0.9));
      var avvio = clamp((performance.now() - nato)/700, 0, 1);
      /* il primo istante della nascita: la bolla e' larga tre pixel, e un
         puntino che compare dal niente si legge come un difetto. Emerge. */
      op *= avvio * mappa(st2.nasc, 0, .10);
      el.style.opacity = clamp(op, 0, 1).toFixed(3);
      /* non si preme una bolla che si sta ancora gonfiando: e' piccola, si
         muove sotto il dito e la scritta non si legge */
      el.style.pointerEvents = (op > .55 && st2.nasc > .9) ? 'auto' : 'none';
      el.style.transform = 'translate3d('+st2.x.toFixed(1)+'px,'+st2.y.toFixed(1)+'px,0)'
        + ' scale('+(0.86 + .14*avvio).toFixed(3)+')';

      /* La sagoma si ridisegna qui, a ogni fotogramma, dal campo di rumore e
         dalla vicina piu' prossima. Non e' un'animazione con un inizio e una
         fine: e' lo stato di adesso, quindi non c'e' un fotogramma chiave da
         raggiungere ne' un ciclo da ricominciare, e niente scatta.
         Con `prefers-reduced-motion` la si disegna una volta e resta li'. */
      var corpo = corpi[i];
      if (corpo && SUPPORTA_RITAGLIO && (!CALMO || !corpo.ferma)){
        corpo.style.clipPath = bordo(st2, clock, tira[i], ang[i], PUNTI);
        corpo.ferma = true;
      }
      /* la scritta compare mentre la bolla si gonfia, ed e' li' tutta un
         attimo prima che si stacchi: e' il segnale che la bolla e' pronta.
         Il ritaglio da solo non basterebbe — mezze lettere tagliate si
         leggono come un errore. */
      var nm2 = corpo && corpo.firstElementChild;
      if (nm2) nm2.style.opacity = mappa(st2.nasc, .55, .94).toFixed(3);
    }
  }

  rendi(0);

  /* SI RIARMA TORNANDO IN COPERTINA. L'eruzione e' una sola, ma i tre link
     alle piattaforme non possono sparire per sempre dopo dieci secondi: se
     si esce dalla copertina e ci si torna, ricominciano. */
  if (window.IntersectionObserver){
    var fuori = false;
    new IntersectionObserver(function(v){
      if (!v[0].isIntersecting){ fuori = true; return; }
      if (!fuori) return;
      fuori = false;
      var d = misuraBox(), b = bocca();
      for (var i=0;i<n;i++){
        var st = stato[i];
        if (!st.finita) continue;
        st.finita = false; st.attesa = i*0.5;
        st.nasc = 0; st.attacco = .5; st.allunga = 0;
        st.y = b.y - st.r*gonfiore(0);
        st.x = b.x + (Math.random()*2-1)*d.w*.17;
        st.vx = 0; st.vy = 0;
        st.fase = Math.random()*Math.PI*2;
      }
    }, { threshold:0 }).observe(cop);
  }

  var ultimo = performance.now();
  (function giro(ora){
    requestAnimationFrame(giro);
    var dt = Math.min((ora - ultimo)/1000, 1/20); ultimo = ora;
    if (document.hidden) return;
    rendi(dt);
  })(performance.now());
}

(function(){ var b = $('#piatt'), c = $('#cop'); if (b && c) Bolle(b, c); })();

/* --------------------------------------------------------------------------
   ascolta: le uscite e la lastra che si apre di fianco
   -------------------------------------------------------------------------- */
(function(){
  var box = $('#uscite'), lastra = $('#lastra');
  var titLastra = $('#lastra .h');

  box.innerHTML = DATI.uscite.map(function(u){
    return '<a class="uscita" href="'+u.href+'" '+(u.href!=='#'?'target="_blank" rel="noopener"':'')+' data-t="'+u.t+'">'
         +   '<span class="mono">'+u.n+'</span>'
         +   '<span class="col">'
         +     '<span class="t gx" data-t="'+u.t+'">'+u.t+'</span>'
         +     '<span class="meta">'+u.meta+'</span>'
         +   '</span>'
         +   '<span class="fr" aria-hidden="true">→</span>'
         + '</a>';
  }).join('');

  var righe = $$('.uscita', box);

  if (PUNTATORE){
    righe.forEach(function(r){
      r.addEventListener('mouseenter', function(){
        r.classList.add('viva');
        titLastra.textContent = r.dataset.t;
        lastra.classList.add('on');
      });
      r.addEventListener('mouseleave', function(){
        r.classList.remove('viva');
        lastra.classList.remove('on');
      });
    });
    window.addEventListener('pointermove', function(e){
      if (!lastra.classList.contains('on')) return;
      alFrame(function(){
        var w = lastra.offsetWidth, h = lastra.offsetHeight;
        var x = clamp(e.clientX + 26, 8, window.innerWidth - w - 8);
        var y = clamp(e.clientY - h/2, 8, window.innerHeight - h - 8);
        lastra.style.transform = 'translate3d('+x+'px,'+y+'px,0)';
      });
    }, {passive:true});
  } else {
    /* sul telefono non c'e' passaggio del dito: si accende la riga che sta
       al centro dello schermo, cosi' lo scroll stesso fa la scelta */
    var scorri = function(){
      var c = window.innerHeight*0.52, vicina = null, dmin = 1e9;
      righe.forEach(function(r){
        var b = r.getBoundingClientRect();
        var d = Math.abs(b.top + b.height/2 - c);
        if (d < dmin && d < b.height*1.4){ dmin = d; vicina = r; }
      });
      righe.forEach(function(r){ r.classList.toggle('viva', r === vicina); });
    };
    window.addEventListener('scroll', function(){ alFrame(scorri); }, {passive:true});
    scorri();
  }

})();

/* --------------------------------------------------------------------------
   contatti
   -------------------------------------------------------------------------- */
(function(){
  var m = $('#mailBooking'), avviso = $('#copiato');
  m.textContent = DATI.booking; m.href = 'mailto:'+DATI.booking;
  var cta = $('#ctaBooking');
  if (cta) cta.href = 'mailto:'+DATI.booking+'?subject='+encodeURIComponent('Data — '+DATI.nome);
  $('#cMgmt').textContent   = DATI.management; $('#cMgmt').href = 'mailto:'+DATI.management;
  $('#cPress').textContent  = DATI.stampa; $('#cPress').href = 'mailto:'+DATI.stampa;

  var social = DATI.social.map(function(s){
    return '<a href="'+s.href+'" '+(s.href!=='#'?'target="_blank" rel="noopener"':'')+'>'+s.nm+'</a>';
  }).join('');
  /* i social stanno nel menu e basta: in fondo ai contatti erano una fila di
     pulsanti che portava via dalla pagina proprio dove si deve scrivere */
  $('#menuSocial').innerHTML = social;
  var f = $('#firmato');
  if (f) f.textContent = DATI.firma;

  function mostra(t){
    avviso.textContent = t; avviso.classList.add('on');
    clearTimeout(mostra._t);
    mostra._t = setTimeout(function(){ avviso.classList.remove('on'); }, 1900);
  }
  m.addEventListener('click', function(e){
    if (!navigator.clipboard) return;
    e.preventDefault();
    navigator.clipboard.writeText(DATI.booking).then(function(){
      mostra('Indirizzo copiato');
    }, function(){ window.location.href = 'mailto:'+DATI.booking; });
  });
})();

/* --------------------------------------------------------------------------
   la massa fluida
   Fra la copertina e "Ascolta" non c'e' piu' un taglio netto: c'e' una massa
   blu che sta a cavallo del confine, sale dentro alla copertina e scende
   dentro ad "Ascolta" — e siccome le gocce invertono quello che coprono, il
   titolo ASCOLTA dentro alla massa si legge bianco su blu.

   Sta ferma finche' la si guarda. Continuando a scorrere si scioglie: si
   scompone in gocce che salgono e si sparpagliano, e la pagina torna com'e'.
   Il bordo respira anche da ferma, ma non per via della fisica: e' il domain
   warp dello shader, che costa niente e non muove niente.
   -------------------------------------------------------------------------- */
(function(){
  var palco = $('main.stage'), inv = $('#c-invert'), tin = $('#c-tint');
  var cop = $('#cop'), asc = $('#ascolta');
  if (!palco || !inv || !cop || !asc || !window.BlobMask) return;
  var mask = BlobMask.monta({ palco: palco, invert: inv, tint: tin });
  if (!mask) return;      /* niente WebGL: i canvas restano vuoti */
  Mask = mask;
  /* Il fondo della copertina in coordinate di documento: si legge al
     ridimensionamento e basta. Leggerlo a ogni fotogramma vuol dire
     costringere il browser a rifare il layout mentre si scorre, ed e' un
     costo che si paga in fotogrammi persi altrove. */
  var copFondo = 0;
  function rileggiCop(){ copFondo = cop.getBoundingClientRect().bottom + window.scrollY; }
  rileggiCop();
  window.addEventListener('resize', function(){ alFrame(rileggiCop); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rileggiCop);
  document.addEventListener('entrati', rileggiCop);

  /* La massa comanda finche' non e' sciolta. Dopo, la maschera resta a
     disposizione di chi la chiama: oggi la sola sparata di "Chi e'". */
  function guarda(){
    var vh = window.innerHeight;
    var bordo = (copFondo - window.scrollY) / vh;
    var diss = clamp((0.68 - bordo) / 0.46, 0, 1);
    if (diss < 0.999) mask.massa(bordo, diss);
  }
  window.addEventListener('scroll', function(){ alFrame(guarda); }, {passive:true});
  window.addEventListener('resize', function(){ alFrame(guarda); });
  guarda();
})();

/* --------------------------------------------------------------------------
   i link non ancora collegati
   Finche' DATI non ha gli indirizzi veri, questi puntano a '#'. Senza questo
   guardiano un tocco riporterebbe in cima alla pagina, che sembra un difetto.
   Quando i link ci sono, questo pezzo semplicemente non trova piu' niente.
   -------------------------------------------------------------------------- */
(function(){
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href="#"]');
    if (!a) return;
    e.preventDefault();
    console.warn('link da collegare:', a.textContent.trim());
  });
})();

/* --------------------------------------------------------------------------
   partenza
   -------------------------------------------------------------------------- */
(function(){
  var attese = [
    immagine('assets/media/copertina.jpg')
  ];
  if (document.fonts && document.fonts.ready) attese.push(document.fonts.ready);
  var v = $('#vCop');
  attese.push(new Promise(function(ris){
    if (v.readyState >= 3) return ris();
    v.addEventListener('canplay', ris, {once:true});
    setTimeout(ris, 3500);
  }));
  Loader.attendi(attese);
  adattaTutti();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(adattaTutti);
  window.addEventListener('resize', function(){ alFrame(adattaTutti); });
  document.addEventListener('entrati', adattaTutti);
})();

})();
