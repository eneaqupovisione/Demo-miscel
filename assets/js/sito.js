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

  scheda: [
    ['Genere', 'Indie'],
    ['Lingua', 'Italiano'],
    ['Formazione', 'Voce e chitarra'],
    ['Dal vivo', 'Set breve, senza scaletta fissa']
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
  var oltre = function(){
    document.body.classList.toggle('oltre', window.scrollY > window.innerHeight * .72);
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
   le bolle
   Due strati di div sfocati che salgono. Nessun canvas: il compositore del
   browser muove i transform sulla GPU, ed e' l'unica strada per avere una
   cosa del genere fluida su un telefono.
   -------------------------------------------------------------------------- */
var Bolle = (function(){
  var amb = $('#bolleAmb'), burst = $('#bolleBurst');
  if (CALMO) return { livello: function(){}, colpo: function(){} };

  var TAV = {
    amb:  ['#C3C5CB','#D9D4C8','#8B8F99','#6C86FF','#E8E4DA'],
    fuoco:['#1B3BFF','#3A1BFF','#0A18A8','#F2EFE8','#0B0E1C','#6C86FF','#1B3BFF','#C3C5CB']
  };

  function crea(box, n, cfg){
    var h = '';
    for (var i=0;i<n;i++){
      var c  = cfg.col[(Math.random()*cfg.col.length)|0];
      var s  = cfg.s[0] + Math.random()*(cfg.s[1]-cfg.s[0]);
      var d  = cfg.d[0] + Math.random()*(cfg.d[1]-cfg.d[0]);
      var dl = -Math.random()*d;
      var b  = cfg.b[0] + Math.random()*(cfg.b[1]-cfg.b[0]);
      /* la deriva orizzontale: quattro tappe, mai una linea retta */
      var x0 = cfg.x0(i,n), sp = cfg.sp;
      var x1 = x0 + (Math.random()*2-1)*sp;
      var x2 = x0 + (Math.random()*2-1)*sp*1.5;
      var x3 = x0 + (Math.random()*2-1)*sp*2;
      h += '<span class="bolla" style="'
         + '--s:'+s.toFixed(1)+'vmin;--b:'+b.toFixed(0)+'px;'
         + '--c1:'+c+'ee;--c2:'+c+'44;'
         + '--d:'+d.toFixed(2)+'s;--dl:'+dl.toFixed(2)+'s;'
         + '--x0:'+x0.toFixed(1)+'vw;--x1:'+x1.toFixed(1)+'vw;'
         + '--x2:'+x2.toFixed(1)+'vw;--x3:'+x3.toFixed(1)+'vw;'
         + '"></span>';
    }
    box.innerHTML = h;
  }

  crea(amb, LEGGERO ? 4 : 6, {
    col: TAV.amb, s:[70,130], d:[46,86], b:[54,92], sp:9,
    x0: function(i,n){ return 8 + (i/(n-1||1))*84 + (Math.random()*14-7); }
  });

  /* Lo scoppio parte dal lato destro, da dove entra il viso, e si allarga:
     le bolle "escono dalla faccia" e invadono lo schermo salendo. */
  crea(burst, LEGGERO ? 10 : 16, {
    col: TAV.fuoco, s:[26,74], d:[3.0,6.4], b:[16,44], sp:16,
    x0: function(i,n){ return 62 + (Math.random()*2-1)*46 * (i/(n-1||1)); }
  });

  /* Lo strato di scoppio passa SOPRA al testo: si accende solo dentro
     all'immersione, dove non c'e' niente da leggere. Altrove il motivo torna
     alzando lo strato di fondo, che sta dietro ai contenuti e non li sporca. */
  var liv = 0, obiettivo = 0, ambLiv = .42, colpoFino = 0;
  (function giro(){
    liv = lerp(liv, obiettivo, .08);
    burst.style.opacity = liv.toFixed(3);
    var a = (Date.now() < colpoFino) ? .82 : .42;
    ambLiv = lerp(ambLiv, a, .045);
    amb.style.opacity = ambLiv.toFixed(3);
    requestAnimationFrame(giro);
  })();

  return {
    livello: function(v){ obiettivo = clamp(v,0,1); },
    colpo:   function(ms){ colpoFino = Date.now() + (ms||2600); },
    semina:  function(box, n){ crea(box, n, {
      col: ['#1B3BFF','#3A1BFF','#6C86FF','#0A18A8'], s:[16,42], d:[9,19], b:[22,40], sp:10,
      x0: function(i,nn){ return 6 + (i/(nn-1||1))*88; }
    }); }
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

  document.addEventListener('entrati', function(){
    cop.classList.add('pronta');
    var p = video.play(); if (p && p.catch) p.catch(function(){});
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
   immersione: la sequenza comandata dallo scroll
   -------------------------------------------------------------------------- */
(function(){
  var sez = $('#imm'), cv = $('#cvImm'), velo = $('#immVelo');
  var barra = $('#immBarra'), pct = $('#immPct');
  var fiati = $$('#imm .fiato');
  var ctx = cv.getContext('2d', { alpha:false });
  var N = 48, imgs = new Array(N), caricate = 0, pronta = false;
  var W=0,H=0,DPR=1, ultimo = -1, p = 0;

  function url(i){ return 'assets/media/seq/a-'+('0'+(i+1)).slice(-2)+'.webp'; }

  function misura(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ultimo = -1; disegna(p);
  }

  function disegna(v){
    if (!pronta) return;
    var i = clamp(Math.round(v*(N-1)), 0, N-1);
    if (i === ultimo) return;
    var im = imgs[i]; if (!im) return;
    ultimo = i;
    var r = Math.max(W/im.width, H/im.height);
    var w = im.width*r, h = im.height*r;
    ctx.fillStyle = '#F2EFE8'; ctx.fillRect(0,0,W,H);
    ctx.drawImage(im, (W-w)/2, (H-h)/2, w, h);
  }

  /* si carica solo quando la sezione si avvicina: non pesa sull'apertura */
  var pre = new IntersectionObserver(function(vs){
    if (!vs[0].isIntersecting) return;
    pre.disconnect();
    for (var i=0;i<N;i++){
      (function(i){
        immagine(url(i)).then(function(im){
          imgs[i] = im; caricate++;
          if (caricate >= 6 && !pronta){ pronta = true; misura(); }
          if (caricate === N) { ultimo = -1; disegna(p); }
        }, function(){ caricate++; });
      })(i);
    }
  }, { rootMargin: '150% 0px' });
  pre.observe(sez);

  window.addEventListener('resize', function(){ alFrame(misura); });

  function scorri(){
    var r = sez.getBoundingClientRect();
    var alt = sez.offsetHeight - window.innerHeight;
    p = clamp(-r.top / (alt||1), 0, 1);

    /* la scena occupa il centro della corsa; le code servono a entrare e uscire */
    var s = mappa(p, .06, .94);
    disegna(s);

    velo.style.opacity = (1 - mappa(p, .0, .10)) + mappa(p, .93, 1);
    barra.style.width = (s*100).toFixed(1)+'%';
    pct.textContent = ('0'+Math.round(s*99)).slice(-2);

    fiati.forEach(function(f){
      var a = parseFloat(f.dataset.a), b = parseFloat(f.dataset.b);
      f.classList.toggle('on', s > a && s < b);
    });

    /* l'espirazione: le bolle escono e colorano tutto */
    var soffio = mappa(s, .60, .74) * (1 - mappa(s, .92, 1));
    Bolle.livello(soffio);

    document.body.classList.toggle('notte', p > .02 && p < .985);
  }
  window.addEventListener('scroll', function(){ alFrame(scorri); }, {passive:true});
  window.addEventListener('resize', function(){ alFrame(scorri); });
  document.addEventListener('entrati', function(){ misura(); scorri(); });
})();

/* --------------------------------------------------------------------------
   musica: le uscite, e la lastra che si apre di fianco
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
         +   '<span class="nm">'+p.nm+'</span><span class="fr">Apri →</span>'
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

  /* qualche bolla passa anche qui: il motivo torna, piu' piano */
  var oss = new IntersectionObserver(function(vs){
    vs.forEach(function(v){ if (v.isIntersecting) Bolle.colpo(3000); });
  }, { threshold:.35 });
  [$('#musica'), $('#caleido'), $('#contatti')].forEach(function(s){ if(s) oss.observe(s); });
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
  $('#cBooking').textContent = DATI.booking; $('#cBooking').href = 'mailto:'+DATI.booking;
  $('#cMgmt').textContent   = DATI.management; $('#cMgmt').href = 'mailto:'+DATI.management;
  $('#cPress').textContent  = DATI.stampa; $('#cPress').href = 'mailto:'+DATI.stampa;

  var social = DATI.social.map(function(s){
    return '<a href="'+s.href+'" '+(s.href!=='#'?'target="_blank" rel="noopener"':'')+'>'+s.nm+'</a>';
  }).join('');
  $('#social').innerHTML = social;
  var loc = $('#bolleContatti');
  if (loc && Bolle.semina) Bolle.semina(loc, 7);
  $('#menuSocial').innerHTML = social;

  $('#dati').innerHTML = DATI.scheda.map(function(r){
    return '<div><dt class="mono">'+r[0]+'</dt><dd>'+r[1]+'</dd></div>';
  }).join('');

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
   partenza
   -------------------------------------------------------------------------- */
(function(){
  var attese = [
    immagine('assets/media/copertina.jpg'),
    immagine('assets/media/ritratto-vuoto.jpg'),
    immagine('assets/media/ritratto-pieno.jpg'),
    immagine('assets/media/seq/a-01.webp')
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
