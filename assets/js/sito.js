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

  /* PROVVISORIO — link alle piattaforme */
  piattaforme: [
    { nm:'Spotify',      href:'#' },
    { nm:'Apple Music',  href:'#' },
    { nm:'YouTube',      href:'#' },
    { nm:'Bandcamp',     href:'#' },
    { nm:'SoundCloud',   href:'#' }
  ],

  /* PROVVISORIO — social */
  social: [
    { nm:'Instagram', href:'#' },
    { nm:'TikTok',    href:'#' },
    { nm:'YouTube',   href:'#' }
  ],

  nastro: ['Trattieni il fiato', 'Nuovo singolo', 'Ascolta ora', 'Scrivi per una data']
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

var CALMO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var PUNTATORE = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
/* schermi piccoli o pochi core: si tolgono le cose che costano */
var LEGGERO = (navigator.hardwareConcurrency || 4) <= 4 && !PUNTATORE;

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
    var t = e.target.closest('a,button,.scena,.torcia');
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
   le maschere
   Forme piene a bordo netto che salgono dal basso e ribaltano quello che
   coprono: dentro la sagoma il fondo diventa blu e il testo bianco, fuori non
   cambia niente. Il lavoro lo fa il CSS (backdrop-filter + screen); qui c'e'
   chi le lancia, quando, con che misure — e quanto vanno veloci.

   Non e' un flusso ordinato: escono a gruppi sparsi, misure diverse dentro
   allo stesso gruppo, e quando si scorre accelerano invece di restare ferme.
   -------------------------------------------------------------------------- */
var Maschere = (function(){
  if (CALMO) return { lancia:function(){}, gruppo:function(){}, sciame:function(){} };

  /* solo tinte su cui il bianco resta leggibile: una maschera passa sopra al
     testo, e mentre passa il testo deve restare testo */
  var TINTE = ['#1B3BFF','#1B3BFF','#1B3BFF','#3A1BFF','#0A18A8','#0B0E1C'];
  /* il costo di una maschera e' un backdrop-filter senza sfocatura — una
     operazione per pixel, non un blur — quindi se ne reggono parecchie.
     Sui dispositivi dichiaratamente deboli si scende comunque. */
  var POOL  = LEGGERO ? 5 : 11;
  var liberi = [], attive = [];

  for (var i=0;i<POOL;i++){
    var el = document.createElement('div');
    el.className = 'maschera';
    el.setAttribute('aria-hidden','true');
    document.body.appendChild(el);
    liberi.push(el);
  }

  function lancia(centro){
    var el = liberi.pop();
    if (!el) return false;
    var vw = window.innerWidth;
    var base = Math.min(vw, 820);
    /* la curva tiene basse le misure: tante piccole, ogni tanto una grande.
       Se fossero tutte grandi si coprirebbe lo schermo, e una maschera che
       copre tutto non e' piu' una maschera, e' un cambio di tema. */
    var q  = Math.pow(Math.random(), 1.9);
    var s  = base * (0.09 + q * 0.46);
    var x0 = (centro === undefined ? 30 + Math.random()*(vw-60)
                                   : centro + (Math.random()*2-1) * vw * .19);
    x0 = clamp(x0, -s*.2, vw + s*.2);
    var x1 = x0 + (Math.random()*2-1) * vw * .30;
    /* le piccole salgono un po' piu' svelte: e' quello che fanno le bolle */
    var d  = 5.2 + q*6.5 + Math.random()*2.6;

    el.style.setProperty('--s',  s.toFixed(0)+'px');
    el.style.setProperty('--x0', x0.toFixed(0)+'px');
    el.style.setProperty('--x1', x1.toFixed(0)+'px');
    el.style.setProperty('--d',  d.toFixed(2)+'s');
    el.style.setProperty('--dm', (d/2.3).toFixed(2)+'s');
    el.style.setProperty('--r',  ((Math.random()*2-1)*44).toFixed(0)+'deg');
    el.style.setProperty('--tinta', TINTE[(Math.random()*TINTE.length)|0]);

    /* il reflow forzato serve: senza, riaggiungere la classe nello stesso
       frame in cui e' stata tolta non fa ripartire l'animazione */
    void el.offsetWidth;
    el.classList.add('sale');
    el.anim = el.getAnimations ? el.getAnimations() : [];
    for (var k=0;k<el.anim.length;k++) el.anim[k].playbackRate = spinta;
    attive.push(el);

    el.addEventListener('animationend', function fine(e){
      if (e.animationName !== 'msale') return;
      el.removeEventListener('animationend', fine);
      el.classList.remove('sale');
      el.anim = null;
      var j = attive.indexOf(el); if (j >= 0) attive.splice(j,1);
      liberi.push(el);
    });
    return true;
  }

  /* un gruppo: due-cinque maschere che escono vicine, sfalsate, di misure
     diverse. Sparse, non in fila. */
  function gruppo(quante){
    var n = quante || (2 + (Math.random()*4|0));
    var cx = 30 + Math.random()*(window.innerWidth - 60);
    for (var k=0;k<n;k++){
      (function(k){ setTimeout(function(){ lancia(cx); }, k*(110 + Math.random()*260)); })(k);
    }
  }
  function sciame(n, passo){
    for (var k=0;k<n;k++) setTimeout(lancia, k*(passo||300));
  }

  /* --- la spinta dello scroll -------------------------------------------
     Chiesto esplicitamente: mentre si scorre non devono restare ferme, devono
     andare piu' su. Non si tocca la durata (cambiarla farebbe ripartire
     l'animazione da capo): si alza il playbackRate, che accelera quello che
     e' gia' in corso senza uno scatto. */
  var spinta = 1, velocita = 0, ultimaY = window.scrollY, ultimoT = performance.now();
  window.addEventListener('scroll', function(){
    var y = window.scrollY, t = performance.now();
    var dt = Math.max(t - ultimoT, 8);
    velocita = Math.max(velocita, Math.abs(y - ultimaY) / dt * 16.7);
    ultimaY = y; ultimoT = t;
  }, {passive:true});

  (function giro(){
    requestAnimationFrame(giro);
    velocita *= .90;
    var k = 1 + Math.min(velocita / 11, 3.6);
    if (Math.abs(k - spinta) < .03) return;
    spinta = k;
    for (var i=0;i<attive.length;i++){
      var a = attive[i].anim;
      if (!a) continue;
      for (var j=0;j<a.length;j++) a[j].playbackRate = spinta;
    }
  })();

  /* il ritmo: gruppi ravvicinati, senza una regola che si senta */
  (function programma(){
    setTimeout(function(){
      if (!document.hidden) gruppo();
      programma();
    }, 2200 + Math.random()*4200);
  })();

  /* le prime si vedono subito: appena il sipario si alza ce n'e' gia' un
     gruppo in mezzo alla copertina, se no il motivo si scopre solo scorrendo */
  document.addEventListener('entrati', function(){
    gruppo(LEGGERO ? 2 : 4);
    setTimeout(function(){ gruppo(LEGGERO ? 2 : 3); }, 2800);
  });

  return { lancia: lancia, gruppo: gruppo, sciame: sciame };
})();

