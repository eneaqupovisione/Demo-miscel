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

(function(){
  var ora = $('#ora');
  function agg(){
    var d = new Date();
    ora.textContent = ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
  }
  agg(); setInterval(agg, 20000);
  $('#anno').textContent = new Date().getFullYear();
})();

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
   la forma irregolare
   La usano i pulsanti-bolla della copertina: forme piene a bordo netto, mai
   tonde.
   --------------------------------------------------------------------------
   Non una goccia tonda: un giro di punti a raggio irregolare, raccordati
   con delle cubiche. Ne servono tre per bolla, con lo stesso numero di
   segmenti, perche' l'animazione possa passare dall'una all'altra. */
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
function forma(w, h, punti, irr, giro){
  var pt = [];
  for (var i=0;i<punti;i++){
    var a = (i/punti)*Math.PI*2 + giro;
    /* raggio diverso a ogni punto, e i due assi indipendenti: e' quello che
       toglie la simmetria e la fa sembrare una cosa e non una figura */
    var r = 1 - irr*Math.random();
    var q = 1 - irr*.6*Math.random();
    pt.push([ w/2 + Math.cos(a)*(w/2)*r*.98,
              h/2 + Math.sin(a)*(h/2)*q*.98 ]);
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
   il singolo: la sequenza comandata dallo scroll
   Il progresso non e' quello dello scroll, e' un valore che lo insegue: cosi'
   il rimbalzo dello scroll di iOS non si vede.
   -------------------------------------------------------------------------- */
(function(){
  var sez = $('#imm'), cv = $('#cvImm');
  var barra = $('#immBarra'), pct = $('#immPct');
  var tappe = $$('#imm .tappa');
  var ctx = cv.getContext('2d', { alpha:true });
  var W=0,H=0,DPR=1;
  var pT = 0, p = 0, entrata = 0, dentro = false;

  /* i contenuti veri di questa scena stanno in DATI, come tutto il resto */
  var uscita = (DATI.uscite && DATI.uscite[0]) || { t:'—', href:'#' };
  $('#immTit').textContent = uscita.t;
  var cta = $('#immCta');
  var dove = uscita.href !== '#' ? uscita.href
           : (DATI.bolle[0] && DATI.bolle[0].href) || '#';
  cta.href = dove;
  if (dove !== '#'){ cta.target = '_blank'; cta.rel = 'noopener'; }

  function misura(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W) return;
    cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    rendi();
  }

  function fascia(v,a,b){
    var m = .09;
    return smorza(mappa(v,a,a+m)) * (1 - smorza(mappa(v,b-m,b)));
  }

  function rendi(){
    var s = mappa(p, .04, .96);
    Sequenza.disegna(ctx, W, H, s, '#0B0E1C');
    cv.style.opacity = (entrata * (1 - mappa(p,.95,1))).toFixed(3);

    barra.style.width = (s*100).toFixed(1)+'%';
    pct.textContent = ('0'+Math.round(s*99)).slice(-2);

    for (var i=0;i<tappe.length;i++){
      var t = tappe[i];
      var v = fascia(p, parseFloat(t.dataset.a), parseFloat(t.dataset.b));
      t.style.opacity = v.toFixed(3);
      t.style.transform = 'translate3d(0,'+((1-v)*26).toFixed(1)+'px,0)';
      t.style.pointerEvents = v > .62 ? 'auto' : 'none';
    }

    document.body.classList.toggle('notte', p > .02 && p < .985);
  }

  /* si carica solo quando la sezione si avvicina: non pesa sull'apertura */
  var pre = new IntersectionObserver(function(vs){
    if (!vs[0].isIntersecting) return;
    pre.disconnect();
    Sequenza.carica();
    Sequenza.quandoPronta(misura);
  }, { rootMargin: '160% 0px' });
  pre.observe(sez);

  function daScroll(){
    var r = sez.getBoundingClientRect();
    var alt = sez.offsetHeight - window.innerHeight;
    pT = clamp(-r.top / (alt||1), 0, 1);
    entrata = clamp(1 - r.top / (window.innerHeight * .8), 0, 1);
    dentro = r.top < window.innerHeight && r.bottom > 0;
  }

  (function giro(){
    requestAnimationFrame(giro);
    if (!dentro && Math.abs(p - pT) < .0008) return;
    p += (pT - p) * (CALMO ? 1 : .13);
    if (Math.abs(pT - p) < .0004) p = pT;
    rendi();
  })();

  window.addEventListener('scroll', function(){ alFrame(daScroll); }, {passive:true});
  window.addEventListener('resize', function(){ alFrame(function(){ misura(); daScroll(); }); });
  document.addEventListener('entrati', function(){ misura(); daScroll(); });
  daScroll();
})();

/* --------------------------------------------------------------------------
   chi e': il respiro dietro alle righe
   Lo sfondo non compare in dissolvenza: si apre da destra come un taglio, e
   solo quando la sezione e' arrivata davvero. E' la differenza fra "c'era gia'
   e non l'avevi visto" e "e' appena successo".
   -------------------------------------------------------------------------- */
(function(){
  var sez = $('#chi'); if (!sez) return;
  var cv = $('#cvChi');
  var ctx = cv.getContext('2d', { alpha:true });
  var W=0,H=0,DPR=1, pT=0, p=0, dentro=false;

  /* ogni riga dentro alla sua feritoia: lo span taglia, la <i> scorre */
  var dire = $('[data-righe]', sez);
  var righe = $$('[data-righe] > span', sez);
  righe.forEach(function(sp,i){
    sp.innerHTML = '<i style="--d:'+(120 + i*130)+'ms">'+sp.innerHTML+'</i>';
  });

  /* una sola misura per tutte le righe, decisa dalla piu' lunga: righe di
     corpi diversi sarebbero un manifesto, non una frase */
  function misuraRighe(){
    var p = dire.parentElement, cs = getComputedStyle(p);
    var largo = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (largo <= 0) return;
    dire.style.fontSize = '100px';
    var max = 0;
    righe.forEach(function(sp){ max = Math.max(max, sp.firstChild.scrollWidth); });
    if (!max) return;
    dire.style.fontSize = Math.min(100 * largo / max * .99, 132).toFixed(2) + 'px';
  }
  misuraRighe();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(misuraRighe);
  window.addEventListener('resize', function(){ alFrame(misuraRighe); });

  function misura(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W) return;
    cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    rendi();
  }
  function rendi(){ Sequenza.disegna(ctx, W, H, p, null, Sequenza.RESPIRO); }

  var pre = new IntersectionObserver(function(vs){
    if (!vs[0].isIntersecting) return;
    pre.disconnect();
    Sequenza.carica();
    Sequenza.quandoPronta(misura);
  }, { rootMargin: '120% 0px' });
  pre.observe(sez);

  /* la rivelazione: una volta sola, e solo quando ce n'e' abbastanza in vista */
  var oss = new IntersectionObserver(function(vs){
    if (!vs[0].isIntersecting) return;
    oss.disconnect();
    sez.classList.add('svelato');
  }, { threshold:.28 });
  oss.observe(sez);

  function daScroll(){
    var r = sez.getBoundingClientRect(), vh = window.innerHeight;
    /* 0 quando il bordo alto entra, 1 quando quello basso esce: la scena
       respira per tutta la traversata della sezione */
    pT = clamp((vh - r.top) / (vh + r.height), 0, 1);
    dentro = r.top < vh && r.bottom > 0;
  }
  (function giro(){
    requestAnimationFrame(giro);
    if (!dentro && Math.abs(p - pT) < .001) return;
    p += (pT - p) * (CALMO ? 1 : .1);
    rendi();
  })();

  window.addEventListener('scroll', function(){ alFrame(daScroll); }, {passive:true});
  window.addEventListener('resize', function(){ alFrame(function(){ misura(); daScroll(); }); });
  document.addEventListener('entrati', function(){ misura(); daScroll(); });
  daScroll();
})();

