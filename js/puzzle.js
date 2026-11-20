/* =========================================================================
   puzzle.js — تحدّي البازل: لوحة لقبة الصخرة لكل محطة
   خمس محطات (الجذر، الساق، الأوراق، الزهرة، المختبر)، لكلٍّ منها لوحة بوقت مختلف
   من اليوم (فجر، صباح، ظهيرة، غروب، ليل). عدد القطع = عدد أسئلة المحطة في مسار
   الطالب، وكل إجابة صحيحة تضع قطعة. اللوحة ظاهرة بجانب السؤال طوال المحطة.
   إكمال اللوحات الخمس يمنح شارة «بنّاء قبة الصخرة».
   ========================================================================= */
(function (root) {
  'use strict';
  const PR = root.PR = root.PR || {};
  const D = PR.data;
  const ar = D.util.ar;

  const STATIONS = {
    roots:  { t: 'مدينة الجذور', i: '🌱', theme: 'dawn', tl: 'فجر القدس' },
    stem:   { t: 'طريق الساق', i: '🌿', theme: 'morning', tl: 'صباح القدس' },
    leaves: { t: 'مصنع الأوراق', i: '🍃', theme: 'noon', tl: 'ظهيرة القدس' },
    flower: { t: 'حديقة الأزهار', i: '🌸', theme: 'sunset', tl: 'غروب القدس' },
    lab:    { t: 'المختبر النباتي', i: '🔬', theme: 'night', tl: 'ليل القدس' },
  };
  const KEYS = Object.keys(STATIONS);
  const THEMES = {
    dawn:    { sky: ['#f4b6c2', '#fcd9c4', '#f6ead0'], orb: { x: 40, y: 92, r: 16, c: '#ffb37a' }, shade: 0 },
    morning: { sky: ['#9fd0ec', '#e7f3f8', '#f6ead0'], orb: { x: 262, y: 32, r: 14, c: '#fff1a8' }, shade: 0 },
    noon:    { sky: ['#5aa9e0', '#bfe3f6', '#f3ebd6'], orb: { x: 236, y: 22, r: 15, c: '#fff8c7' }, shade: 0 },
    sunset:  { sky: ['#f08a4b', '#fbc77d', '#f6dcb4'], orb: { x: 264, y: 96, r: 18, c: '#ff7a33' }, shade: 0.12 },
    night:   { sky: ['#0d1b38', '#1f3a66', '#33486a'], orb: { x: 252, y: 34, r: 13, c: '#f3f0d8', moon: true }, shade: 0.34 },
  };

  /* ---------- عدد القطع = عدد أسئلة المحطة في مسار الطالب ---------- */
  function totalFor(key, path) {
    if (key === 'lab') return { remediation: 8, practice: 10, challenge: 12 }[path] || 10;
    const plan = PR.engine.questionPlan(path);
    return 1 /* استكشاف */ + 1 /* النشاط */ + 1 /* سؤال لماذا */ + plan.count + (path === 'challenge' ? 1 /* مسألة مفتوحة */ : 0);
  }

  /* ---------- شبكة القطع وأشكالها (ألسنة وتجاويف) ---------- */
  const f = (n) => Math.round(n * 10) / 10;
  const gridCache = {};
  function grid(n) {
    const rows = n <= 5 ? 1 : n <= 10 ? 2 : 3;
    const cols = Math.ceil(n / rows);
    const k = cols + 'x' + rows;
    if (gridCache[k]) return gridCache[k];
    const W = 300 / cols, H = 200 / rows;
    let s = cols * 31 + rows * 7;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const HZ = Array.from({ length: rows - 1 }, () => Array.from({ length: cols }, () => (rnd() > 0.5 ? 1 : -1)));
    const VT = Array.from({ length: rows }, () => Array.from({ length: cols - 1 }, () => (rnd() > 0.5 ? 1 : -1)));
    function edge(x1, y1, x2, y2, dir) {
      if (!dir) return `L${f(x2)} ${f(y2)}`;
      const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = uy, ny = -ux;
      const sz = 0.22 * Math.min(W, H) * dir;
      const P = (a, b) => `${f(x1 + ux * a * L + nx * b)} ${f(y1 + uy * a * L + ny * b)}`;
      return `L${P(0.36, 0)} C${P(0.42, 0)} ${P(0.3, sz)} ${P(0.5, sz)} C${P(0.7, sz)} ${P(0.58, 0)} ${P(0.64, 0)} L${f(x2)} ${f(y2)}`;
    }
    const paths = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * W, y = r * H;
      const top = r === 0 ? 0 : -HZ[r - 1][c], right = c === cols - 1 ? 0 : VT[r][c], bottom = r === rows - 1 ? 0 : HZ[r][c], left = c === 0 ? 0 : -VT[r][c - 1];
      paths.push(`M${f(x)} ${f(y)} ${edge(x, y, x + W, y, top)} ${edge(x + W, y, x + W, y + H, right)} ${edge(x + W, y + H, x, y + H, bottom)} ${edge(x, y + H, x, y, left)} Z`);
    }
    // ترتيب الظهور: من القبة الذهبية نحو الأطراف
    const order = paths.map((_, i) => i).sort((a, b) => {
      const d = (i) => Math.hypot(((i % cols) + 0.5) * W - 150, (((i / cols) | 0) + 0.5) * H - 70);
      return d(a) - d(b);
    });
    return (gridCache[k] = { cols, rows, cells: cols * rows, paths, order });
  }

  /* ---------- رسم قبة الصخرة حسب وقت اليوم ---------- */
  function domeArt(id, themeKey) {
    const T = THEMES[themeKey] || THEMES.morning;
    let tiles = '';
    for (let x = 62; x < 238; x += 11) tiles += `<rect x="${x}" y="112" width="8" height="8" transform="rotate(45 ${x + 4} 116)" fill="#e9f2fb" opacity=".85"/>`;
    let arches = '';
    for (let x = 66; x < 236; x += 21) arches += `<path d="M${x} 168 V150 a7 7 0 0 1 14 0 V168Z" fill="#1d3f73"/><path d="M${x + 2} 168 V151 a5 5 0 0 1 10 0 V168Z" fill="${themeKey === 'night' ? '#ffd66b' : '#f4e6c4'}" opacity="${themeKey === 'night' ? '.75' : '.35'}"/>`;
    let win = '';
    for (let x = 112; x < 190; x += 13) win += `<path d="M${x} 92 V84 a3.5 3.5 0 0 1 7 0 V92Z" fill="${themeKey === 'night' ? '#ffd66b' : '#14325e'}"/>`;
    let ribs = '';
    for (let i = -3; i <= 3; i++) ribs += `<path d="M150 18 Q${150 + i * 13} 40 ${150 + i * 16} 76" stroke="#b07d12" stroke-width="1" fill="none" opacity=".45"/>`;
    const cypress = (x) => `<g transform="translate(${x} 0)"><rect x="-1.5" y="160" width="3" height="16" fill="#5b3a1e"/><path d="M0 104 C9 128 9 150 0 166 C-9 150 -9 128 0 104Z" fill="#2f5d2a"/><path d="M0 110 C5 128 5 148 0 160" stroke="#3f7a36" stroke-width="2" fill="none"/></g>`;
    const olive = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-2" y="0" width="4" height="12" fill="#6b4a2a"/><circle cy="-4" r="10" fill="#6f8f42"/><circle cx="-7" cy="2" r="7" fill="#7f9f4a"/><circle cx="7" cy="2" r="7" fill="#5f7f35"/></g>`;
    const o = T.orb;
    const orb = o.moon
      ? `<circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="${o.c}"/><circle cx="${o.x + 6}" cy="${o.y - 4}" r="${o.r - 1}" fill="${T.sky[0]}"/>${[[30, 20], [70, 44], [110, 14], [196, 40], [286, 64], [20, 70], [226, 12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#fff"/>`).join('')}`
      : `<circle cx="${o.x}" cy="${o.y}" r="${o.r + 6}" fill="${o.c}" opacity=".35"/><circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="${o.c}"/>`;
    return `<g id="${id}">
      <defs><linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.sky[0]}"/><stop offset=".7" stop-color="${T.sky[1]}"/><stop offset="1" stop-color="${T.sky[2]}"/></linearGradient>
      <radialGradient id="${id}-gold" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff3b0"/><stop offset=".35" stop-color="#f2c33a"/><stop offset=".8" stop-color="#c8901c"/><stop offset="1" stop-color="#9a6a10"/></radialGradient>
      <linearGradient id="${id}-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7bc4"/><stop offset="1" stop-color="#1f5fa8"/></linearGradient></defs>
      <rect width="300" height="200" fill="url(#${id}-sky)"/>
      ${orb}
      ${themeKey !== 'night' ? '<g fill="#fff" opacity=".8"><ellipse cx="60" cy="34" rx="22" ry="8"/><ellipse cx="76" cy="28" rx="14" ry="8"/></g>' : ''}
      <path d="M0 150 Q50 136 100 146 T200 142 T300 148 V200 H0Z" fill="#d9c49a"/>
      <rect x="0" y="168" width="300" height="32" fill="#e4d2a8"/>
      <g stroke="#c9b285" stroke-width="1" opacity=".8">${Array.from({ length: 13 }, (_, i) => `<line x1="${i * 25}" y1="168" x2="${i * 25}" y2="200"/>`).join('')}<line x1="0" y1="184" x2="300" y2="184"/></g>
      ${cypress(30)}${cypress(270)}${olive(14, 172)}${olive(288, 172)}
      <rect x="56" y="104" width="188" height="64" fill="url(#${id}-blue)"/><rect x="56" y="104" width="188" height="7" fill="#f4e6c4"/>
      <g>${tiles}</g><rect x="56" y="124" width="188" height="3" fill="#f4e6c4" opacity=".8"/>${arches}
      <rect x="50" y="98" width="200" height="7" rx="2" fill="#f4e6c4"/><rect x="50" y="166" width="200" height="5" fill="#cdb98c"/>
      <rect x="100" y="76" width="100" height="24" fill="url(#${id}-blue)"/><rect x="100" y="76" width="100" height="4" fill="#f4e6c4"/>${win}
      ${T.shade ? `<rect width="300" height="200" fill="#0b1a35" opacity="${T.shade}"/>` : ''}
      <path d="M96 78 C96 40 120 20 150 18 C180 20 204 40 204 78 Z" fill="url(#${id}-gold)" stroke="#9a6a10" stroke-width="1.2"/>${ribs}
      <path d="M118 40 C126 28 138 22 150 21" stroke="#fff8d6" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
      <rect x="148.5" y="6" width="3" height="13" fill="#c8901c"/><circle cx="150" cy="10" r="2.6" fill="#f2c33a"/>
      <path d="M150 -1 a5 5 0 1 0 4 8 a4 4 0 1 1 -4 -8z" fill="#f2c33a"/>
    </g>`;
  }

  let uid = 0;
  /** يرسم لوحة المحطة: n قطعة مكتسبة من total (القطع الزائدة عن total في الشبكة تظهر هدية) */
  function svg(key, n, total, opts) {
    opts = opts || {};
    const G = grid(total);
    const id = 'pz' + (++uid);
    const gifts = G.cells - total;                // خانات زائدة لإكمال الشبكة
    const shown = G.order.slice(G.cells - gifts).concat(G.order.slice(0, n));
    const got = new Set(shown);
    const fresh = opts.fresh != null ? new Set(G.order.slice(opts.fresh, n)) : new Set();
    let clips = '', empty = '', filled = '';
    for (let k = 0; k < G.cells; k++) {
      if (got.has(k)) {
        clips += `<clipPath id="${id}-c${k}"><path d="${G.paths[k]}"/></clipPath>`;
        filled += `<g class="pz-piece${fresh.has(k) ? ' pz-new' : ''}"><g clip-path="url(#${id}-c${k})"><use href="#${id}-art"/></g><path d="${G.paths[k]}" fill="none" stroke="rgba(20,20,20,.28)" stroke-width=".7"/></g>`;
      } else {
        empty += `<path class="pz-empty" d="${G.paths[k]}" fill="#f6f1e6" stroke="#c9b993" stroke-width=".8" stroke-dasharray="3 2"/>`;
      }
    }
    const done = n >= total;
    return `<svg class="pz-svg" viewBox="-8 -8 316 216" role="img" aria-label="بازل ${STATIONS[key] ? STATIONS[key].tl : 'قبة الصخرة'}: ${ar(n)} من ${ar(total)} قطعة">
      <defs><g>${domeArt(id + '-art', (STATIONS[key] || STATIONS.stem).theme)}</g>${clips}</defs>
      <rect x="-8" y="-8" width="316" height="216" rx="10" fill="#efe6d2"/>
      ${empty}${filled}${done ? '<rect x="0" y="0" width="300" height="200" fill="none" stroke="#c8901c" stroke-width="3" rx="2"/>' : ''}</svg>`;
  }

  /* ---------- الحالة ---------- */
  function state(p, key) { p.puzzles = p.puzzles || {}; return p.puzzles[key] || null; }
  /** بدء لوحة محطة (تبدأ فارغة). resume: إكمال لوحة غير مكتملة بدل إعادتها */
  function start(p, key, opts) {
    opts = opts || {};
    p.puzzles = p.puzzles || {};
    const total = totalFor(key, p.currentPath);
    const cur = p.puzzles[key];
    if (opts.resume && cur && (cur.got < cur.total || opts.keepComplete)) { p.puzzleActive = key; return cur; }
    p.puzzles[key] = { total, got: 0, runs: ((cur && cur.runs) || 0) + 1, best: (cur && cur.best) || 0, bestTotal: (cur && cur.bestTotal) || total, startedAt: new Date().toISOString() };
    p.puzzleActive = key;
    return p.puzzles[key];
  }
  function stop(p) { p.puzzleActive = null; }
  /** تُستدعى مع كل استجابة مسجّلة: الإجابة الصحيحة في المحطة النشطة تضع قطعة */
  function add(p, r) {
    const key = p.puzzleActive;
    if (!key || !r || !r.correct || r.zone !== key) return null;
    const s = state(p, key); if (!s || s.got >= s.total) return null;
    const before = s.got;
    s.got += 1;
    if (s.got / s.total >= (s.best || 0) / (s.bestTotal || s.total)) { s.best = s.got; s.bestTotal = s.total; }
    if (s.got >= s.total) s.completedAt = new Date().toISOString();
    return { key, before, after: s.got, total: s.total };
  }
  function completed(p) { return KEYS.filter((k) => { const s = state(p, k); return s && s.best >= s.bestTotal; }); }
  function pieces(p) { return KEYS.reduce((a, k) => a + ((state(p, k) || {}).best || 0), 0); }

  /* ---------- اللوحة الجانبية بجانب السؤال ---------- */
  function boxHTML(p, key, fresh) {
    const s = state(p, key) || { got: 0, total: totalFor(key, p.currentPath) };
    const S = STATIONS[key];
    const done = s.got >= s.total;
    return `<section class="pa-box pa-puzzle" aria-label="تحدّي البازل: ${S.t}">
      <div class="pa-head"><b>🧩 بازل ${S.t}</b><span class="pa-count"><b>${ar(s.got)}</b> / ${ar(s.total)}</span></div>
      <div class="pz-frame">${svg(key, s.got, s.total, fresh != null ? { fresh } : {})}</div>
      <div class="pa-bar" aria-hidden="true"><i style="width:${(s.got / s.total) * 100}%"></i></div>
      <p class="pa-hint">${done ? `🕌 اكتملت لوحة «${S.tl}»!` : `عدد القطع = عدد أسئلة المحطة. أجب إجابة صحيحة لتضع القطعة رقم ${ar(s.got + 1)}.`}</p>
    </section>`;
  }
  function mountAside(p, key) {
    const el = document.getElementById('play-aside');
    if (!el) return;
    if (!key) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = boxHTML(p, key);
  }
  function notify(p, res) {
    if (!res) return;
    const aside = document.getElementById('play-aside');
    const box = aside && aside.querySelector('.pa-puzzle');
    const done = res.after >= res.total;
    if (box) {
      const tmp = document.createElement('div'); tmp.innerHTML = boxHTML(p, res.key, res.before);
      const nb = tmp.querySelector('.pa-puzzle');
      box.replaceWith(nb);
      nb.classList.add('pa-flash');
      if (!done) nb.querySelector('.pa-hint').textContent = `🧩 أحسنت! وضعتَ القطعة رقم ${ar(res.after)} من ${ar(res.total)}`;
      PR.sfx.play('click');
    } else {
      PR.toast(`🧩 قطعة جديدة في بازل ${STATIONS[res.key].t}: ${ar(res.after)} / ${ar(res.total)}`, 'reward');
    }
    if (done) {
      setTimeout(() => { PR.sfx.play('badge'); PR.fx.confetti(30); }, 700);
      PR.toast(`🕌 اكتملت لوحة «${STATIONS[res.key].tl}»!`, 'reward');
      if (completed(p).length === KEYS.length && PR.progress.addBadge(p, 'dome_builder')) {
        PR.progress.save(p);
        setTimeout(() => PR.ui.badge('dome_builder'), 1600);
      }
    }
  }

  /* ---------- معرض اللوحات الخمس (الخريطة ولوحة الطالب) ---------- */
  function gallery(p) {
    const items = KEYS.map((k) => {
      const s = state(p, k);
      const S = STATIONS[k];
      const total = s ? s.total : totalFor(k, p.currentPath);
      const got = s ? Math.max(s.got, s.best && s.bestTotal === s.total ? s.best : 0) : 0;
      return `<figure class="pz-tile ${got >= total ? 'done' : ''}"><div class="pz-frame">${svg(k, got, total)}</div>
        <figcaption><b>${S.i} ${S.t}</b><small>${S.tl} · ${s ? `${ar(got)} / ${ar(total)}` : 'لم تبدأ'}${got >= total ? ' ✓' : ''}</small></figcaption></figure>`;
    }).join('');
    return `<div class="puzzle-panel"><h3 class="vt">🧩 تحدّي البازل: قبة الصخرة في خمس محطات</h3>
      <p class="muted small">لكل محطة لوحة لقبة الصخرة في وقت مختلف من اليوم. عدد القطع = عدد أسئلة المحطة، وكل إجابة صحيحة تضع قطعة.</p>
      <div class="pz-gallery">${items}</div>
      <div class="tally"><span>🕌 لوحات مكتملة <b>${ar(completed(p).length)} / ٥</b></span><span>🏅 أكمل الخمس لتنال «بنّاء قبة الصخرة»</span></div></div>`;
  }
  function panel(p) { return gallery(p); }

  PR.puzzle = { STATIONS, KEYS, totalFor, svg, start, stop, add, notify, mountAside, gallery, panel, completed, pieces, state };
})(typeof self !== 'undefined' ? self : this);