/* --------------------------------------------------------------------------
   la sequenza dell'acqua
   Sessanta fotogrammi, caricati una volta sola e disegnati da due scene
   diverse: quella del singolo e il respiro dietro a "Chi e'". Fra un
   fotogramma e il successivo si disegna anche quello dopo in trasparenza:
   e' la mezza misura che toglie lo scatto.
   -------------------------------------------------------------------------- */
var Sequenza = (function(){
  var N = 60;                 /* deve corrispondere a strumenti/media.sh */
  var imgs = new Array(N), caricate = 0, chiesta = false, pronta = false;
  var attesa = [];

  function url(i){ return 'assets/media/seq/a-'+('0'+(i+1)).slice(-2)+'.webp'; }

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

  function disegna(ctx, W, H, v, fondo){
    if (!pronta || !W) return false;
    var f = clamp(v,0,1) * (N-1);
    var i0 = Math.floor(f), t = f - i0;
    var a = imgs[i0] || imgs[0];
    var b = imgs[Math.min(i0+1, N-1)];
    if (!a) return false;
    ctx.clearRect(0,0,W,H);
    if (fondo){ ctx.fillStyle = fondo; ctx.fillRect(0,0,W,H); }
    ctx.globalAlpha = 1; copri(ctx, a, W, H);
    if (b && b !== a && t > .004){ ctx.globalAlpha = t; copri(ctx, b, W, H); ctx.globalAlpha = 1; }
    return true;
  }

  return {
    N: N,
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
   nastri
   -------------------------------------------------------------------------- */
(function(){
  var testo = DATI.nastro.map(function(s){
    return '<span>'+s+' <b>◆</b></span>';
  }).join('');
  /* due volte: l'animazione scorre di meta' larghezza e non si vede il salto */
  $('#nastro1').innerHTML = testo + testo + testo + testo;
  $('#nastro2').innerHTML = testo + testo + testo + testo;
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
  var pT = 0, p = 0, entrata = 0, dentro = false, sciamato = false;

  /* i contenuti veri di questa scena stanno in DATI, come tutto il resto */
  var uscita = (DATI.uscite && DATI.uscite[0]) || { t:'—', href:'#' };
  $('#immTit').textContent = uscita.t;
  var cta = $('#immCta');
  var dove = uscita.href !== '#' ? uscita.href
           : (DATI.piattaforme[0] && DATI.piattaforme[0].href) || '#';
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

  function smorza(t){ return t*t*(3-2*t); }
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

    /* lo sciame arriva una volta sola per passaggio, sull'ultima tappa */
    if (p > .68 && !sciamato){ sciamato = true; Maschere.gruppo(LEGGERO ? 3 : 5); }
    if (p < .5) sciamato = false;

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
  function rendi(){ Sequenza.disegna(ctx, W, H, p); }

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
    Maschere.gruppo(2);
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
   ascolta: le uscite, le piattaforme, e la lastra che si apre di fianco
   -------------------------------------------------------------------------- */
(function(){
  var box = $('#uscite'), piatt = $('#piatt'), lastra = $('#lastra');
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

  piatt.innerHTML = DATI.piattaforme.map(function(p){
    return '<a href="'+p.href+'" '+(p.href!=='#'?'target="_blank" rel="noopener"':'')+'>'
         +   '<span>'+p.nm+'</span><span class="fr">→</span>'
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

  /* il motivo torna anche fuori dalla scena: una maschera sola, quando la
     sezione entra, e non tutte le volte */
  var oss = new IntersectionObserver(function(vs){
    vs.forEach(function(v){
      if (v.isIntersecting) setTimeout(function(){ Maschere.gruppo(2); }, 420);
    });
  }, { threshold:.35 });
  [$('#ascolta'), $('#caleido'), $('#contatti')].forEach(function(s){ if(s) oss.observe(s); });
})();

/* --------------------------------------------------------------------------
   caleidoscopio
   Lo stesso fotogramma ripetuto a spicchi, specchiato uno si' e uno no.
   Si trascina: orizzontale gira, verticale cambia il numero di specchi.
   -------------------------------------------------------------------------- */
(function(){
  var scena = $('#scena'), cv = $('#cvCal'), video = $('#vCal');
  var nOut = $('#calN'), rOut = $('#calR');
  var ctx = cv.getContext('2d');
  var W=0,H=0,DPR=1, segmenti = 8, rot = 0, vel = .0016, dentro = false, pronto = false;

  function misura(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', function(){ alFrame(misura); });

  var ultimoTentativo = 0;
  function disegna(){
    if (!dentro){ return; }
    requestAnimationFrame(disegna);
    /* se il video si e' fermato per conto suo — cambio di scheda, risparmio
       energetico, permesso negato — si riparte da soli */
    if (video.paused && Date.now() - ultimoTentativo > 900){
      ultimoTentativo = Date.now(); tentativi = 0; avvia();
    }
    if (!pronto || video.readyState < 2 || !W) return;

    var R = Math.hypot(W,H)*0.55;
    var cx = W/2, cy = H/2;
    var vw = video.videoWidth, vh = video.videoHeight;
    if (!vw) return;

    ctx.fillStyle = '#05070F';
    ctx.fillRect(0,0,W,H);

    rot += vel;
    var passo = Math.PI*2/segmenti;

    /* Uno spicchio e' un triangolo largo 2R·tan(π/N) e alto R: il ritaglio
       del fotogramma deve avere esattamente quelle proporzioni, altrimenti
       o resta del nero fuori o si finisce dentro a una zona bruciata.
       La fascia scorre lentamente lungo il verticale: e' quello che fa
       cambiare il disegno mentre lo si guarda. */
    var tanA = Math.tan(Math.PI/segmenti);
    var dw = R, dh = 2*R*tanA;
    var ar = dw/dh;
    /* Il ritaglio prende tutta la larghezza del fotogramma: e' l'unico modo
       per essere certi che dentro allo spicchio ci finisca la colonna nera e
       non solo il bianco che le sta intorno. A muoversi e' la fascia
       verticale, ed e' quello che fa cambiare il disegno mentre lo guardi. */
    var sw = vw, sh = sw/ar;
    if (sh > vh){ sh = vh; sw = sh*ar; }
    var deriva = (Math.sin(rot*.5) * .5 + .5);
    var sx = (vw - sw)/2;
    var sy = (vh - sh) * (0.12 + deriva*0.76);

    for (var i=0;i<segmenti;i++){
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i*passo + rot);
      if (i % 2) ctx.scale(1,-1);
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,R,-passo/2, passo/2);
      ctx.closePath();
      ctx.clip();
      /* la fascia si ripete due volte lungo il raggio, la seconda specchiata:
         e' quello che in un caleidoscopio vero fa il tubo lungo, e qui serve a
         non lasciare mezzo spicchio vuoto quando la colonna nera sta tutta da
         una parte del fotogramma */
      var passoR = dw/2;
      for (var r=0;r<2;r++){
        ctx.save();
        ctx.translate(r*passoR, 0);
        if (r === 1){ ctx.translate(passoR,0); ctx.scale(-1,1); }
        ctx.drawImage(video, sx, sy, sw, sh, 0, -dh/2, passoR, dh);
        ctx.restore();
      }
      ctx.restore();
    }

    /* un velo blu sottilissimo tiene insieme il caleidoscopio e il sito */
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(27,59,255,.13)';
    ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation = 'source-over';

    rOut.textContent = ('00'+Math.round((rot*180/Math.PI)%360+360)%360).slice(-3)+'°';
  }

  /* play() subito dopo load() viene abortito dal browser: si chiede solo di
     partire, e se il permesso non arriva si ritenta — anche al primo tocco,
     che e' il gesto che sblocca l'autoplay dove e' negato. */
  var tentativi = 0;
  function avvia(){
    if (!dentro) return;
    var p = video.play();
    if (p && p.catch) p.catch(function(){
      if (tentativi++ < 6) setTimeout(avvia, 350);
    });
  }
  document.addEventListener('pointerdown', function(){ tentativi = 0; avvia(); }, {once:false, passive:true});

  var oss = new IntersectionObserver(function(vs){
    var v = vs[0].isIntersecting;
    dentro = v;
    if (v){
      if (!pronto){ pronto = true; misura(); }
      tentativi = 0; avvia();
      requestAnimationFrame(disegna);
    } else { video.pause(); }
  }, { threshold:.12 });
  oss.observe(scena);
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden && dentro){ tentativi = 0; avvia(); }
  });

  /* trascinamento */
  var giu = false, px = 0, py = 0;
  scena.addEventListener('pointerdown', function(e){
    giu = true; px = e.clientX; py = e.clientY;
    scena.classList.add('tocca-via');
    scena.setPointerCapture && scena.setPointerCapture(e.pointerId);
  });
  scena.addEventListener('pointermove', function(e){
    if (!giu) return;
    var dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY;
    rot += dx * .006;
    if (Math.abs(dy) > 14){
      segmenti = clamp(segmenti + (dy < 0 ? 2 : -2), 4, 16);
      nOut.textContent = ('0'+segmenti).slice(-2);
      py = e.clientY;
    }
  });
  ['pointerup','pointercancel','pointerleave'].forEach(function(t){
    scena.addEventListener(t, function(){ giu = false; });
  });
  /* lo scroll fa girare piano anche senza toccare */
  window.addEventListener('scroll', function(){
    if (!dentro) return;
    vel = .0016 + Math.min(Math.abs(window.scrollY - (window._sy||0))*.00012, .012);
    window._sy = window.scrollY;
  }, {passive:true});
  setInterval(function(){ vel = lerp(vel, .0016, .3); }, 120);
})();

/* --------------------------------------------------------------------------
   il ritratto a raggi X
   Due lastre sovrapposte: quella piena si vede solo dentro al cerchio.
   -------------------------------------------------------------------------- */
(function(){
  var box = $('#torcia'); if (!box) return;
  var attivo = false, t0 = performance.now();

  function metti(x,y,r){
    box.style.setProperty('--x', x+'px');
    box.style.setProperty('--y', y+'px');
    if (r) box.style.setProperty('--r', r+'px');
  }
  function raggio(){ return clamp(box.clientWidth*.34, 70, 190); }

  function muovi(e){
    var b = box.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    attivo = true;
    metti((p.clientX-b.left).toFixed(0), (p.clientY-b.top).toFixed(0), raggio().toFixed(0));
  }
  box.addEventListener('pointermove', muovi, {passive:true});
  box.addEventListener('touchmove',  muovi, {passive:true});
  box.addEventListener('pointerleave', function(){ attivo = false; t0 = performance.now(); });

  /* se nessuno tocca, la torcia gira da sola: sul telefono e' l'unico modo
     perche' l'effetto si mostri senza istruzioni */
  (function giro(t){
    requestAnimationFrame(giro);
    if (attivo || CALMO) return;
    var k = (t - t0)/1000;
    var w = box.clientWidth, h = box.clientHeight;
    if (!w) return;
    metti((w*(.5 + Math.sin(k*.42)*.29)).toFixed(0),
          (h*(.44 + Math.cos(k*.31)*.26)).toFixed(0),
          raggio().toFixed(0));
  })(t0);
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
    immagine('assets/media/ritratto-vuoto.jpg'),
    immagine('assets/media/ritratto-pieno.jpg'),
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
