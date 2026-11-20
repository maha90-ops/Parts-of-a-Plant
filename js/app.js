/* =========================================================================
   app.js — الواجهة المشتركة: الترويسة، خيارات الوصول (UDL)، نَبْتي، الصوت،
   المؤثرات، النوافذ، والتشغيل التلقائي لكل صفحة (PR.pages[name]).
   ========================================================================= */
(function (root) {
  'use strict';
  const PR = root.PR = root.PR || {};
  const D = PR.data;
  const ar = D.util.ar, pct = D.util.pct;

  /* ---------- أدوات ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wait = (ms) => new Promise((r) => setTimeout(r, PR.settings && PR.settings.reduceMotion ? Math.min(ms, 150) : ms));
  const stripEmoji = (s) => String(s).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/[«»]/g, '');
  PR.util = { $, $$, esc, shuffle, wait, ar, pct, stripEmoji };

  /* ---------- الإعدادات (UDL) ---------- */
  const SKEY = 'plantRescue.settings';
  const defaults = { fontScale: 1, contrast: false, reduceMotion: false, autoRead: false, volume: 0.7, sfx: true, dyslexia: false };
  function loadSettings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { /* تجاهل */ }
    const sys = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return Object.assign({}, defaults, { reduceMotion: sys }, s);
  }
  PR.settings = loadSettings();
  function saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify(PR.settings)); } catch (e) { /* تجاهل */ } applySettings(); }
  function applySettings() {
    const s = PR.settings, h = document.documentElement;
    h.style.setProperty('--font-scale', s.fontScale);
    h.classList.toggle('hc', !!s.contrast);
    h.classList.toggle('reduce-motion', !!s.reduceMotion);
    h.classList.toggle('dyslexia', !!s.dyslexia);
  }
  applySettings();

  /* ---------- القراءة الصوتية (Web Speech API) ---------- */
  let arVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in root)) return;
    const vs = speechSynthesis.getVoices();
    arVoice = vs.find((v) => /^ar/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in root) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  PR.tts = {
    supported: 'speechSynthesis' in root,
    speak(text) {
      if (!this.supported || !text) return false;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(stripEmoji(text));
      u.lang = 'ar-SA'; if (arVoice) u.voice = arVoice;
      u.volume = PR.settings.volume; u.rate = 0.92;
      speechSynthesis.speak(u); return true;
    },
    stop() { if (this.supported) speechSynthesis.cancel(); },
  };

  /* ---------- مؤثرات صوتية خفيفة (WebAudio، بلا ملفات) ---------- */
  let actx = null;
  PR.sfx = {
    play(kind) {
      if (!PR.settings.sfx || PR.settings.volume <= 0) return;
      try {
        actx = actx || new (root.AudioContext || root.webkitAudioContext)();
        const notes = { correct: [523, 659, 784], wrong: [300, 220], click: [700], win: [523, 659, 784, 1046], hint: [880, 988], badge: [659, 784, 988, 1318] }[kind] || [600];
        const t0 = actx.currentTime;
        notes.forEach((fq, i) => {
          const o = actx.createOscillator(), g = actx.createGain();
          o.type = kind === 'wrong' ? 'triangle' : 'sine'; o.frequency.value = fq;
          const st = t0 + i * 0.09;
          g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.18 * PR.settings.volume, st + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.28);
          o.connect(g).connect(actx.destination); o.start(st); o.stop(st + 0.3);
        });
      } catch (e) { /* الصوت غير متاح */ }
    },
  };

  /* ---------- منطقة الإعلانات لقارئات الشاشة ---------- */
  function announce(msg) { const r = $('#sr-live'); if (r) { r.textContent = ''; setTimeout(() => { r.textContent = stripEmoji(msg); }, 30); } }

  /* ---------- نَبْتي ---------- */
  PR.nabti = {
    say(text, mood, opts) {
      const dock = $('#nabti-dock'); if (!dock) return;
      $('.nabti-avatar', dock).innerHTML = PR.art.nabti(mood || 'happy');
      const b = $('.nabti-text', dock); b.textContent = text; b.dataset.full = text;
      dock.classList.remove('collapsed'); dock.classList.add('talking');
      setTimeout(() => dock.classList.remove('talking'), 1200);
      // تُطوى الفقاعة تلقائيًا كي لا تغطي المحتوى (ما لم يكن المؤشر أو التركيز عليها)
      clearTimeout(dock._t);
      dock._t = setTimeout(function fold() { if (dock.matches(':hover, :focus-within')) { dock._t = setTimeout(fold, 3000); return; } dock.classList.add('collapsed'); }, Math.max(7000, text.length * 90));
      announce('نبتي: ' + text);
      if ((opts && opts.speak) || PR.settings.autoRead) PR.tts.speak(text);
    },
  };

  /* ---------- رسائل منبثقة ---------- */
  PR.toast = function (msg, type) {
    let wrap = $('#toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toasts'; document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || ''); t.setAttribute('role', 'status'); t.textContent = msg;
    wrap.appendChild(t);
    while (wrap.children.length > 2) wrap.firstElementChild.remove(); // لا تتراكم الرسائل
    setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3700);
  };

  /* ---------- نافذة حوار (Modal) ---------- */
  PR.modal = function (html, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const prev = document.activeElement;
      const ov = document.createElement('div');
      ov.className = 'modal-overlay';
      ov.innerHTML = `<div class="modal ${opts.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.label || 'نافذة')}"><button class="modal-x icon-btn" aria-label="إغلاق">✕</button><div class="modal-body">${html}</div></div>`;
      document.body.appendChild(ov);
      const close = (val) => { ov.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); resolve(val); };
      const onKey = (e) => {
        if (e.key === 'Escape' && !opts.locked) close(null);
        if (e.key === 'Tab') {
          const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', ov).filter((x) => !x.disabled);
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      };
      document.addEventListener('keydown', onKey);
      $('.modal-x', ov).onclick = () => close(null);
      if (opts.locked) $('.modal-x', ov).hidden = true;
      ov.addEventListener('click', (e) => { if (e.target === ov && !opts.locked) close(null); });
      $$('[data-close]', ov).forEach((b) => b.addEventListener('click', () => close(b.dataset.close)));
      if (opts.onOpen) opts.onOpen(ov, close);
      const first = $('[autofocus], .modal-body button, .modal-body [href], .modal-body input', ov) || $('.modal-x', ov);
      setTimeout(() => first && first.focus(), 30);
    });
  };

  /* ---------- قصاصات احتفالية (أوراق زيتون وبتلات) ---------- */
  PR.fx = {
    confetti(n) {
      if (PR.settings.reduceMotion) return;
      const layer = document.createElement('div'); layer.className = 'confetti'; layer.setAttribute('aria-hidden', 'true');
      const shapes = ['🍃', '🌸', '⭐', '💧', '🌱'];
      for (let i = 0; i < (n || 28); i++) {
        const s = document.createElement('span');
        s.textContent = shapes[i % shapes.length];
        s.style.left = Math.random() * 100 + 'vw';
        s.style.animationDelay = Math.random() * 0.6 + 's';
        s.style.fontSize = 14 + Math.random() * 18 + 'px';
        s.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
        layer.appendChild(s);
      }
      document.body.appendChild(layer); setTimeout(() => layer.remove(), 3200);
    },
    pop(el) { if (!el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); },
    shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); },
  };

  /* ---------- واجهة المكافآت ---------- */
  PR.ui = PR.ui || {};
  PR.ui.reward = function (r) {
    const parts = [];
    if (r.points) parts.push(`⭐ +${ar(r.points)}`);
    if (r.seeds) parts.push(`🌱 +${ar(r.seeds)}`);
    if (r.drops) parts.push(`💧 +${ar(r.drops)}`);
    if (parts.length) PR.toast(parts.join('   '), 'reward');
    PR.ui.refreshStats();
  };
  PR.ui.badge = function (id) {
    const b = D.BADGES[id]; if (!b) return Promise.resolve();
    PR.sfx.play('badge'); PR.fx.confetti(36);
    return PR.modal(`<div class="badge-pop"><div class="badge-medal big">${b.icon}</div><p class="eyebrow">شارة جديدة!</p><h2>${b.name}</h2><p>${b.desc}</p><button class="btn btn-primary" data-close="ok">رائع! 🌟</button></div>`, { label: 'شارة جديدة' });
  };
  PR.ui.refreshStats = function () {
    const p = PR.progress && PR.progress.current();
    const box = $('#hdr-stats'); if (!box) return;
    if (!p) { box.innerHTML = ''; return; }
    const lv = PR.engine.levelFor(p.points);
    box.innerHTML = `<span class="chip" title="النقاط">⭐ ${ar(p.points)}</span><span class="chip" title="البذور">🌱 ${ar(p.seeds)}</span><span class="chip" title="قطرات الماء">💧 ${ar(p.drops)}</span><span class="chip chip-level" title="مستوى العالم النباتي">${lv.icon} ${lv.name}</span>`;
  };
  PR.ui.masteryBar = function (label, v, opts) {
    opts = opts || {};
    const val = v == null ? 0 : v;
    const tier = val >= 80 ? 'hi' : val >= 60 ? 'mid' : 'lo';
    const sym = val >= 80 ? '▲' : val >= 60 ? '●' : '▼';
    return `<div class="mbar ${tier}"><div class="mbar-top"><span>${opts.icon ? opts.icon + ' ' : ''}${esc(label)}</span><span class="mbar-val"><span aria-hidden="true">${sym}</span> ${v == null ? '—' : pct(val)}${opts.delta ? ` <small class="delta ${opts.delta > 0 ? 'up' : 'down'}">${opts.delta > 0 ? '↑' : '↓'}${ar(Math.abs(opts.delta))}</small>` : ''}</span></div><div class="mbar-track" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${val}"><div class="mbar-fill" style="width:${val}%"></div></div></div>`;
  };
  PR.ui.pathBadge = function (path) {
    if (!path) return '';
    const P = D.PATHS[path];
    return `<span class="path-badge path-${path}"><span aria-hidden="true">${P.icon}</span> ${P.name}</span>`;
  };
  PR.ui.speakBtn = function (text, label) {
    return `<button class="icon-btn speak" type="button" data-speak="${esc(text)}" aria-label="${esc(label || 'استمع')}" title="استمع">🔊</button>`;
  };

  /* ---------- الترويسة وخيارات الوصول ---------- */
  const NAV = [
    { id: 'home', href: 'index.html', t: 'الرئيسية', i: '🏠' },
    { id: 'map', href: 'map.html', t: 'الخريطة', i: '🗺️' },
    { id: 'dashboard', href: 'dashboard.html', t: 'لوحتي', i: '📊' },
    { id: 'report', href: 'report.html', t: 'التقرير', i: '📄' },
    { id: 'teacher', href: 'teacher.html', t: 'المعلم', i: '👩‍🏫' },
  ];
  function buildShell(page) {
    const hdr = $('#app-header');
    if (hdr) {
      hdr.className = 'app-header';
      hdr.innerHTML = `<div class="hdr-in">
        <a class="brand" href="index.html" aria-label="مهمة إنقاذ النبتة — الرئيسية"><span class="brand-mark" aria-hidden="true">🌱</span><span class="brand-t">مَهَمَّةُ إِنْقَاذِ النَّبْتَة</span></a>
        <nav class="main-nav" aria-label="التنقل الرئيس">${NAV.map((n) => `<a href="${n.href}" ${n.id === page || (page === 'certificate' && n.id === 'report') ? 'aria-current="page"' : ''}><span aria-hidden="true">${n.i}</span> <span class="nav-t">${n.t}</span></a>`).join('')}</nav>
        <div class="hdr-end"><div id="hdr-stats" class="hdr-stats" aria-label="إحصاءاتي"></div>
        <button class="icon-btn" id="a11y-open" aria-haspopup="dialog" aria-label="خيارات الوصول" title="خيارات الوصول">♿</button></div>
      </div><div class="flag-ribbon" aria-hidden="true"></div><div class="tatreez-strip" aria-hidden="true"></div>`;
      $('#a11y-open').onclick = openA11y;
    }
    if (!$('#sr-live')) { const l = document.createElement('div'); l.id = 'sr-live'; l.className = 'sr-only'; l.setAttribute('aria-live', 'polite'); document.body.appendChild(l); }
    if (!$('#nabti-dock') && document.body.dataset.nabti !== 'off') {
      const d = document.createElement('aside');
      d.id = 'nabti-dock'; d.className = 'nabti-dock collapsed'; d.setAttribute('aria-label', 'نَبْتي المساعد');
      d.innerHTML = `<button class="nabti-avatar" aria-label="أظهر أو أخفِ رسالة نَبْتي">${PR.art.nabti('happy')}</button>
        <div class="nabti-bubble"><p class="nabti-name">🤖 نَبْتي</p><p class="nabti-text">مرحبًا! أنا نَبْتي، مساعدك في الرحلة.</p>
        <div class="nabti-tools"><button class="icon-btn sm" id="nabti-speak" aria-label="استمع إلى نبتي">🔊</button><button class="icon-btn sm" id="nabti-hide" aria-label="إخفاء الرسالة">⤵</button></div></div>`;
      document.body.appendChild(d);
      $('.nabti-avatar', d).onclick = () => d.classList.toggle('collapsed');
      $('#nabti-hide', d).onclick = () => d.classList.add('collapsed');
      $('#nabti-speak', d).onclick = () => PR.tts.speak($('.nabti-text', d).textContent);
      // تُطوى الفقاعة عند لمس أي مكان آخر أو عند لمس نصّها، حتى لا تغطي الأزرار
      $('.nabti-text', d).onclick = () => d.classList.add('collapsed');
      document.addEventListener('pointerdown', (e) => { if (!d.contains(e.target)) d.classList.add('collapsed'); }, true);
    }
    const ft = $('#app-footer');
    if (ft) {
      ft.className = 'app-footer';
      ft.innerHTML = `<div class="tatreez-strip" aria-hidden="true"></div><div class="ft-in"><p>🌱 مَهَمَّةُ إِنْقَاذِ النَّبْتَة — بيئة تعلّم تكيفية لدرس «أجزاء النبات ووظائفها»</p><p class="muted">مستوحاة من أرض فلسطين: الزيتون، وشقائق النعمان، والتطريز الفلسطيني 🇵🇸</p></div>`;
    }
    PR.ui.refreshStats();
  }

  function openA11y() {
    const s = PR.settings;
    PR.modal(`<h2>♿ خيارات الوصول</h2><p class="muted">اختر ما يناسبك. تُحفظ اختياراتك تلقائيًا.</p>
      <div class="a11y-grid">
        <div class="a11y-row"><span>🔠 حجم النص</span><div class="seg"><button class="btn sm" id="fs-dn" aria-label="تصغير النص">أ−</button><output id="fs-val">${ar(Math.round(s.fontScale * 100))}٪</output><button class="btn sm" id="fs-up" aria-label="تكبير النص">أ+</button></div></div>
        <label class="a11y-row"><span>👁️ تباين مرتفع</span><input type="checkbox" class="switch" id="o-contrast" ${s.contrast ? 'checked' : ''}></label>
        <label class="a11y-row"><span>⏸️ إيقاف الحركات</span><input type="checkbox" class="switch" id="o-motion" ${s.reduceMotion ? 'checked' : ''}></label>
        <label class="a11y-row"><span>🔊 قراءة رسائل نَبْتي تلقائيًا</span><input type="checkbox" class="switch" id="o-read" ${s.autoRead ? 'checked' : ''}></label>
        <label class="a11y-row"><span>🎵 المؤثرات الصوتية</span><input type="checkbox" class="switch" id="o-sfx" ${s.sfx ? 'checked' : ''}></label>
        <label class="a11y-row"><span>📖 تباعد مريح للقراءة</span><input type="checkbox" class="switch" id="o-dys" ${s.dyslexia ? 'checked' : ''}></label>
        <label class="a11y-row"><span>🔈 مستوى الصوت</span><input type="range" id="o-vol" min="0" max="1" step="0.1" value="${s.volume}" aria-label="مستوى الصوت"></label>
      </div>
      ${PR.tts.supported ? '' : '<p class="note">⚠️ متصفحك لا يدعم القراءة الصوتية؛ النص مكتوب دائمًا بجانب كل محتوى.</p>'}
      <p class="muted small">⌨️ يمكنك استخدام Tab للتنقل، وEnter أو المسافة للاختيار، وEsc للإغلاق.</p>
      <div class="row-end"><button class="btn" id="a11y-test">🔊 جرّب الصوت</button><button class="btn btn-primary" data-close="ok">تم</button></div>`, {
      label: 'خيارات الوصول', cls: 'a11y-modal',
      onOpen(ov) {
        const set = (k, v) => { PR.settings[k] = v; saveSettings(); };
        $('#fs-up', ov).onclick = () => { set('fontScale', Math.min(1.5, +(PR.settings.fontScale + 0.1).toFixed(2))); $('#fs-val', ov).textContent = ar(Math.round(PR.settings.fontScale * 100)) + '٪'; };
        $('#fs-dn', ov).onclick = () => { set('fontScale', Math.max(0.85, +(PR.settings.fontScale - 0.1).toFixed(2))); $('#fs-val', ov).textContent = ar(Math.round(PR.settings.fontScale * 100)) + '٪'; };
        $('#o-contrast', ov).onchange = (e) => set('contrast', e.target.checked);
        $('#o-motion', ov).onchange = (e) => set('reduceMotion', e.target.checked);
        $('#o-read', ov).onchange = (e) => set('autoRead', e.target.checked);
        $('#o-sfx', ov).onchange = (e) => set('sfx', e.target.checked);
        $('#o-dys', ov).onchange = (e) => set('dyslexia', e.target.checked);
        $('#o-vol', ov).oninput = (e) => set('volume', +e.target.value);
        $('#a11y-test', ov).onclick = () => { PR.sfx.play('correct'); PR.tts.speak('مرحبًا أيها العالم الصغير!'); };
      },
    });
  }
  PR.ui.openA11y = openA11y;

  /* ---------- تفويض أحداث عامة ---------- */
  document.addEventListener('click', (e) => {
    const sp = e.target.closest('[data-speak]');
    if (sp) { e.preventDefault(); PR.tts.speak(sp.dataset.speak); }
  });
  // عناصر role=button غير الأزرار: Enter/Space
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.getAttribute && t.getAttribute('role') === 'button' && t.tagName !== 'BUTTON') {
      e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });

  /* ---------- التقاط الأخطاء: رسالة للطالب + سجلّ للتشخيص ---------- */
  PR.reportError = function (err, where) {
    const msg = (err && (err.stack || err.message)) || String(err);
    console.error('[plant-rescue]', where || '', err);
    try {
      const log = JSON.parse(localStorage.getItem('plantRescue.errors') || '[]');
      log.push({ at: new Date().toISOString(), where: where || location.pathname + location.search, msg: String(msg).slice(0, 600) });
      localStorage.setItem('plantRescue.errors', JSON.stringify(log.slice(-20)));
    } catch (e) { /* تجاهل */ }
    if (PR.toast) PR.toast('حدث خلل بسيط، وتابعنا الرحلة تلقائيًا. تقدّمك محفوظ ✓', 'bad');
  };
  root.addEventListener('error', (e) => PR.reportError(e.error || e.message, 'window'));
  root.addEventListener('unhandledrejection', (e) => PR.reportError(e.reason, 'promise'));

  /* ---------- التشغيل ---------- */
  PR.pages = PR.pages || {};
  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    buildShell(page);
    try { if (PR.pages[page]) PR.pages[page](); }
    catch (err) { console.error(err); PR.toast('حدث خطأ غير متوقع، أعد تحميل الصفحة.', 'bad'); }
  });
})(typeof self !== 'undefined' ? self : this);
