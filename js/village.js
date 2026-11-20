/* =========================================================================
   village.js — نشاط «الخيمة والزيتون»: قرية لولو
   عشر خيام = عشر محطات في الرحلة. كل محطة يُنجزها الطالب تُزيل خيمة وتبني بيتًا،
   وكل محطة يُتقنها (استحقاق ≥ ٨٥٪، أي من المحاولة الأولى غالبًا) تُسقط حبة زيتون
   على الكوفية. عند اكتمال البيوت العشرة يرتفع العلم الفلسطيني.
   الخيمة الباقية = محطة تحتاج مراجعة، ويحوّلها التدريب الموجّه إلى بيت (تكيّف).
   ========================================================================= */
(function (root) {
  'use strict';
  const PR = root.PR = root.PR || {};
  const D = PR.data;
  const ar = D.util.ar;

  const MILESTONES = [
    { key: 'roots-act', t: 'نشاط مدينة الجذور', i: '🌱' }, { key: 'roots-q', t: 'أسئلة الجذر', i: '🌱' },
    { key: 'stem-act', t: 'رحلة الماء في الساق', i: '🌿' }, { key: 'stem-q', t: 'أسئلة الساق', i: '🌿' },
    { key: 'leaves-act', t: 'مصنع الأوراق', i: '🍃' }, { key: 'leaves-q', t: 'أسئلة الأوراق', i: '🍃' },
    { key: 'flower-act', t: 'حديقة الأزهار', i: '🌸' }, { key: 'flower-q', t: 'أسئلة الزهرة', i: '🌸' },
    { key: 'lab', t: 'المختبر النباتي', i: '🔬' }, { key: 'rescue', t: 'إنقاذ لولو', i: '🚨' },
  ];
  const RANK = { tent: 0, house: 1, olive: 2 };
  const OLIVES = [{ bx: 78, by: 74, kx: 68, ky: 185 }, { bx: 112, by: 56, kx: 88, ky: 187 }, { bx: 152, by: 68, kx: 108, ky: 184 }, { bx: 176, by: 96, kx: 128, ky: 188 }, { bx: 64, by: 104, kx: 148, ky: 185 }, { bx: 96, by: 95, kx: 168, ky: 187 }, { bx: 134, by: 92, kx: 80, ky: 199 }, { bx: 162, by: 114, kx: 104, ky: 201 }, { bx: 118, by: 115, kx: 132, ky: 200 }, { bx: 85, by: 120, kx: 156, ky: 199 }];

  function resultFor(credit) { return credit >= 0.85 ? 'olive' : credit >= 0.45 ? 'house' : 'tent'; }

  function counts(p) {
    const v = p.village || {};
    const vals = MILESTONES.map((m) => v[m.key]).filter(Boolean);
    return { houses: vals.filter((r) => r !== 'tent').length, olives: vals.filter((r) => r === 'olive').length, tents: vals.filter((r) => r === 'tent').length, done: vals.length };
  }

  /** يسجّل نتيجة محطة (يحتفظ بأفضل نتيجة عند الإعادة) ويعيد ما تغيّر */
  function record(p, key, credit) {
    p.village = p.village || {};
    const prev = p.village[key] || null;
    const res = resultFor(credit);
    const best = !prev || RANK[res] > RANK[prev] ? res : prev;
    p.village[key] = best;
    const before = countsFrom(Object.assign({}, p.village, { [key]: prev }));
    if (PR.progress) PR.progress.log(p, 'village', `محطة «${(MILESTONES.find((m) => m.key === key) || {}).t}»: ${{ olive: 'بيت + حبة زيتون', house: 'بيت', tent: 'بقيت الخيمة للمراجعة' }[best]}`);
    return { key, prev, result: best, before };
  }
  function countsFrom(v) { return counts({ village: Object.fromEntries(Object.entries(v).filter(([, x]) => x)) }); }

  /** التدريب الموجّه يبني أول خيمة باقية */
  function repairTent(p) {
    const k = MILESTONES.find((m) => (p.village || {})[m.key] === 'tent');
    if (!k) return null;
    return record(p, k.key, 0.6);
  }

  /* ---------- رسم المشهد ---------- */
  function slotSVG(k) {
    const col = k % 5, row = (k / 5) | 0, x = 140 + (4 - col) * 44, y = 70 + row * 58;
    return `<g transform="translate(${x},${y}) scale(.72)"><g class="slot" id="vslot${k}"><rect x="3" y="54" width="54" height="4" rx="2" fill="#c7b183"/>
      <g class="tent"><line x1="30" y1="14" x2="30" y2="4" stroke="#7a5418" stroke-width="2"/><polygon points="30,4 39,7 30,10" fill="#c4502f"/><polygon points="6,54 30,13 54,54" fill="#dfa648" stroke="#a8731f" stroke-width="1.5" stroke-linejoin="round"/><polygon points="23,54 30,32 37,54" fill="#6b4a1a"/></g>
      <g class="house"><rect x="38" y="13" width="6" height="12" fill="#9c3d22"/><rect x="11" y="28" width="38" height="26" fill="#f6e7c8" stroke="#b89b6a" stroke-width="1.2"/><polygon points="6,30 30,9 54,30" fill="#c4502f" stroke="#9c3d22" stroke-width="1.2" stroke-linejoin="round"/><rect x="26" y="39" width="9" height="15" rx="1" fill="#7a4b2a"/><rect x="15" y="34" width="8" height="8" fill="#9fd3ea" stroke="#b89b6a"/><rect x="38" y="34" width="8" height="8" fill="#9fd3ea" stroke="#b89b6a"/></g></g></g>`;
  }
  function treeSVG(id) {
    const ol = OLIVES.map((o, k) => `<g id="${id}-ol${k}" class="olive-drop"><ellipse cx="${o.bx}" cy="${o.by}" rx="5.5" ry="7.5" fill="#1a2e05" stroke="#365314"/><ellipse cx="${o.bx - 1.8}" cy="${o.by - 2.4}" rx="1.6" ry="2.6" fill="#84cc16" opacity=".55"/><path d="M${o.bx} ${o.by - 7.5} Q${o.bx + 3} ${o.by - 11} ${o.bx + 5} ${o.by - 9}" fill="none" stroke="#365314" stroke-width="1.2" stroke-linecap="round"/></g>`).join('');
    return `<defs><pattern id="${id}-kef" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#fff"/><path d="M0 0 L12 12 M12 0 L0 12" stroke="#1e293b" stroke-width="1.15" opacity=".72"/><rect x="4.5" y="4.5" width="3" height="3" transform="rotate(45 6 6)" fill="#0f172a" opacity=".82"/></pattern></defs>
      <g transform="translate(0,62) scale(.55)">
      <path d="M108 182 Q112 145 104 122 Q92 104 75 96 M124 182 Q122 142 132 118 Q148 102 165 95 M116 142 Q118 115 118 92" fill="none" stroke="#78350f" stroke-width="9" stroke-linecap="round"/>
      <path d="M102 184 Q116 174 134 184 L129 144 Q118 136 108 144 Z" fill="#78350f"/>
      <circle cx="84" cy="96" r="34" fill="#3f6212"/><circle cx="154" cy="94" r="35" fill="#3f6212"/><circle cx="120" cy="68" r="40" fill="#4d7c0f"/><circle cx="74" cy="78" r="24" fill="#4d7c0f"/><circle cx="164" cy="76" r="25" fill="#4d7c0f"/><circle cx="102" cy="94" r="32" fill="#65a30d" opacity=".85"/><circle cx="140" cy="90" r="30" fill="#65a30d" opacity=".8"/><circle cx="120" cy="62" r="28" fill="#84cc16" opacity=".4"/>
      <polygon points="48,179 192,179 206,214 34,214" fill="#0f172a" opacity=".14"/>
      <polygon points="48,176 192,176 206,211 34,211" fill="url(#${id}-kef)" stroke="#0f172a" stroke-width="1.8" stroke-linejoin="round"/>
      <polygon points="52,180 188,180 199,207 41,207" fill="none" stroke="#0f172a" stroke-width="1.4" stroke-dasharray="4 2"/>
      <path d="M46 180 L38 182 M44 187 L35 189 M41 194 L32 196 M39 201 L30 203 M36 208 L27 210 M194 180 L202 182 M196 187 L205 189 M199 194 L208 196 M201 201 L210 203 M204 208 L213 210" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>
      ${ol}</g>`;
  }
  let uid = 0;
  function sceneSVG() {
    const id = 'vg' + (++uid);
    return { id, html: `<svg class="vscene" id="${id}" viewBox="0 0 360 210" role="img" aria-label="قرية لولو">
      <rect width="360" height="210" fill="#e3f1f7"/>
      <g fill="#f2b632"><circle cx="330" cy="28" r="13"/></g><g stroke="#f2b632" stroke-width="2" stroke-linecap="round"><path d="M330 8v-5M330 53v-5M310 28h-5M355 28h-5M316 14l-3-3M347 45l-3-3M344 14l3-3M313 45l3-3"/></g>
      <g fill="#fff" opacity=".9"><ellipse cx="200" cy="30" rx="22" ry="9"/><ellipse cx="216" cy="24" rx="14" ry="9"/></g>
      <path d="M0,176 Q90,160 180,172 T360,168 V210 H0Z" fill="#dccb9f"/>
      <g class="vflag"><line x1="352" y1="176" x2="352" y2="52" stroke="#4a3a2a" stroke-width="2"/><g transform="translate(330,52)"><rect width="22" height="4.5" fill="#141414"/><rect y="4.5" width="22" height="4.5" fill="#fff"/><rect y="9" width="22" height="4.5" fill="#007a3d"/><polygon points="22,0 14,6.75 22,13.5" fill="#ce1126"/></g></g>
      ${treeSVG(id)}${Array.from({ length: 10 }, (_, k) => slotSVG(k)).join('')}
      <text x="176" y="206" text-anchor="middle" font-size="0">قرية</text></svg>` };
  }

  function applyState(svg, id, c) {
    for (let k = 0; k < 10; k++) {
      svg.querySelector('#vslot' + k).classList.toggle('built', k < c.houses);
      const el = svg.querySelector(`#${id}-ol${k}`), o = OLIVES[k];
      el.style.transform = k < c.olives ? `translate(${o.kx - o.bx}px,${o.ky - o.by}px)` : 'translate(0px,0px)';
    }
    svg.querySelector('.vflag').classList.toggle('up', c.houses === 10);
    svg.setAttribute('aria-label', `قرية لولو: ${ar(c.houses)} بيوت و${ar(10 - c.houses)} خيام، و${ar(c.olives)} حبات زيتون على الكوفية${c.houses === 10 ? '، والعلم يرفرف' : ''}`);
  }

  /** لوحة القرية الكاملة (تُستخدم في الخريطة ولوحة الطالب) */
  function panel(p, opts) {
    opts = opts || {};
    const c = counts(p);
    const s = sceneSVG();
    if (opts.bare) return `<div class="village-panel bare">${s.html.replace('class="vscene"', `class="vscene" data-vid="${s.id}"`)}</div>`;
    const tents = MILESTONES.filter((m) => (p.village || {})[m.key] === 'tent');
    return `<div class="village-panel">
      <div class="vhead"><div><h3 class="vt">⛺ قرية لولو: تحدّي الخيمة والزيتون</h3><p>كل محطة تُنجزها تُزيل خيمة وتبني بيتًا، وكل محطة تُتقنها من المحاولة الأولى تُسقط حبة زيتون على الكوفية. ابنِ البيوت العشرة ليرتفع العلم!</p></div></div>
      ${s.html.replace('class="vscene"', `class="vscene" data-vid="${s.id}"`)}
      <div class="tally"><span>🏠 بيوت <b>${ar(c.houses)} / ١٠</b></span><span><i class="olive-ic" aria-hidden="true"></i> زيتون على الكوفية <b>${ar(c.olives)} / ١٠</b></span></div>
      ${opts.compact ? '' : `<ul class="vkey"><li><i class="olive-ic" aria-hidden="true"></i> + 🏠 إتقان المحطة من المحاولة الأولى</li><li>🏠 إنجاز المحطة بعد محاولات أو تلميحات</li><li>⛺ تبقى الخيمة للمراجعة، ويبنيها التدريب الموجّه</li></ul>`}
      ${tents.length && !opts.compact ? `<p class="vtents">⛺ خيام تنتظر المراجعة: ${tents.map((m) => `${m.i} ${m.t}`).join('، ')} — <a href="zone.html?mode=train&skill=${PR.engine.weakestSkills(p, 1)[0].s}">ابنِها بالتدريب الموجّه</a></p>` : ''}
    </div>`;
  }
  /** بعد إدراج اللوحة في الصفحة: تطبيق الحالة (مع حركة اختيارية من حالة سابقة) */
  function mount(scope, p, from) {
    const svg = scope.querySelector('.vscene'); if (!svg) return;
    const id = svg.dataset.vid || svg.id;
    const c = counts(p);
    if (from) {
      svg.classList.add('no-anim'); applyState(svg, id, from); void svg.getBoundingClientRect(); svg.classList.remove('no-anim');
      setTimeout(() => applyState(svg, id, c), 450);
    } else applyState(svg, id, c);
  }

  /** نافذة احتفال بعد كل محطة: الخيمة تصبح بيتًا وتسقط الزيتونة أمام الطالب */
  function celebrate(p, rec) {
    const m = MILESTONES.find((x) => x.key === rec.key);
    const msg = { olive: '<i class="olive-ic" aria-hidden="true"></i> أتقنتَ المحطة من المحاولة الأولى: بُني بيت جديد وسقطت حبة زيتون على الكوفية!', house: '🏠 أحسنت! أُزيلت خيمة وبُني مكانها بيت.', tent: '⛺ بقيت الخيمة هذه المرة… سيقترح عليك نَبْتي تدريبًا يبنيها.' }[rec.result];
    const c = counts(p);
    if (rec.result !== 'tent') PR.sfx.play(rec.result === 'olive' ? 'badge' : 'correct');
    return PR.modal(`<div class="vcelebrate"><p class="eyebrow">⛺ تحدّي الخيمة والزيتون · ${m ? m.i + ' ' + m.t : ''}</p>
      ${panel(p, { compact: true })}<p class="vmsg ${rec.result}">${msg}</p>${c.houses === 10 ? '<p class="vmsg olive">🇵🇸 اكتملت البيوت العشرة… وارتفع العلم فوق قرية لولو!</p>' : ''}
      <div class="row-end"><button class="btn btn-primary" data-close="ok">تابع الرحلة ←</button></div></div>`, {
      label: 'قرية لولو', cls: 'wide',
      onOpen(ov) { mount(ov, p, rec.before); if (c.houses === 10 && rec.result !== 'tent') setTimeout(() => PR.fx.confetti(40), 900); },
    }).then((v) => {
      // تحديث القرية في اللوحة الجانبية بجانب السؤال (مع الحركة)
      const box = document.querySelector('#play-aside .pa-village');
      if (box && PR.puzzle) { PR.puzzle.mountAside(p); const nb = document.querySelector('#play-aside .pa-village'); if (nb) { mount(nb, p, rec.before); nb.classList.add('pa-flash'); } }
      return v;
    });
  }

  /** ترحيل: المناطق التي أُنجزت قبل إضافة القرية تُحتسب بيوتها من الاستجابات المحفوظة */
  function sync(p) {
    p.village = p.village || {};
    let changed = false;
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const resp = p.responses || [];
    ['roots', 'stem', 'leaves', 'flower'].forEach((z) => {
      if (!p.zones || !p.zones[z] || p.zones[z].status !== 'done') return;
      const zr = resp.filter((r) => r.zone === z && r.credit != null);
      const act = avg(zr.filter((r) => /-activity$|-why$/.test(r.qid || '')).map((r) => r.credit));
      const q = avg(zr.filter((r) => !/-activity$|-why$|-explore$|-micro-id$|-open$/.test(r.qid || '')).map((r) => r.credit));
      if (!p.village[`${z}-act`]) { p.village[`${z}-act`] = resultFor(act == null ? 0.7 : act); changed = true; }
      if (!p.village[`${z}-q`]) { p.village[`${z}-q`] = resultFor(q == null ? 0.7 : q); changed = true; }
    });
    [['lab', 'lab'], ['rescue', 'rescue']].forEach(([z, key]) => {
      if (p.zones && p.zones[z] && p.zones[z].status === 'done' && !p.village[key]) {
        const a = avg(resp.filter((r) => r.zone === z && r.credit != null).map((r) => r.credit));
        p.village[key] = resultFor(a == null ? 0.7 : a); changed = true;
      }
    });
    return changed;
  }

  PR.village = { MILESTONES, resultFor, counts, record, repairTent, panel, mount, celebrate, sync };
})(typeof self !== 'undefined' ? self : this);
