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
  const defaults = { fontScale: 1, contrast: false, reduceMotion: false, autoRead: false, volume: 0.7, sfx: true, dyslexia: false, cvd: false, narration: false, ttsFallback: true };
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
    h.classList.toggle('cvd', !!s.cvd);
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

  /* ---------- الشرح الصوتي: تسجيلات بشرية من مجلد audio/ ----------
     PR.audio.play('roots') يشغّل audio/roots.mp3 إن وُجد. إن لم يوجد التسجيل، تُستخدم القراءة الآلية
     فقط إذا سمح بها المستخدم من «خيارات الوصول». لا يتكرّر الصوت ولا يعمل وحده إلا إذا فُعّل «الشرح التلقائي». */
  const audioCache = {};
  let current = null;
  PR.audio = {
    keys: ['welcome', 'roots', 'stem', 'leaves', 'flower', 'lab', 'final', 'success', 'error'],
    stop() { if (current) { current.pause(); current = null; } PR.tts.stop(); },
    play(key, fallbackText) {
      this.stop();
      const text = fallbackText || (D.AUDIO_SCRIPTS && D.AUDIO_SCRIPTS[key]) || '';
      const fallback = () => { if (PR.settings.ttsFallback && text) PR.tts.speak(text); else if (text) PR.toast('🔈 التسجيل الصوتي غير متوفر بعد. فعّل «القراءة الآلية» من خيارات الوصول للاستماع.'); };
      if (!key || audioCache[key] === false || location.protocol === 'file:') { fallback(); return; }
      const a = new Audio(`audio/${key}.mp3`);
      a.volume = PR.settings.volume;
      a.onerror = () => { audioCache[key] = false; if (current === a) current = null; fallback(); };
      a.oncanplay = () => { audioCache[key] = true; };
      current = a;
      a.play().catch(() => { /* يمنع المتصفح التشغيل قبل تفاعل المستخدم */ });
    },
    /** شرح المحطة يعمل تلقائيًا مرة واحدة فقط عند الدخول، إذا فعّله المستخدم */
    narrate(key) {
      if (!PR.settings.narration) return;
      const k = 'plantRescue.narrated.' + key;
      try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) { /* */ }
      this.play(key);
    },
  };
  /** زر استماع مرتبط بتسجيل صوتي */
  PR.ui = PR.ui || {};
  PR.ui.audioBtn = (key, label) => `<button class="icon-btn sm audio-btn" type="button" data-audio="${key}" aria-label="${label || 'استمع إلى الشرح'}" title="${label || 'استمع إلى الشرح'}">🔊</button>`;

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
    /** إخفاء/إظهار الزر العائم بسلاسة (مثلًا: يُخفى في قسم البداية لأن نَبْتي مرسوم فيه أصلًا) */
    setHidden(hidden) {
      const dock = $('#nabti-dock'); if (!dock) return;
      dock.classList.toggle('dock-hidden', !!hidden);
      dock.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      if (hidden) dock.classList.add('collapsed');
      dock.querySelectorAll('button').forEach((b) => { b.tabIndex = hidden ? -1 : 0; });
    },
  };

  /* ---------- لولو: الشخصية الرئيسية (نبتة تتكلم وتتغير تعابيرها) ----------
     moods: happy (سعيدة) | surprised (متفاجئة) | sad (حزينة) | help (تحتاج المساعدة) | excited (سعيدة جدًا) */
  const LULU_HEALTH = { happy: 90, surprised: 70, sad: 30, help: 45, excited: 100 };
  /* صور لولو المجسّمة حسب الحالة: ذابلة / عادية / متعافية */
  const LULU_IMG = { wilted: 'assets/lulu/lulu-wilted.webp', ok: 'assets/lulu/lulu-hero.webp', happy: 'assets/lulu/lulu-happy.webp' };
  const LULU_ALT = { wilted: 'لولو ذابلة وحزينة', ok: 'لولو تبتسم', happy: 'لولو متعافية وسعيدة جدًا' };
  PR.lulu = {
    state(health, mood) { return mood === 'excited' || health >= 95 ? 'happy' : mood === 'sad' || mood === 'help' || health < 50 ? 'wilted' : 'ok'; },
    img(health, mood) {
      const st = this.state(health == null ? 90 : health, mood);
      const fb = st === 'happy' ? ` onerror="this.onerror=null;this.src='${LULU_IMG.ok}'"` : '';
      return `<img class="lulu-photo lp-${st}" src="${LULU_IMG[st]}" alt="${LULU_ALT[st]}" width="385" height="711" decoding="async"${fb}>`;
    },
    /** يرسم لولو مع فقاعة كلام داخل حاوية */
    html(text, mood, opts) {
      opts = opts || {};
      mood = mood || 'happy';
      return `<div class="lulu-talk ${opts.cls || ''}" data-mood="${mood}">
        <div class="lt-art">${PR.lulu.img(opts.health != null ? opts.health : LULU_HEALTH[mood], mood)}</div>
        <div class="lt-bubble" role="status"><b class="lt-name">🌱 لولو</b><p class="lt-text">${esc(text)}</p></div></div>`;
    },
    /** يحدّث لولو في المكان المخصص لها في الصفحة (#lulu-slot) */
    say(text, mood) {
      const slot = $('#lulu-slot'); if (!slot) return;
      slot.innerHTML = this.html(text, mood, { cls: 'compact' });
      const t = $('.lulu-talk', slot); if (t) PR.fx.pop(t);
      announce('لولو: ' + text);
    },
    /** ردّ فعل سريع على الإجابة: تتغير التعابير فقط */
    react(kind) {
      const slot = $('#lulu-slot'); if (!slot || !slot.firstElementChild) return;
      const text = $('.lt-text', slot) ? $('.lt-text', slot).textContent : '';
      const map = { correct: ['excited', 'رائع! أشعر أنني أفضل! 💚'], wrong: ['surprised', 'لا بأس! فكّر معي مرة أخرى 🌱'], levelup: ['excited', 'ممتاز! يبدو أنك مستعد لتحدٍّ أكبر! 🚀'] };
      const [mood, line] = map[kind] || ['happy', text];
      this.say(line, mood);
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
      ov.innerHTML = `<div class="modal ${opts.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.label || 'نافذة')}"><button class="modal-x icon-btn" type="button" aria-label="إغلاق النافذة" title="إغلاق"><svg class="ic-x" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button><div class="modal-body">${html}</div></div>`;
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
    box.innerHTML = `<span class="chip stat-star" title="النقاط">${PR.icon('star')}<b>${ar(p.points)}</b></span><span class="chip stat-seed" title="البذور">${PR.icon('sprout')}<b>${ar(p.seeds)}</b></span><span class="chip stat-drop" title="قطرات الماء">${PR.icon('drop')}<b>${ar(p.drops)}</b></span><span class="chip chip-level" title="مستوى العالم النباتي">${lv.icon} ${lv.name}</span>`;
  };
  PR.ui.masteryBar = function (label, v, opts) {
    opts = opts || {};
    const val = v == null ? 0 : v;
    const tier = val >= 80 ? 'hi' : val >= 60 ? 'mid' : 'lo';
    const sym = val >= 80 ? '▲' : val >= 60 ? '●' : '▼';
    return `<div class="mbar ${tier}"><div class="mbar-top"><span>${opts.icon ? opts.icon + ' ' : ''}${esc(label)}</span><span class="mbar-val"><span aria-hidden="true">${sym}</span> ${v == null ? '—' : pct(val)}${opts.delta ? ` <small class="delta ${opts.delta > 0 ? 'up' : 'down'}">${opts.delta > 0 ? '↑' : '↓'}${ar(Math.abs(opts.delta))}</small>` : ''}</span></div><div class="mbar-track" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${val}"><div class="mbar-fill" style="width:${val}%"></div></div></div>`;
  };
  PR.ui.pathBadge = function (path, opts) {
    if (!path) return '';
    const P = D.PATHS[path];
    return `<span class="path-badge path-${path}"><span aria-hidden="true">${P.icon}</span> ${opts && opts.teacher ? P.name : (P.kid || P.name)}</span>`;
  };
  PR.ui.speakBtn = function (text, label) {
    return `<button class="icon-btn speak" type="button" data-speak="${esc(text)}" aria-label="${esc(label || 'استمع')}" title="استمع">🔊</button>`;
  };

  /* ---------- الترويسة وخيارات الوصول ---------- */
  /* ---------- أيقونات مرسومة موحّدة (بدل الرموز التعبيرية التي تختلف بين الأجهزة) ---------- */
  const ICONS = {
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    chart: '<path d="M4 20V11M10 20V5M16 20v-6M2.5 20h19"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    teacher: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M15 4h6v8h-3.5"/>',
    a11y: '<circle cx="12" cy="4.6" r="1.9" fill="currentColor" stroke="none"/><path d="M5 8.5h14M12 8.5v5.5m0 0-3.6 6.5M12 14l3.6 6.5"/>',
    star: '<path d="m12 3.2 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.6l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor" stroke="none"/>',
    sprout: '<path d="M12 21v-9"/><path d="M12 12C12 7.5 8.5 5 4 5c0 4.2 3.2 7 8 7z" fill="currentColor" stroke="none"/><path d="M12 10c0-4 3-6.5 8-6.5 0 4-3 6.5-8 6.5z" fill="currentColor" stroke="none" opacity=".7"/>',
    drop: '<path d="M12 3.5s-6 6.8-6 10.8a6 6 0 0 0 12 0c0-4-6-10.8-6-10.8z" fill="currentColor" stroke="none"/>',
    leaf: '<path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z"/><path d="M5 19 14 10"/>',
  };
  PR.icon = (name, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

  const NAV = [
    { id: 'home', href: 'index.html', t: 'الرئيسية', i: 'home' },
    { id: 'map', href: 'map.html', t: 'الخريطة', i: 'map' },
    { id: 'dashboard', href: 'dashboard.html', t: 'لوحتي', i: 'chart' },
    { id: 'report', href: 'report.html', t: 'التقرير', i: 'doc' },
    { id: 'teacher', href: 'teacher.html', t: 'المعلم', i: 'teacher' },
  ];
  function buildShell(page) {
    const hdr = $('#app-header');
    if (hdr) {
      hdr.className = 'app-header';
      hdr.innerHTML = `<div class="hdr-in">
        <a class="brand" href="index.html" aria-label="مهمة إنقاذ لولو — الرئيسية"><span class="brand-mark" aria-hidden="true">${PR.icon('sprout')}</span><span class="brand-t">مَهَمَّةُ إِنْقَاذِ لُولُو</span></a>
        <nav class="main-nav" aria-label="التنقل الرئيس">${NAV.map((n) => `<a href="${n.href}" ${n.id === page || (page === 'certificate' && n.id === 'report') ? 'aria-current="page"' : ''} aria-label="${n.t}" title="${n.t}">${PR.icon(n.i)}<span class="nav-t">${n.t}</span></a>`).join('')}</nav>
        <div class="hdr-end"><div id="hdr-stats" class="hdr-stats" aria-label="إحصاءاتي"></div>
        <button class="icon-btn a11y-btn" id="a11y-open" aria-haspopup="dialog" aria-label="خيارات الوصول" title="خيارات الوصول">${PR.icon('a11y')}</button></div>
      </div><div class="flag-ribbon" aria-hidden="true"></div><div class="tatreez-strip" aria-hidden="true"></div>`;
      $('#a11y-open').onclick = openA11y;
    }
    if (!$('#sr-live')) { const l = document.createElement('div'); l.id = 'sr-live'; l.className = 'sr-only'; l.setAttribute('aria-live', 'polite'); document.body.appendChild(l); }
    if (!$('#nabti-dock') && document.body.dataset.nabti !== 'off') {
      const d = document.createElement('aside');
      d.id = 'nabti-dock'; d.className = 'nabti-dock collapsed'; d.setAttribute('aria-label', 'نَبْتي المساعد');
      d.innerHTML = `<button class="nabti-avatar" aria-label="أظهر أو أخفِ رسالة نَبْتي">${PR.art.nabti('happy')}</button>
        <div class="nabti-bubble"><p class="nabti-name">🤖 نَبْتي</p><p class="nabti-text">مرحبًا! أنا نَبْتي، مساعدك في الرحلة.</p>
        <div class="nabti-tools"><button class="icon-btn sm" id="nabti-speak" aria-label="استمع إلى نبتي">🔊</button><button class="icon-btn sm" id="nabti-hide" type="button" aria-label="إخفاء رسالة نبتي" title="إخفاء الرسالة"><svg class="ic-x" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div>`;
      document.body.appendChild(d);
      $('.nabti-avatar', d).onclick = () => d.classList.toggle('collapsed');
      $('#nabti-hide', d).onclick = () => d.classList.add('collapsed');
      $('#nabti-speak', d).onclick = () => PR.tts.speak($('.nabti-text', d).textContent);
      // تُطوى الفقاعة عند لمس أي مكان آخر أو عند لمس نصّها، حتى لا تغطي الأزرار
      $('.nabti-text', d).onclick = () => d.classList.add('collapsed');
      document.addEventListener('pointerdown', (e) => { if (!d.contains(e.target)) d.classList.add('collapsed'); }, true);
    }
    // عند الوصول إلى التذييل تُطوى فقاعة نَبْتي ويرتفع قليلًا حتى لا يغطي روابط التذييل
    const dockEl = $('#nabti-dock'), ftEl = $('#app-footer');
    if (dockEl && ftEl && 'IntersectionObserver' in root) {
      new IntersectionObserver((es) => es.forEach((e) => {
        dockEl.classList.toggle('near-footer', e.isIntersecting);
        if (e.isIntersecting) dockEl.classList.add('collapsed');
      }), { threshold: 0.05 }).observe(ftEl);
    }
    const ft = $('#app-footer');
    if (ft) {
      ft.className = 'app-footer';
      ft.innerHTML = `<div class="tatreez-strip" aria-hidden="true"></div><div class="flag-ribbon" aria-hidden="true"></div>
        <div class="ft-in">
          <div class="ft-brand"><span class="brand-mark" aria-hidden="true">${PR.icon('sprout')}</span><div><b>مَهَمَّةُ إِنْقَاذِ لُولُو</b><p>بيئة تعلّم تكيفية لدرس «أجزاء النبات ووظائفها» — مستوحاة من أرض فلسطين: الزيتون، وشقائق النعمان، والتطريز الفلسطيني.</p></div></div>
          <nav class="ft-nav" aria-label="روابط التذييل">${NAV.map((n) => `<a href="${n.href}">${PR.icon(n.i)}${n.t}</a>`).join('')}</nav>
        </div>`;
    }
    PR.ui.refreshStats();
  }

  function openA11y() {
    const s = PR.settings;
    PR.modal(`<h2>♿ خيارات الوصول</h2><p class="muted">اختر ما يناسبك. تُحفظ اختياراتك تلقائيًا.</p>
      <div class="a11y-grid">
        <p class="a11y-sec">👁️ القراءة والعرض</p>
        <div class="a11y-row"><span>🔠 حجم النص</span><div class="seg"><button class="btn sm" id="fs-dn" aria-label="تصغير النص">أ−</button><output id="fs-val">${ar(Math.round(s.fontScale * 100))}٪</output><button class="btn sm" id="fs-up" aria-label="تكبير النص">أ+</button></div></div>
        <label class="a11y-row"><span>👁️ تباين مرتفع</span><input type="checkbox" class="switch" id="o-contrast" ${s.contrast ? 'checked' : ''}></label>
        <label class="a11y-row"><span>🎨 ألوان مناسبة لعمى الألوان<small>أزرق وبرتقالي بدل الأخضر والأحمر</small></span><input type="checkbox" class="switch" id="o-cvd" ${s.cvd ? 'checked' : ''}></label>
        <label class="a11y-row"><span>📖 تباعد مريح للقراءة</span><input type="checkbox" class="switch" id="o-dys" ${s.dyslexia ? 'checked' : ''}></label>
        <p class="a11y-sec">⏸️ الحركة</p>
        <label class="a11y-row"><span>⏸️ إيقاف الحركات</span><input type="checkbox" class="switch" id="o-motion" ${s.reduceMotion ? 'checked' : ''}></label>
        <p class="a11y-sec">🔊 الصوت</p>
        <label class="a11y-row"><span>🎧 الشرح الصوتي عند دخول كل محطة<small>مرة واحدة فقط، ويمكن إيقافه بأي زر 🔊</small></span><input type="checkbox" class="switch" id="o-narr" ${s.narration ? 'checked' : ''}></label>
        <label class="a11y-row"><span>🗣️ القراءة الآلية عند عدم توفر تسجيل<small>للنصوص التي لم تُسجَّل بصوت بشري بعد</small></span><input type="checkbox" class="switch" id="o-tts" ${s.ttsFallback ? 'checked' : ''}></label>
        <label class="a11y-row"><span>🤖 قراءة رسائل نَبْتي تلقائيًا</span><input type="checkbox" class="switch" id="o-read" ${s.autoRead ? 'checked' : ''}></label>
        <label class="a11y-row"><span>🎵 المؤثرات الصوتية</span><input type="checkbox" class="switch" id="o-sfx" ${s.sfx ? 'checked' : ''}></label>
        <label class="a11y-row"><span>🔈 مستوى الصوت</span><input type="range" id="o-vol" min="0" max="1" step="0.1" value="${s.volume}" aria-label="مستوى الصوت"></label>
        <p class="a11y-sec">⌨️ التفاعل</p>
        <p class="a11y-note">⌨️ كل الأنشطة تعمل بلوحة المفاتيح (Tab ثم Enter). 👆 كل نشاط سحب وإفلات له بديل بالنقر: اختر البطاقة ثم اختر مكانها. 📝 لكل صورة وصف نصي لقارئات الشاشة. ✓ و✗ ترافق الألوان دائمًا.</p>
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
        $('#o-cvd', ov).onchange = (e) => set('cvd', e.target.checked);
        $('#o-narr', ov).onchange = (e) => set('narration', e.target.checked);
        $('#o-tts', ov).onchange = (e) => set('ttsFallback', e.target.checked);
        $('#o-vol', ov).oninput = (e) => set('volume', +e.target.value);
        $('#a11y-test', ov).onclick = () => { PR.sfx.play('correct'); PR.audio.play('success', 'مرحبًا يا عالم النبات الصغير!'); };
      },
    });
  }
  PR.ui.openA11y = openA11y;

  /* ---------- تفويض أحداث عامة ---------- */
  document.addEventListener('click', (e) => {
    const au = e.target.closest('[data-audio]');
    if (au) { e.preventDefault(); PR.audio.play(au.dataset.audio, au.dataset.speak); return; }
    const sp = e.target.closest('[data-speak]');
    if (sp) {
      e.preventDefault();
      if (PR.settings.ttsFallback) PR.tts.speak(sp.dataset.speak);
      else PR.toast('🗣️ القراءة الآلية متوقفة. فعّلها من «خيارات الوصول» للاستماع.');
    }
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