/* --------------------------------------------------------------------------
   i pulsanti-bolla
   Escono all'altezza della bocca del volto in copertina e salgono, piano.
   Quando escono dal bordo alto vengono risputati dopo un paio di secondi, e
   ricominciano. Non partono mai tutte insieme: velocita' e ritardi diversi.

   Sono link veri: si possono premere mentre galleggiano.
   -------------------------------------------------------------------------- */
function Bolle(box, cop){
  var TINTE = ['#1B3BFF','#F2EFE8','#1B3BFF','#3A1BFF'];
  var SCURE = { '#F2EFE8': true };          /* su queste il testo va nero */

  box.innerHTML = DATI.bolle.map(function(p,i){
    var t = TINTE[i%TINTE.length];
    return '<a href="'+p.href+'" '+(p.href!=='#'?'target="_blank" rel="noopener"':'')+'>'
         +   '<span class="corpo" style="--tinta:'+t+(SCURE[t]?';color:var(--nero)':'')+'">'
         +     '<span class="nm">'+p.nm+'</span>'
         +   '</span></a>';
  }).join('');

  var bolle = $$('a', box), corpi = $$('.corpo', box), n = bolle.length;
  var stato = [];

  function misuraBox(){
    var r = cop.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  /* il punto di emissione arriva dal CSS: --bocca-x e --bocca-y su #cop */
  function bocca(dim){
    var cs = getComputedStyle(cop);
    var fx = parseFloat(cs.getPropertyValue('--bocca-x')) || 66;
    var fy = parseFloat(cs.getPropertyValue('--bocca-y')) || 46;
    return { x: dim.w * fx/100, y: dim.h * fy/100 };
  }

  function nasce(i, dim, subito){
    var b = bocca(dim);
    var lato = Math.max(84, Math.min(dim.w * .30, 132));
    var s = lato * (0.86 + (i%3)*0.10);
    return {
      s: s, r: s*0.52,
      /* nascono sparse in orizzontale, se no salgono in colonna */
      x: b.x + (Math.random()*2-1) * dim.w * .17,
      /* alla prima passata sono gia' sparse lungo il tragitto, cosi' si
         vedono tutte da subito invece di uscire una alla volta */
      y: subito ? b.y - i * b.y * .30 : b.y,
      vx: 0, vy: 0,
      /* dai dieci ai quindici secondi per attraversare: abbastanza lente da
         poterle premere, non tanto da sembrare ferme. Scalate per indice,
         se no dopo un giro escono all'unisono. */
      vel: 24 + i*6 + Math.random()*7,
      amp: 14 + Math.random()*16,
      freq: 0.09 + Math.random()*0.09,
      fase: Math.random()*Math.PI*2,
      attesa: 0
    };
  }

  function vesti(){
    var dim = misuraBox();
    corpi.forEach(function(c,i){
      var st = stato[i]; if (!st) return;
      bolle[i].style.setProperty('--s', st.s.toFixed(0)+'px');
      var w = st.s, h = st.s*1.06;
      var nm = c.firstElementChild, lw = w * .74;
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
      if (!SUPPORTA_RITAGLIO) return;
      var pu = 9 + (i%3), irr = .20 + (i%4)*.04, g = i*1.15;
      var f1 = forma(w,h,pu,irr,g), f2 = forma(w,h,pu,irr,g+.5), f3 = forma(w,h,pu,irr,g+1);
      c.style.borderRadius = '0';
      c.style.clipPath = f1;
      if (c.morfa){ c.morfa.cancel(); c.morfa = null; }
      if (!CALMO && c.animate){
        c.morfa = c.animate(
          [{clipPath:f1},{clipPath:f2},{clipPath:f3},{clipPath:f1}],
          { duration: 9000 + i*1900, iterations: Infinity, easing:'ease-in-out' });
      }
    });
  }

  var dim = misuraBox();
  for (var i=0;i<n;i++) stato.push(nasce(i, dim, true));
  vesti();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(vesti);

  window.addEventListener('resize', function(){ alFrame(function(){
    var d = misuraBox();
    for (var i=0;i<n;i++){
      var b = bocca(d), vecchio = stato[i];
      var f = nasce(i, d, false);
      f.y = Math.min(vecchio.y, b.y);      /* non le si rimanda giu' di colpo */
      f.x = Math.min(Math.max(vecchio.x, f.r), d.w - f.r);
      f.attesa = vecchio.attesa;
      stato[i] = f;
    }
    vesti();
  }); });

  /* Il posizionamento non puo' aspettare il primo frame: senza questo le
     bolle restano ferme nell'angolo in alto a sinistra finche' rAF non parte,
     e su una scheda in secondo piano puo' voler dire parecchio. */
  /* Il posizionamento non puo' aspettare il primo frame: senza questo le
     bolle restano ferme nell'angolo in alto a sinistra finche' rAF non parte,
     e su una scheda in secondo piano puo' voler dire parecchio.

     La fisica e' la stessa delle gocce, in piccolo: spinta verso l'alto,
     deriva laterale, e una repulsione a coppie che le tiene separate. La
     forza attraversa lo zero con continuita' — un gradino qui produrrebbe la
     stessa vibrazione ad alta frequenza che rovinerebbe le gocce. */
  var clock = 0;
  function rendi(dt){
    var d = misuraBox();
    if (!d.h || !d.w) return;
    var b = bocca(d);
    var i, j;
    clock += dt;

    /* 1 · spinta di base: sale, e ondeggia piano */
    var relax = 1 - Math.exp(-dt/0.55);
    for (i=0;i<n;i++){
      var st = stato[i];
      if (st.attesa > 0){ st.attesa -= dt; continue; }
      st.vy += (-st.vel - st.vy) * relax;
      st.vx += (Math.sin(clock*st.freq*6.2832 + st.fase)*st.amp - st.vx) * relax;
    }

    /* 2 · repulsione: non si sormontano mai */
    for (i=0;i<n;i++){
      var a = stato[i]; if (a.attesa > 0) continue;
      for (j=i+1;j<n;j++){
        var c = stato[j]; if (c.attesa > 0) continue;
        var dx = c.x-a.x, dy = c.y-a.y;
        var somma = (a.r + c.r) * 1.06;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if (dist >= somma || dist < 1e-4) continue;
        var nx = dx/dist, ny = dy/dist;
        var t = 1 - dist/somma;
        var f = 900 * t * t;                    /* zero al contatto: continua */
        var vrel = (c.vx-a.vx)*nx + (c.vy-a.vy)*ny;
        var sm = -14 * vrel * t;
        a.vx -= nx*(f+sm)*dt; a.vy -= ny*(f+sm)*dt;
        c.vx += nx*(f+sm)*dt; c.vy += ny*(f+sm)*dt;
      }
    }

    /* 3 · integrazione, pareti morbide, scrittura */
    for (i=0;i<n;i++){
      var st2 = stato[i], el = bolle[i];
      if (st2.attesa > 0){
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        if (st2.attesa <= 0){
          st2.y = b.y; st2.x = b.x + (Math.random()*2-1)*d.w*.17;
          st2.vx = 0; st2.vy = 0; st2.fase = Math.random()*Math.PI*2;
        }
        continue;
      }
      if (!CALMO){ st2.x += st2.vx*dt; st2.y += st2.vy*dt; }
      var m = st2.r*0.55;
      if (st2.x < m)         { st2.x = m;         st2.vx =  Math.abs(st2.vx)*0.4; }
      if (st2.x > d.w - m)   { st2.x = d.w - m;   st2.vx = -Math.abs(st2.vx)*0.4; }

      /* uscita dal bordo alto: sparisce e viene risputata dopo un paio di
         secondi, sfalsata rispetto alle altre */
      if (st2.y < -st2.s*0.6){ st2.attesa = 1.0 + Math.random()*1.4; continue; }

      /* svanisce ai due capi, cosi' non compare e non sparisce di colpo */
      var op = Math.min(1, (b.y - st2.y)/26 + .4)
             * Math.min(1, (st2.y + st2.s*0.6)/(st2.s*0.9));
      el.style.opacity = clamp(op, 0, 1).toFixed(3);
      el.style.pointerEvents = op > .55 ? 'auto' : 'none';
      el.style.transform = 'translate3d('+st2.x.toFixed(1)+'px,'+st2.y.toFixed(1)+'px,0)';
    }
  }

  rendi(0);

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
  $('#social').innerHTML = social;
  $('#menuSocial').innerHTML = social;

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
   la maschera a gocce
   Il motore sta in blob-mask.js. Qui c'e' solo quando accenderlo: finche' si
   e' sulla copertina le gocce non arrivano — li' salgono gia' i pulsanti, e
   due sciami insieme sarebbero rumore. Appena la copertina scende sotto il
   30% di schermo visibile, cominciano.
   -------------------------------------------------------------------------- */
(function(){
  var palco = $('main.stage'), inv = $('#c-invert'), tin = $('#c-tint'), cop = $('#cop');
  if (!palco || !inv || !cop || !window.BlobMask) return;
  var mask = BlobMask.monta({ palco: palco, invert: inv, tint: tin });
  if (!mask) return;            /* niente WebGL: i canvas restano vuoti */

  function guarda(){
    var r = cop.getBoundingClientRect(), vh = window.innerHeight;
    var visto = Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top)) / vh;
    mask.livello(visto < .30 ? 1 : 0);
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
    immagine('assets/media/copertina.jpg'),
    immagine('assets/media/profilo.jpg')
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
