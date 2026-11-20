/* =========================================================================
   puzzle.js — نشاط «بازل قبة الصخرة»
   لوحة مرسومة برمجيًا (SVG) لقبة الصخرة مقسّمة إلى ٤٨ قطعة بازل متداخلة.
   كل إجابة صحيحة خلال الرحلة (بعد التشخيص) تضيف قطعة، وتظهر بطاقة صغيرة
   تُري القطعة الجديدة وهي تستقر في مكانها. عند الاكتمال: شارة «بنّاء قبة الصخرة».
   ========================================================================= */
(function (root) {
  'use strict';
  const PR = root.PR = root.PR || {};
  const D = PR.data;
  const ar = D.util.ar;
  const C = 8, R = 6, W = 300 / 8, H = 200 / 6, TOTAL = C * R;

  /* ---------- ترتيب ظهور القطع (ثابت، يبدأ من القبة الذهبية) ---------- */
  // تظهر القطع بدءًا من القبة الذهبية ثم تنتشر نحو الأطراف (ترتيب ثابت)
  const ORDER = Array.from({ length: TOTAL }, (_, k) => k).sort((a, b) => {
    const d = (k) => { const cx = (k % C + 0.5) * W, cy = ((k / C | 0) + 0.5) * H; return Math.hypot(cx - 150, (cy - 60) * 1.3) + ((k * 37) % 11); };
    return d(a) - d(b);
  });

  /* ---------- أشكال القطع (ألسنة وتجاويف) ---------- */
  function rnd(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  const r0 = rnd(1948);
  const HZ = Array.from({ length: R - 1 }, () => Array.from({ length: C }, () => (r0() > 0.5 ? 1 : -1)));
  const VT = Array.from({ length: R }, () => Array.from({ length: C - 1 }, () => (r0() > 0.5 ? 1 : -1)));
  const f = (n) => Math.round(n * 10) / 10;
  function edge(x1, y1, x2, y2, dir) {
    if (!dir) return `L${f(x2)} ${f(y2)}`;
    const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = uy, ny = -ux;
    const s = 0.24 * Math.min(W, H) * dir;
    const P = (a, b) => `${f(x1 + ux * a * L + nx * b)} ${f(y1 + uy * a * L + ny * b)}`;
    return `L${P(0.36, 0)} C${P(0.42, 0)} ${P(0.3, s)} ${P(0.5, s)} C${P(0.7, s)} ${P(0.58, 0)} ${P(0.64, 0)} L${f(x2)} ${f(y2)}`;
  }
  function piecePath(k) {
    const r = (k / C) | 0, c = k % C, x = c * W, y = r * H;
    const top = r === 0 ? 0 : -HZ[r - 1][c];
    const right = c === C - 1 ? 0 : VT[r][c];
    const bottom = r === R - 1 ? 0 : HZ[r][c];
    const left = c === 0 ? 0 : -VT[r][c - 1];
    return `M${x} ${y} ${edge(x, y, x + W, y, top)} ${edge(x + W, y, x + W, y + H, right)} ${edge(x + W, y + H, x, y + H, bottom)} ${edge(x, y + H, x, y, left)} Z`;
  }
  const PATHS = Array.from({ length: TOTAL }, (_, k) => piecePath(k));

  /* ---------- رسم قبة الصخرة (٣٠٠×٢٠٠) ---------- */
  function domeArt(id) {
    let tiles = '';
    for (let x = 62; x < 238; x += 11) tiles += `<rect x="${x}" y="112" width="8" height="8" transform="rotate(45 ${x + 4} 116)" fill="#e9f2fb" opacity=".85"/>`;
    let arches = '';
    for (let x = 66; x < 236; x += 21) arches += `<path d="M${x} 168 V150 a7 7 0 0 1 14 0 V168Z" fill="#1d3f73"/><path d="M${x + 2} 168 V151 a5 5 0 0 1 10 0 V168Z" fill="#f4e6c4" opacity=".35"/>`;
    let win = '';
    for (let x = 112; x < 190; x += 13) win += `<path d="M${x} 92 V84 a3.5 3.5 0 0 1 7 0 V92Z" fill="#14325e"/>`;
    let ribs = '';
    for (let i = -3; i <= 3; i++) ribs += `<path d="M150 18 Q${150 + i * 13} 40 ${150 + i * 16} 76" stroke="#b07d12" stroke-width="1" fill="none" opacity=".45"/>`;
    const cypress = (x) => `<g transform="translate(${x} 0)"><rect x="-1.5" y="160" width="3" height="16" fill="#5b3a1e"/><path d="M0 104 C9 128 9 150 0 166 C-9 150 -9 128 0 104Z" fill="#2f5d2a"/><path d="M0 110 C5 128 5 148 0 160" stroke="#3f7a36" stroke-width="2" fill="none"/></g>`;
    const olive = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-2" y="0" width="4" height="12" fill="#6b4a2a"/><circle cy="-4" r="10" fill="#6f8f42"/><circle cx="-7" cy="2" r="7" fill="#7f9f4a"/><circle cx="7" cy="2" r="7" fill="#5f7f35"/></g>`;
    return `<g id="${id}">
      <defs><linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd0ec"/><stop offset=".7" stop-color="#e7f3f8"/><stop offset="1" stop-color="#f6ead0"/></linearGradient>
      <radialGradient id="${id}-gold" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff3b0"/><stop offset=".35" stop-color="#f2c33a"/><stop offset=".8" stop-color="#c8901c"/><stop offset="1" stop-color="#9a6a10"/></radialGradient>
      <linearGradient id="${id}-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7bc4"/><stop offset="1" stop-color="#1f5fa8"/></linearGradient></defs>
      <rect width="300" height="200" fill="url(#${id}-sky)"/>
      <circle cx="262" cy="32" r="14" fill="#fff6c9" opacity=".9"/>
      <g fill="#fff" opacity=".85"><ellipse cx="60" cy="34" rx="22" ry="8"/><ellipse cx="76" cy="28" rx="14" ry="8"/></g>
      <path d="M0 150 Q50 136 100 146 T200 142 T300 148 V200 H0Z" fill="#d9c49a"/>
      <rect x="0" y="168" width="300" height="32" fill="#e4d2a8"/>
      <g stroke="#c9b285" stroke-width="1" opacity=".8">${Array.from({ length: 13 }, (_, i) => `<line x1="${i * 25}" y1="168" x2="${i * 25}" y2="200"/>`).join('')}<line x1="0" y1="184" x2="300" y2="184"/></g>
      ${cypress(30)}${cypress(270)}${olive(14, 172)}${olive(288, 172)}
      <rect x="56" y="104" width="188" height="64" fill="url(#${id}-blue)"/>
      <rect x="56" y="104" width="188" height="7" fill="#f4e6c4"/>
      <g>${tiles}</g>
      <rect x="56" y="124" width="188" height="3" fill="#f4e6c4" opacity=".8"/>
      ${arches}
      <rect x="50" y="98" width="200" height="7" rx="2" fill="#f4e6c4"/><rect x="50" y="166" width="200" height="5" fill="#cdb98c"/>
      <rect x="100" y="76" width="100" height="24" fill="url(#${id}-blue)"/><rect x="100" y="76" width="100" height="4" fill="#f4e6c4"/>
      ${win}
      <path d="M96 78 C96 40 120 20 150 18 C180 20 204 40 204 78 Z" fill="url(#${id}-gold)" stroke="#9a6a10" stroke-width="1.2"/>
      ${ribs}
      <path d="M118 40 C126 28 138 22 150 21" stroke="#fff8d6" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
      <rect x="148.5" y="6" width="3" height="13" fill="#c8901c"/><circle cx="150" cy="10" r="2.6" fill="#f2c33a"/>
      <path d="M150 -1 a5 5 0 1 0 4 8 a4 4 0 1 1 -4 -8z" fill="#f2c33a"/>
    </g>`;
  }

  function correctCount(p) { return (p.responses || []).filter((r) => r.source !== 'diagnostic' && r.correct).length; }
  /** القطع = الإجابات الصحيحة منذ بدء البازل (puzzleBase) — يبدأ البازل فارغًا دائمًا */
  function pieces(p) { return Math.max(0, Math.min(TOTAL, correctCount(p) - (p.puzzleBase || 0))); }

  let uid = 0;
  /** يرسم اللوحة: القطع المكتسبة تُظهر الصورة، والباقية قطع كتّانية فارغة */
  function svg(n, opts) {
    opts = opts || {};
    const id = 'pz' + (++uid);
    const got = new Set(ORDER.slice(0, n));
    const fresh = opts.fresh != null ? new Set(ORDER.slice(opts.fresh, n)) : new Set();
    let clips = '', empty = '', filled = '';
    for (let k = 0; k < TOTAL; k++) {
      if (got.has(k)) {
        clips += `<clipPath id="${id}-c${k}"><path d="${PATHS[k]}"/></clipPath>`;
        filled += `<g class="pz-piece${fresh.has(k) ? ' pz-new' : ''}"><g clip-path="url(#${id}-c${k})"><use href="#${id}-art"/></g><path d="${PATHS[k]}" fill="none" stroke="rgba(20,20,20,.28)" stroke-width=".7"/></g>`;
      } else {
        empty += `<path class="pz-empty" d="${PATHS[k]}" fill="#f6f1e6" stroke="#c9b993" stroke-width=".8" stroke-dasharray="3 2"/>`;
      }
    }
    const body = empty + filled;
    return `<svg class="pz-svg" viewBox="-8 -8 316 216" role="img" aria-label="بازل قبة الصخرة: ${ar(n)} من ${ar(TOTAL)} قطعة">
      <defs><g id="${id}-src">${domeArt(id + '-art')}</g>${clips}</defs>
      <rect x="-8" y="-8" width="316" height="216" rx="10" fill="#efe6d2"/>
      ${body}${n >= TOTAL ? `<rect x="0" y="0" width="300" height="200" fill="none" stroke="#c8901c" stroke-width="3" rx="2"/>` : ''}</svg>`.replace(`<g id="${id}-src">`, '<g>');
  }

  function panel(p) {
    const n = pieces(p);
    return `<div class="puzzle-panel">
      <h3 class="vt">🕌 بازل قبة الصخرة</h3>
      <p class="muted small">كل إجابة صحيحة في الرحلة تضيف قطعة إلى اللوحة. أكمل القطع الثماني والأربعين!</p>
      <div class="pz-frame">${svg(n)}</div>
      <div class="tally"><span>🧩 القطع <b>${ar(n)} / ${ar(TOTAL)}</b></span><span>${n >= TOTAL ? '✓ اكتملت اللوحة' : `بقي ${ar(TOTAL - n)}`}</span></div>
      ${n >= TOTAL ? `<p class="pz-info">🕌 قبة الصخرة في المسجد الأقصى المبارك بالقدس، بُنيت قبل أكثر من ١٣٠٠ عام، وتزيّن قبتها الذهبية سماء المدينة.</p>` : ''}
    </div>`;
  }

  /* ---------- اللوحة الجانبية الثابتة بجانب السؤال (البازل + القرية) ---------- */
  function asideHTML(p, fresh) {
    const n = pieces(p);
    const next = Math.min(TOTAL, n + 1);
    return `<section class="pa-box pa-puzzle" aria-label="بازل قبة الصخرة">
        <div class="pa-head"><b>🕌 بازل قبة الصخرة</b><span class="pa-count"><b>${ar(n)}</b> / ${ar(TOTAL)}</span></div>
        <div class="pz-frame">${svg(n, fresh != null ? { fresh } : {})}</div>
        <div class="pa-bar" aria-hidden="true"><i style="width:${(n / TOTAL) * 100}%"></i></div>
        <p class="pa-hint">${n >= TOTAL ? '✓ اكتملت قبة الصخرة!' : `🧩 أجب إجابة صحيحة لتضع القطعة رقم ${ar(next)}`}</p>
      </section>
      ${PR.village ? `<section class="pa-box pa-village" aria-label="قرية لولو">
        <div class="pa-head"><b>⛺ قرية لولو</b><span class="pa-count">🏠 <b>${ar(PR.village.counts(p).houses)}</b> · 🫒 <b>${ar(PR.village.counts(p).olives)}</b></span></div>
        ${PR.village.panel(p, { compact: true, bare: true })}
        <p class="pa-hint">أنجِز المحطة لتبني بيتًا، وأتقنها من أول محاولة لتسقط زيتونة.</p>
      </section>` : ''}`;
  }
  function mountAside(p) {
    const el = document.getElementById('play-aside');
    if (!el) return false;
    el.innerHTML = asideHTML(p);
    if (PR.village) PR.village.mount(el.querySelector('.pa-village') || el, p);
    return true;
  }

  /** بعد كل إجابة صحيحة: القطعة الجديدة تطير إلى مكانها في اللوحة الجانبية (أو بطاقة منبثقة إن لم توجد اللوحة) */
  function notify(p, before, after) {
    if (after <= before) return;
    const aside = document.getElementById('play-aside');
    if (aside) {
      const box = aside.querySelector('.pa-puzzle');
      if (box) {
        const tmp = document.createElement('div'); tmp.innerHTML = asideHTML(p, before);
        box.replaceWith(tmp.querySelector('.pa-puzzle'));
        const nb = aside.querySelector('.pa-puzzle');
        nb.classList.add('pa-flash');
        nb.querySelector('.pa-hint').textContent = `🧩 أحسنت! وضعتَ القطعة رقم ${ar(after)} من ${ar(TOTAL)}`;
        PR.sfx.play('click');
      }
      if (after >= TOTAL && before < TOTAL) complete(p);
      return;
    }
    let w = document.getElementById('pz-toast');
    if (!w) { w = document.createElement('div'); w.id = 'pz-toast'; w.className = 'pz-toast'; w.setAttribute('role', 'status'); document.body.appendChild(w); }
    w.innerHTML = `<div class="pz-mini">${svg(after, { fresh: before })}</div><p>🧩 قطعة جديدة في بازل قبة الصخرة! <b>${ar(after)} / ${ar(TOTAL)}</b></p>`;
    w.classList.remove('out'); w.classList.add('in');
    clearTimeout(w._t); w._t = setTimeout(() => w.classList.replace('in', 'out'), 3000);
    if (after >= TOTAL && before < TOTAL) complete(p);
  }
  function complete(p) {
    const isNew = PR.progress.addBadge(p, 'dome_builder');
    PR.progress.save(p);
    setTimeout(() => {
      PR.sfx.play('badge'); PR.fx.confetti(40);
      PR.modal(`<div class="center"><p class="eyebrow">🧩 اكتمل البازل!</p><h2>🕌 أكملتَ لوحة قبة الصخرة</h2><div class="pz-frame big">${svg(TOTAL)}</div>
        <p class="pz-info">قبة الصخرة في المسجد الأقصى المبارك بالقدس، بُنيت قبل أكثر من ١٣٠٠ عام، وتزيّن قبتها الذهبية سماء المدينة.</p>
        ${isNew ? '<p><b>🏅 حصلت على شارة «بنّاء قبة الصخرة»</b></p>' : ''}<div class="row-end" style="justify-content:center"><button class="btn btn-primary" data-close="ok">رائع! 🌟</button></div></div>`, { label: 'اكتمل البازل', cls: 'wide' });
    }, 1200);
  }

  PR.puzzle = { TOTAL, pieces, correctCount, svg, panel, notify, mountAside };
})(typeof self !== 'undefined' ? self : this);
