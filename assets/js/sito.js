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
   solo chi le lancia, quando e con che misure.

   Non e' un flusso continuo: partono ogni tanto, a gruppi, e nel punto piu'
   alto della scena arrivano tutte insieme.
   -------------------------------------------------------------------------- */
var Maschere = (function(){
  if (CALMO) return { lancia:function(){}, sciame:function(){} };

  /* solo tinte su cui il bianco resta leggibile: una maschera passa sopra al
     testo, e mentre passa il testo deve restare testo */
  var TINTE = ['#1B3BFF','#1B3BFF','#1B3BFF','#3A1BFF','#0A18A8','#0B0E1C'];
  /* ognuna costa un backdrop-filter a tutto schermo: poche, e mai tutte
     insieme, altrimenti il telefono lo si sente */
  var POOL  = LEGGERO ? 2 : 4;
  var liberi = [];

  for (var i=0;i<POOL;i++){
    var el = document.createElement('div');
    el.className = 'maschera';
    el.setAttribute('aria-hidden','true');
    document.body.appendChild(el);
    liberi.push(el);
  }

  function lancia(){
    var el = liberi.pop();
    if (!el) return false;
    var base = Math.min(window.innerWidth, 760);
    var s  = base * (0.42 + Math.random()*0.42);
    var x0 = 40 + Math.random()*(window.innerWidth - 80);
    var x1 = x0 + (Math.random()*2-1) * window.innerWidth * .34;
    var d  = 4.6 + Math.random()*4.2;

    el.style.setProperty('--s',  s.toFixed(0)+'px');
    el.style.setProperty('--x0', x0.toFixed(0)+'px');
    el.style.setProperty('--x1', x1.toFixed(0)+'px');
    el.style.setProperty('--d',  d.toFixed(2)+'s');
    el.style.setProperty('--dm', (d/2.1).toFixed(2)+'s');
    el.style.setProperty('--r',  ((Math.random()*2-1)*38).toFixed(0)+'deg');
    el.style.setProperty('--tinta', TINTE[(Math.random()*TINTE.length)|0]);

    /* il reflow forzato serve: senza, riaggiungere la classe nello stesso
       frame in cui e' stata tolta non fa ripartire l'animazione */
    void el.offsetWidth;
    el.classList.add('sale');

    el.addEventListener('animationend', function fine(e){
      if (e.animationName !== 'msale') return;
      el.removeEventListener('animationend', fine);
      el.classList.remove('sale');
      liberi.push(el);
    });
    return true;
  }

  function sciame(n, passo){
    for (var k=0;k<n;k++) setTimeout(lancia, k*(passo||420));
  }

  /* il ritmo normale: ogni tanto, senza regola che si senta */
  (function programma(){
    setTimeout(function(){
      if (!document.hidden) sciame(Math.random() < .3 ? 2 : 1, 900);
      programma();
    }, 6000 + Math.random()*12000);
  })();

  return { lancia: lancia, sciame: sciame };
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
   Due cose la rendono fluida. La prima: il progresso non e' quello dello
   scroll, e' un valore che lo insegue — cosi' il rimbalzo dello scroll di iOS
   non si vede. La seconda: fra un fotogramma e il successivo si disegna anche
   quello dopo, in trasparenza, quindi 60 fotogrammi si comportano come
   qualche centinaio.
   -------------------------------------------------------------------------- */
(function(){
  var sez = $('#imm'), cv = $('#cvImm');
  var barra = $('#immBarra'), pct = $('#immPct');
  var tappe = $$('#imm .tappa');
  var ctx = cv.getContext('2d', { alpha:true });
  var N = 60;                 /* deve corrispondere a strumenti/media.sh */
  var imgs = new Array(N), caricate = 0, pronta = false;
  var W=0,H=0,DPR=1;
  var pT = 0, p = 0, entrata = 0, dentro = false, sciamato = false;

  /* i contenuti veri di questa scena stanno in DATI, come tutto il resto */
  var uscita = (DATI.uscite && DATI.uscite[0]) || { t:'—', href:'#' };
  $('#immTit').textContent = uscita.t;
  $('#immElenco').innerHTML = DATI.piattaforme.map(function(x){ return x.nm; }).join(' &nbsp;·&nbsp; ');
  var cta = $('#immCta');
  var dove = uscita.href !== '#' ? uscita.href
           : (DATI.piattaforme[0] && DATI.piattaforme[0].href) || '#';
  cta.href = dove;
  if (dove !== '#'){ cta.target = '_blank'; cta.rel = 'noopener'; }

  function url(i){ return 'assets/media/seq/a-'+('0'+(i+1)).slice(-2)+'.webp'; }

  function misura(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W) return;
    cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    rendi(true);
  }

  function copri(im){
    var r = Math.max(W/im.width, H/im.height);
    var w = im.width*r, h = im.height*r;
    ctx.drawImage(im, (W-w)/2, (H-h)/2, w, h);
  }

  function fotogrammi(v){
    if (!pronta || !W) return;
    var f = clamp(v,0,1) * (N-1);
    var i0 = Math.floor(f), t = f - i0;
    var a = imgs[i0] || imgs[0];
    var b = imgs[Math.min(i0+1, N-1)];
    if (!a) return;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#0B0E1C'; ctx.fillRect(0,0,W,H);
    ctx.globalAlpha = 1; copri(a);
    /* la mezza misura fra due fotogrammi: e' quello che toglie lo scatto */
    if (b && b !== a && t > .004){ ctx.globalAlpha = t; copri(b); ctx.globalAlpha = 1; }
  }

  function smorza(t){ return t*t*(3-2*t); }
  function fascia(v,a,b){
    var m = .09;
    return smorza(mappa(v,a,a+m)) * (1 - smorza(mappa(v,b-m,b)));
  }

  function rendi(forza){
    var s = mappa(p, .04, .96);
    fotogrammi(s);
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
    if (p > .70 && !sciamato){ sciamato = true; Maschere.sciame(LEGGERO ? 2 : 4, 520); }
    if (p < .55) sciamato = false;

    document.body.classList.toggle('notte', p > .02 && p < .985);
  }

  /* si carica solo quando la sezione si avvicina: non pesa sull'apertura */
  var pre = new IntersectionObserver(function(vs){
    if (!vs[0].isIntersecting) return;
    pre.disconnect();
    for (var i=0;i<N;i++){
      (function(i){
        immagine(url(i)).then(function(im){
          imgs[i] = im;
          if (++caricate >= 4 && !pronta){ pronta = true; misura(); }
        }, function(){ caricate++; });
      })(i);
    }
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
    /* il progresso insegue lo scroll invece di copiarlo: e' tutta qui la
       differenza fra una sequenza che scatta e una che scorre */
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

  /* il motivo torna anche fuori dalla scena: una maschera sola, quando la
     sezione entra, e non tutte le volte */
  var oss = new IntersectionObserver(function(vs){
    vs.forEach(function(v){
      if (v.isIntersecting && Math.random() < .7) setTimeout(Maschere.lancia, 500);
    });
  }, { threshold:.35 });
  [$('#musica'), $('#caleido'), $('#chi'), $('#contatti')].forEach(function(s){ if(s) oss.observe(s); });
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
