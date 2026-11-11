/* Theme, palette and hero switching, copy swaps, hero film, contour lines, rails, and the switcher UI.
   Needs no changes to add a design. */
(function () {
  'use strict';
  var THEMES = window.SUMMIT_THEMES || [];
  var HEROES = window.SUMMIT_HEROES || [];
  if (!THEMES.length) return;

  var root = document.documentElement;
  var KEY = 'summit-style', HKEY = 'summit-hero', OKEY = 'summit-switcher-open';
  var params = new URLSearchParams(location.search);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var ready = false, current = null, currentPalette = null, currentHero = null, switcher = null;
  var themeGroup = null, paletteGroup = null, heroGroup = null;
  if (params.get('embed')) root.classList.add('is-embed'); /* framed in preview.html */

  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; }
  function find(id) { return byId(THEMES, id); }
  function store(key, v) { try { if (v === undefined) return localStorage.getItem(key); localStorage.setItem(key, v); } catch (e) {} }
  function paletteKey(t) { return KEY + '-palette-' + t.id; }
  function findPalette(t, id) { return byId(t.palettes || [], id); }
  function paletteFor(t, requested) {
    return findPalette(t, requested) || findPalette(t, store(paletteKey(t))) || (t.palettes || [])[0] || null;
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function updateThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    var color = currentPalette && currentPalette.themeColor || current.color;
    if (meta && color) meta.setAttribute('content', color);
  }
  function syncGroup(group, id) {
    if (!group) return;
    group.querySelectorAll('.ss-btn').forEach(function (b) {
      var on = b.dataset.id === id;
      b.setAttribute('aria-checked', on);
      b.tabIndex = on ? 0 : -1;
      if (on && b.scrollIntoView && switcher && switcher.classList.contains('is-open')) {
        var o = b.parentNode; o.scrollLeft = Math.max(0, b.offsetLeft - o.clientWidth / 2 + b.offsetWidth / 2);
      }
    });
  }
  function makeBtn(item, onClick, swatch) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ss-btn'; b.dataset.id = item.id;
    b.setAttribute('role', 'radio');
    if (swatch) {
      var s = document.createElement('span');
      s.className = 'ss-swatch'; s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--swatch', item.color || 'currentColor');
      b.appendChild(s);
    }
    b.appendChild(document.createTextNode(item.label));
    b.addEventListener('click', function () { onClick(item.id); });
    return b;
  }
  function updatePaletteOptions() {
    if (!paletteGroup) return;
    var opts = paletteGroup.querySelector('.ss-opts');
    opts.replaceChildren();
    (current.palettes || []).forEach(function (p) { opts.appendChild(makeBtn(p, setPalette, true)); });
    syncGroup(paletteGroup, currentPalette && currentPalette.id);
  }
  function updateSummary() {
    if (!switcher) return;
    var s = switcher.querySelector('.ss-summary');
    s.innerHTML = '';
    var b = document.createElement('b'); b.textContent = current.label; s.appendChild(b);
    s.appendChild(document.createTextNode(' · ' + (currentPalette ? currentPalette.label : '') + ' · ' + (currentHero ? currentHero.label : '')));
    var board = switcher.querySelector('.ss-board');
    if (board) board.href = 'preview.html?style=' + current.id + (currentPalette ? '&palette=' + currentPalette.id : '') + '&device=' + (innerWidth < 760 ? 'phone' : 'desktop');
  }

  /* ---- apply a design ---- */
  function commit(t) {
    var changed = current !== t;
    var firstTheme = current === null;
    if (current && changed && current.onLeave) current.onLeave(root);
    current = t;
    if (changed) {
      currentPalette = paletteFor(t, firstTheme ? params.get('palette') : null);
      if (currentPalette) store(paletteKey(t), currentPalette.id);
    }
    root.setAttribute('data-theme', t.id);
    if (currentPalette) root.setAttribute('data-palette', currentPalette.id);
    if (!ready) return;
    document.querySelectorAll('[data-copy]').forEach(function (el) {
      if (!('copyDefault' in el.dataset)) el.dataset.copyDefault = el.textContent;
      var v = t.copy && t.copy[el.dataset.copy];
      el.textContent = v != null ? v : el.dataset.copyDefault;
    });
    updateThemeColor();
    syncGroup(themeGroup, t.id);
    updatePaletteOptions();
    updateSummary();
    drawAll();
    Hero.refresh();
    if (t.onEnter) t.onEnter(root);
    document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }

  function setTheme(id) {
    var t = find(id);
    if (!t || t === current) return;
    function apply() { commit(t); store(KEY, t.id); updateUrl(); }
    if (document.startViewTransition && !reduce.matches && ready) document.startViewTransition(apply);
    else apply();
  }

  function setPalette(id) {
    var p = findPalette(current, id);
    if (!p || p === currentPalette) return;
    currentPalette = p;
    root.setAttribute('data-palette', p.id);
    store(paletteKey(current), p.id);
    syncGroup(paletteGroup, p.id);
    updateThemeColor();
    updateSummary();
    updateUrl();
    drawAll();
    Hero.refresh();
    document.dispatchEvent(new CustomEvent('palettechange', { detail: { theme: current, palette: p } }));
  }

  function commitHero(h) {
    currentHero = h;
    root.setAttribute('data-hero', h.id);
    if (!ready) return;
    syncGroup(heroGroup, h.id);
    updateSummary();
    Hero.refresh(true);
  }
  function setHero(id) {
    var h = byId(HEROES, id);
    if (!h || h === currentHero) return;
    if (scrollY > 40) window.scrollTo({ top: 0, behavior: 'instant' });
    commitHero(h);
    store(HKEY, h.id);
    updateUrl();
  }

  function updateUrl() {
    try {
      var u = new URL(location.href);
      u.searchParams.set('style', current.id);
      if (currentPalette) u.searchParams.set('palette', currentPalette.id);
      if (currentHero) u.searchParams.set('hero', currentHero.id);
      history.replaceState(null, '', u);
    } catch (e) {}
  }

  function cycle(list, cur, dir) { return list[(list.indexOf(cur) + dir + list.length) % list.length]; }
  function step(dir) { setTheme(cycle(THEMES, current, dir).id); }
  function stepPalette(dir) { var p = current.palettes || []; if (p.length) setPalette(cycle(p, currentPalette, dir).id); }
  function stepHero(dir) { if (HEROES.length) setHero(cycle(HEROES, currentHero, dir).id); }

  /* first paint: ?style=... beats remembered choice beats first entry */
  commit(find(params.get('style')) || find(store(KEY)) || THEMES[0]);
  if (HEROES.length) commitHero(byId(HEROES, params.get('hero')) || byId(HEROES, store(HKEY)) || HEROES[0]);

  /* ---- contour lines (drawn only when a design shows the canvas) ---- */
  function contours(cv, o) {
    o = o || {};
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    var cs = getComputedStyle(cv);
    var line = o.line || cs.getPropertyValue('--contour-line').trim() || '125,141,57';
    var fade = cs.getPropertyValue('--contour-fade').trim() || '14,16,14';
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    var ph = o.phase || 0, alpha = o.alpha || 1;
    var cx = w / 2, cy = h * (o.cy || 0.55), unit = o.unit || 20, rings = o.rings || 30;
    for (var k = 1; k <= rings; k++) {
      c.beginPath();
      for (var a = 0; a <= Math.PI * 2 + 0.01; a += 0.025) {
        var r = k * unit * (1 + 0.16 * Math.sin(3 * a + k * 0.21 + ph) + 0.08 * Math.sin(5 * a - k * 0.37 - ph * 1.3) + 0.05 * Math.cos(7 * a + k * 0.13 + ph * 0.7));
        var x = cx + Math.cos(a) * r * 1.35, y = cy + Math.sin(a) * r * 0.82;
        a ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.strokeStyle = 'rgba(' + line + ',' + (k % 5 === 0 ? .30 : .12) * alpha + ')';
      c.lineWidth = k % 5 === 0 ? 1.2 : .8;
      c.stroke();
    }
    if (o.fade === false) return;
    var g = c.createLinearGradient(0, h * .65, 0, h);
    g.addColorStop(0, 'rgba(' + fade + ',0)'); g.addColorStop(1, 'rgba(' + fade + ',1)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  function drawAll() { document.querySelectorAll('canvas[data-contour]').forEach(function (cv) { contours(cv); }); }

  /* ---- hero film and the per-variant builders ---- */
  var Hero = (function () {
    var section, pin, media, video, toggle, knock, geo, cv, inner, timecodes, ctx;
    var visible = true, userPaused = false, userPlay = false, loaded = false, scrollRaf = 0, animRaf = 0, knockFocus = null;
    var saveData = !!(navigator.connection && navigator.connection.saveData);

    function hid() { return currentHero ? currentHero.id : 'classic'; }
    function usesVideo() { return hid() !== 'classic'; }
    function autoplayAllowed() { return userPlay || !(reduce.matches || saveData); }

    function load() {
      if (loaded) return;
      loaded = true;
      video.src = (innerWidth >= 900 && !saveData) ? 'assets/web/hero-1080.mp4' : 'assets/web/hero-720.mp4';
    }
    function sync() {
      if (!video) return;
      var run = usesVideo() && visible && !userPaused && autoplayAllowed() && !document.hidden;
      root.classList.toggle('is-paused', !run);
      toggle.setAttribute('aria-label', run ? 'Pause background video' : 'Play background video');
      if (run) { load(); var p = video.play(); if (p && p.catch) p.catch(function () { root.classList.add('is-paused'); }); }
      else if (!video.paused) video.pause();
    }

    /* KNOCKOUT: wordmark cut out of a page-coloured sheet; scroll zooms through the stem of the I. */
    function buildKnock() {
      if (hid() !== 'knockout' || !knock) return;
      var w = pin.clientWidth, h = pin.clientHeight;
      if (!w || !h) return;
      var portrait = w / h < 0.9, lines = ['SUMMIT']; /* always one line; phones run it nearly edge to edge */
      ctx = ctx || document.createElement('canvas').getContext('2d');
      ctx.font = '800 100px Montserrat';
      var widths = lines.map(function (l) { return ctx.measureText(l).width; });
      var maxw = Math.max.apply(null, widths);
      var fs = Math.min(100 * w * (portrait ? 0.94 : 0.88) / maxw, h * 0.5 / (lines.length * 0.9));
      var cap = 0.7 * fs, gap = fs * 0.9, blockH = cap + (lines.length - 1) * gap, top = (h - blockH) / 2 - h * 0.02;
      var texts = '', base = [];
      lines.forEach(function (l, i) {
        var y = top + cap + i * gap; base.push(y);
        texts += '<text x="' + (w / 2) + '" y="' + y.toFixed(1) + '" font-size="' + fs.toFixed(1) + '" text-anchor="middle">' + l + '</text>';
      });
      var li = lines.length - 1, line = lines[li], at = line.indexOf('I'), k = fs / 100;
      knockFocus = {
        x: w / 2 - widths[li] * k / 2 + ctx.measureText(line.slice(0, at)).width * k + ctx.measureText('I').width * k / 2,
        y: base[li] - cap / 2
      };
      knock.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      knock.innerHTML = '<defs><mask id="knock-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="' + w + '" height="' + h + '">' +
        '<rect width="' + w + '" height="' + h + '" fill="#fff"/><g class="k-zoom"><g class="k-in">' + texts + '</g></g></mask></defs>' +
        '<rect class="knock-fill" width="' + w + '" height="' + h + '" mask="url(#knock-mask)"/>' +
        texts.split('<text').slice(-1).map(function (t) { return '<text class="k-measure" visibility="hidden"' + t; })[0];
      /* Aim the zoom at the I as the browser actually set it, so the fly-through lands inside the stem. */
      try {
        var ext = knock.querySelector('.k-measure').getExtentOfChar(at);
        if (ext && ext.width) knockFocus.x = ext.x + ext.width / 2;
      } catch (e) {}
      knockScroll();
    }
    function knockScroll() {
      if (hid() !== 'knockout' || !knockFocus) return;
      var span = section.offsetHeight - innerHeight;
      var p = span > 0 ? clamp(-section.getBoundingClientRect().top / span, 0, 1) : 0;
      var s = 1 + Math.pow(p, 2.4) * 70, f = knockFocus;
      var z = knock.querySelector('.k-zoom'), fill = knock.querySelector('.knock-fill');
      if (z) z.setAttribute('transform', 'translate(' + f.x + ' ' + f.y + ') scale(' + s.toFixed(3) + ') translate(' + (-f.x) + ' ' + (-f.y) + ')');
      if (fill) fill.style.opacity = 1 - smooth(0.6, 0.92, p);
      inner.style.opacity = 1 - smooth(0.02, 0.2, p);
      inner.style.transform = 'translateY(' + (-p * 60).toFixed(1) + 'px)';
    }

    /* GEOMETRY: a line drawing laid over the film, built in real pixels so strokes stay hairline. */
    function buildGeo() {
      if (hid() !== 'geometry' || !geo) return;
      var w = geo.clientWidth, h = geo.clientHeight;
      if (!w || !h) return;
      var gut = Math.max(24, parseFloat(getComputedStyle(root).getPropertyValue('--gutter')) || 24);
      var inner = Math.min(w, 1340), x0 = (w - inner) / 2 + gut, x1 = (w + inner) / 2 - gut;
      var cx = w / 2, cy = h * (w > h ? 0.36 : 0.4), R = Math.min(w * 0.4, h * 0.27);
      var W = R * 2.2, k = W / 100, ox = cx - W / 2, oy = cy + R * 0.7 - 60 * k;
      function P(x, y) { return (ox + x * k).toFixed(1) + ' ' + (oy + y * k).toFixed(1); }
      var px = ox + 50 * k, py = oy + 5 * k, s = '';
      function L(xa, ya, xb, yb, cls, d) { s += '<line class="g ' + (cls || '') + '" pathLength="1" style="--d:' + d + '" x1="' + xa.toFixed(1) + '" y1="' + ya.toFixed(1) + '" x2="' + xb.toFixed(1) + '" y2="' + yb.toFixed(1) + '"/>'; }
      s += '<g class="geo-swiss">';
      for (var i = 0; i <= 4; i++) { var x = x0 + (x1 - x0) * i / 4; L(x, 0, x, h, '', 0.15 + i * 0.07); }
      L(0, h * 0.14, w, h * 0.14, '', 0.3); L(0, cy + R, w, cy + R, '', 0.4);
      s += '<circle class="g" pathLength="1" style="--d:.55" cx="' + cx + '" cy="' + cy.toFixed(1) + '" r="' + R.toFixed(1) + '"/>';
      s += '<circle class="g" pathLength="1" style="--d:.7" cx="' + cx + '" cy="' + cy.toFixed(1) + '" r="' + (R * 0.62).toFixed(1) + '"/>';
      for (i = 0; i < 4; i++) s += '<text class="g-tick" x="' + (x0 + (x1 - x0) * i / 4 + 6).toFixed(1) + '" y="' + (cy + R + 16).toFixed(1) + '">' + pad(i + 1) + '</text>';
      s += '</g><g class="geo-alpine">';
      L(x0, py, x1, py, '', 0.4);
      s += '<text class="g-tick" x="' + x0.toFixed(1) + '" y="' + (py - 8).toFixed(1) + '">54.97N</text>';
      s += '<text class="g-tick" x="' + x1.toFixed(1) + '" y="' + (py - 8).toFixed(1) + '" text-anchor="end">1.62W</text>';
      s += '</g>';
      s += '<path class="g g-strong" pathLength="1" style="--d:.8" d="M' + P(6.72, 60) + ' L' + P(50, 5) + ' L' + P(93.28, 60) + '"/>';
      s += '<path class="g g-strong" pathLength="1" style="--d:1.2" d="M' + P(30.5, 31) + ' L' + P(53.22, 60) + '"/>';
      L(px - 14, py, px - 5, py, 'g-accent', 1.7); L(px + 5, py, px + 14, py, 'g-accent', 1.7);
      L(px, py - 14, px, py - 5, 'g-accent', 1.7);
      s += '<circle class="g-ping" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="6"/>';
      s += '<circle class="g-dot" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="3"/>';
      geo.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      geo.innerHTML = s;
    }

    /* Alpine geometry: contour lines drift slowly over the film. */
    function animateContours() {
      cancelAnimationFrame(animRaf);
      var on = hid() === 'geometry' && current.id === 'alpine' && visible && !reduce.matches && !document.hidden;
      if (!cv) return;
      var line = '243,246,244'; /* paper lines read on any film, whatever the palette */
      if (!on) { if (hid() === 'geometry' && current.id === 'alpine') contours(cv, { fade: false, line: line, alpha: 1.6, cy: 0.42, unit: 22 }); return; }
      var last = 0;
      (function frame(t) {
        if (t - last > 40) { last = t; contours(cv, { fade: false, line: line, alpha: 1.6, phase: t * 0.00022, cy: 0.42, unit: 22 }); }
        animRaf = requestAnimationFrame(frame);
      })(0);
    }

    function onScroll() {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(knockScroll);
    }

    function refresh(heroChanged) {
      if (!section) return;
      if (heroChanged) {
        inner.style.opacity = ''; inner.style.transform = '';
        if (hid() !== 'knockout') knock.innerHTML = '';
        if (hid() !== 'geometry') geo.innerHTML = '';
      }
      buildKnock(); buildGeo(); animateContours(); sync();
    }

    function init() {
      section = document.querySelector('.hero');
      if (!section) return;
      pin = section.querySelector('.hero-pin');
      media = section.querySelector('.hero-media');
      video = section.querySelector('.hero-video');
      toggle = section.querySelector('[data-hero-toggle]');
      knock = section.querySelector('.hero-knock');
      geo = section.querySelector('.hero-geo');
      cv = section.querySelector('.hero-contours');
      inner = section.querySelector('.hero-inner');
      timecodes = section.querySelectorAll('[data-timecode]');

      toggle.addEventListener('click', function () {
        if (root.classList.contains('is-paused')) { userPaused = false; userPlay = true; }
        else userPaused = true;
        sync();
      });
      video.addEventListener('timeupdate', function () {
        var t = Math.floor(video.currentTime), txt = pad(Math.floor(t / 60)) + ':' + pad(t % 60);
        timecodes.forEach(function (el) { el.textContent = txt; });
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            visible = e.isIntersecting;
            root.classList.toggle('past-hero', !e.isIntersecting && e.boundingClientRect.top < 0);
          });
          sync(); animateContours();
        }, { rootMargin: '-64px 0px 0px 0px' }).observe(section);
      }
      document.addEventListener('visibilitychange', function () { sync(); animateContours(); });
      addEventListener('scroll', onScroll, { passive: true });
      if (document.fonts && document.fonts.load) document.fonts.load('800 100px Montserrat').then(function () { buildKnock(); }, function () {});
      refresh(true);
    }

    return { init: init, refresh: refresh, rebuild: function () { buildKnock(); buildGeo(); animateContours(); } };
  })();

  /* ---- swipe rails: counter + progress bar under each list that scrolls sideways ---- */
  function rails() {
    document.querySelectorAll('[data-rail]').forEach(function (list) {
      var meta = list.nextElementSibling;
      if (!meta || !meta.classList.contains('rail-meta')) return;
      var count = meta.querySelector('.rail-count'), bar = meta.querySelector('.rail-bar i'), n = list.children.length, raf = 0;
      function upd() {
        var max = list.scrollWidth - list.clientWidth, p = max > 0 ? list.scrollLeft / max : 0, i = Math.round(p * (n - 1));
        count.textContent = pad(i + 1) + ' / ' + pad(n);
        bar.style.setProperty('--p', ((i + 1) / n).toFixed(3));
      }
      list.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(upd); }, { passive: true });
      upd();
    });
  }

  /* ---- clips: load and play only while on screen; tap to pause ---- */
  function reels() {
    var vids = document.querySelectorAll('.reel-video');
    if (!vids.length) return;
    function play(v) { if (!v.src) v.src = v.dataset.src; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    vids.forEach(function (v) {
      v.addEventListener('click', function () { v.dataset.user = v.paused ? 'play' : 'pause'; v.paused ? play(v) : v.pause(); });
    });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && !reduce.matches && v.dataset.user !== 'pause') play(v);
        else if (!e.isIntersecting && !v.paused) v.pause();
      });
    }, { threshold: 0.6 });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* ---- switcher UI ---- */
  function build() {
    if (params.get('switcher') === 'off') return;
    root.classList.add('has-switcher');
    switcher = document.createElement('div');
    switcher.className = 'ss';
    switcher.title = 'Arrow keys pick within a row; [ and ] cycle styles';
    switcher.innerHTML =
      '<div class="ss-panel" id="ss-panel">' +
        '<div class="ss-group ss-theme-group" role="radiogroup" aria-label="Design style"><span class="ss-label" aria-hidden="true">Style</span><div class="ss-opts"></div></div>' +
        '<div class="ss-group ss-palette-group" role="radiogroup" aria-label="Colour palette"><span class="ss-label" aria-hidden="true">Palette</span><div class="ss-opts"></div></div>' +
        '<div class="ss-group ss-hero-group" role="radiogroup" aria-label="Hero treatment"><span class="ss-label" aria-hidden="true">Hero</span><div class="ss-opts"></div></div>' +
        '<div class="ss-group ss-board-group"><span class="ss-label" aria-hidden="true">Compare</span><a class="ss-btn ss-board" href="preview.html">All heroes side by side <span aria-hidden="true">→</span></a></div>' +
      '</div>' +
      '<button class="ss-toggle" type="button" aria-controls="ss-panel"><span class="ss-dot" aria-hidden="true"></span><span class="ss-summary"></span>' +
      '<svg class="ss-caret" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 6.5 5 2.5 9 6.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>';
    themeGroup = switcher.querySelector('.ss-theme-group');
    paletteGroup = switcher.querySelector('.ss-palette-group');
    heroGroup = switcher.querySelector('.ss-hero-group');
    THEMES.forEach(function (t) { themeGroup.querySelector('.ss-opts').appendChild(makeBtn(t, setTheme)); });
    HEROES.forEach(function (h) { heroGroup.querySelector('.ss-opts').appendChild(makeBtn(h, setHero)); });
    function bindArrowKeys(group, stepFn) {
      group.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        stepFn(d);
        var on = group.querySelector('[aria-checked="true"]');
        if (on) on.focus();
      });
    }
    bindArrowKeys(themeGroup, step);
    bindArrowKeys(paletteGroup, stepPalette);
    bindArrowKeys(heroGroup, stepHero);

    var tog = switcher.querySelector('.ss-toggle');
    function setOpen(open) {
      switcher.classList.toggle('is-open', open);
      tog.setAttribute('aria-expanded', open);
      if (open) { syncGroup(themeGroup, current.id); syncGroup(paletteGroup, currentPalette && currentPalette.id); syncGroup(heroGroup, currentHero && currentHero.id); }
    }
    tog.addEventListener('click', function () {
      var open = !switcher.classList.contains('is-open');
      setOpen(open); store(OKEY, open ? '1' : '0');
    });
    var remembered = store(OKEY);
    document.body.appendChild(switcher);
    setOpen(remembered ? remembered === '1' : innerWidth >= 760);
    syncGroup(themeGroup, current.id);
    syncGroup(heroGroup, currentHero && currentHero.id);
    updatePaletteOptions();
    updateSummary();
  }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === '[') step(-1); else if (e.key === ']') step(1);
  });

  document.addEventListener('DOMContentLoaded', function () {
    ready = true;
    build();
    Hero.init();
    commit(current);
    commitHero(currentHero);
    rails();
    reels();
  });

  var raf, lastW = innerWidth;
  addEventListener('resize', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      drawAll();
      /* Mobile browsers fire resize when the URL bar hides; only rebuild on real width changes. */
      if (innerWidth !== lastW) { lastW = innerWidth; Hero.rebuild(); }
    });
  });
  addEventListener('load', drawAll); /* redraw once fonts and layout settle */
})();
