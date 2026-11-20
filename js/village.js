/* =========================================================================
   village.js — تحدّي «الخيمة والزيتون» في مركز إنقاذ لولو
   عشر خيام = عشرة أسئلة في مركز الإنقاذ (الأدلة، المشكلة، الجزء، الحل،
   وأسئلة التقييم النهائي الستة).
   - إجابة صحيحة من المحاولة الأولى بلا تلميح: تُزال الخيمة ويُبنى بيت + تسقط حبة زيتون على الكوفية
   - إجابة صحيحة بعد محاولة أو تلميح: يُبنى بيت
   - إجابة خاطئة: تبقى الخيمة
   عند اكتمال البيوت العشرة يرتفع العلم الفلسطيني فوق القرية.
   ========================================================================= */
(function (root) {
  'use strict';
  const PR = root.PR = root.PR || {};
  const D = PR.data;
  const ar = D.util.ar;
  const SLOTS = 10;
  const OLIVES = [{ bx: 78, by: 74, kx: 68, ky: 185 }, { bx: 112, by: 56, kx: 88, ky: 187 }, { bx: 152, by: 68, kx: 108, ky: 184 }, { bx: 176, by: 96, kx: 128, ky: 188 }, { bx: 64, by: 104, kx: 148, ky: 185 }, { bx: 96, by: 95, kx: 168, ky: 187 }, { bx: 134, by: 92, kx: 80, ky: 199 }, { bx: 162, by: 114, kx: 104, ky: 201 }, { bx: 118, by: 115, kx: 132, ky: 200 }, { bx: 85, by: 120, kx: 156, ky: 199 }];

  function resultOf(r) { return !r.correct ? 'tent' : (r.attempts === 1 && !r.hints) ? 'olive' : 'house'; }
  function list(p) { return (p.rescueVillage && p.rescueVillage.results) || []; }
  function counts(p) {
    const r = list(p);
    return { houses: r.filter((x) => x !== 'tent').length, olives: r.filter((x) => x === 'olive').length, tents: SLOTS - r.filter((x) => x !== 'tent').length, answered: r.length };
  }
  /** بداية مهمة الإنقاذ: القرية كلها خيام */
  function start(p) { p.rescueVillage = { results: [], startedAt: new Date().toISOString() }; }
  /** تسجيل نتيجة سؤال في مركز الإنقاذ */
  function record(p, r) {
    if (!p.rescueVillage) start(p);
    const res = p.rescueVillage.results;
    if (res.length >= SLOTS) return null;
    const before = res.slice();
    res.push(resultOf(r));
    return { before, result: res[res.length - 1], index: res.length - 1 };
  }

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

  function applyState(svg, id, results) {
    const olives = results.filter((x) => x === 'olive').length;
    for (let k = 0; k < SLOTS; k++) {
      const s = svg.querySelector('#vslot' + k);
      s.classList.toggle('built', results[k] === 'house' || results[k] === 'olive');
      s.classList.toggle('stays', results[k] === 'tent');
      const el = svg.querySelector(`#${id}-ol${k}`), o = OLIVES[k];
      el.style.transform = k < olives ? `translate(${o.kx - o.bx}px,${o.ky - o.by}px)` : 'translate(0px,0px)';
    }
    const houses = results.filter((x) => x !== 'tent').length;
    svg.querySelector('.vflag').classList.toggle('up', houses === SLOTS);
    svg.setAttribute('aria-label', `قرية لولو: ${ar(houses)} بيوت و${ar(SLOTS - houses)} خيام، و${ar(olives)} حبات زيتون على الكوفية${houses === SLOTS ? '، والعلم يرفرف' : ''}`);
  }
  function scene() { const s = sceneSVG(); return { id: s.id, html: s.html.replace('class="vscene"', `class="vscene" data-vid="${s.id}"`) }; }
  function mount(scope, p, from) {
    const svg = scope.querySelector('.vscene'); if (!svg) return;
    const id = svg.dataset.vid;
    if (from) {
      svg.classList.add('no-anim'); applyState(svg, id, from); void svg.getBoundingClientRect(); svg.classList.remove('no-anim');
      setTimeout(() => applyState(svg, id, list(p)), 350);
    } else applyState(svg, id, list(p));
  }

  /** اللوحة الكاملة (الخريطة ولوحة الطالب) */
  function panel(p) {
    const c = counts(p);
    const started = !!p.rescueVillage;
    return `<div class="village-panel">
      <div class="vhead"><div><h3 class="vt">⛺ تحدّي الخيمة والزيتون: مركز إنقاذ لولو</h3><p>في مركز الإنقاذ عشرة أسئلة وعشر خيام. كل إجابة صحيحة تُزيل خيمة وتبني بيتًا، وكل إجابة صحيحة من المحاولة الأولى تُسقط حبة زيتون على الكوفية. ابنِ البيوت العشرة ليرتفع العلم!</p></div></div>
      ${scene().html}
      <div class="tally"><span>🏠 بيوت <b>${ar(c.houses)} / ${ar(SLOTS)}</b></span><span><i class="olive-ic" aria-hidden="true"></i> زيتون على الكوفية <b>${ar(c.olives)} / ${ar(SLOTS)}</b></span></div>
      <ul class="vkey"><li><i class="olive-ic" aria-hidden="true"></i> + 🏠 إجابة صحيحة من المحاولة الأولى</li><li>🏠 إجابة صحيحة بعد محاولة أو تلميح</li><li>⛺ تبقى الخيمة عند الإجابة الخاطئة</li></ul>
      ${started ? '' : '<p class="vtents">🚨 يبدأ هذا التحدّي عند دخول مركز إنقاذ لولو (المحطة السادسة).</p>'}
    </div>`;
  }
  function mountPanel(scope, p) { mount(scope, p); }

  /* ---------- رسائل التحدّي (مثل التصميم المرجعي) ---------- */
  const OLIVE = '<i class="olive-ic" aria-hidden="true"></i>';
  /** يظهر تحت السؤال قبل الإجابة: ماذا سيحدث للقرية */
  function stakes(p) {
    const c = counts(p);
    return `⛺ الخيمة رقم ${ar(c.answered + 1)}: أجب صحيحًا من المحاولة الأولى ← 🏠 بيت + ${OLIVE} زيتونة على الكوفية`;
  }
  /** رسالة النتيجة في بطاقة السؤال بعد الإجابة */
  function consequence(r) {
    const res = resultOf(r);
    if (res === 'olive') return { cls: 'good', html: `✓ ممتاز من المحاولة الأولى! أُزيلت خيمة وبُني مكانها بيت 🏠، وسقطت حبة زيتون على الكوفية ${OLIVE}` };
    if (res === 'house') return { cls: 'good', html: '✓ إجابة صحيحة! أُزيلت خيمة وبُني مكانها بيت 🏠 (لم تسقط زيتونة لأنك احتجت محاولة أخرى أو تلميحًا).' };
    return { cls: 'bad', html: '⛺ بقيت الخيمة هذه المرة، وهذا هو الحل للمراجعة (الإجابة الصحيحة مُعلَّمة بـ ✓).' };
  }

  /** لوحة القرية الكبيرة بجانب السؤال في صفحة الإنقاذ */
  function asideHTML(p) {
    const c = counts(p);
    const done = c.answered >= SLOTS;
    return `<section class="pa-box pa-village big" aria-label="تحدّي الخيمة والزيتون">
      <div class="vhead"><div><h3 class="vt">⛺ قرية لولو</h3><p>كل سؤال تحلّه يُزيل خيمة ويبني بيتًا. وكل سؤال تحلّه من المحاولة الأولى يُسقط حبة زيتون على الكوفية.</p></div>
        <button class="icon-btn" type="button" data-speak="كل سؤال تحلّه يزيل خيمة ويبني بيتًا، وكل سؤال تحلّه من المحاولة الأولى يسقط حبة زيتون على الكوفية." aria-label="استمع">🔊</button></div>
      <div class="village-panel bare">${scene().html}</div>
      <div class="tally"><span>🏠 بيوت <b>${ar(c.houses)} / ${ar(SLOTS)}</b></span><span>${OLIVE} زيتون على الكوفية <b>${ar(c.olives)} / ${ar(SLOTS)}</b></span></div>
      <ul class="vkey"><li>${OLIVE} + 🏠 حلّ صحيح من المحاولة الأولى</li><li>🏠 حلّ صحيح بعد محاولة أو تلميح</li><li>⛺ تبقى الخيمة ويُعرض الحلّ للمراجعة</li></ul>
      ${done ? `<p class="vmsg ${c.houses === SLOTS ? 'olive' : 'house'}">${c.houses === SLOTS ? '🇵🇸 اكتملت البيوت العشرة وارتفع العلم فوق قرية لولو!' : `انتهت الأسئلة: ${ar(c.houses)} بيوت و${ar(c.olives)} حبات زيتون.`}</p>` : ''}
    </section>`;
  }
  function mountAside(p) {
    const el = document.getElementById('play-aside'); if (!el) return;
    el.hidden = false; el.classList.add('wide'); el.innerHTML = asideHTML(p); mount(el, p);
  }
  /** لحظة الإجابة: الخيمة تتحول أمام الطالب */
  function update(p, rec) {
    if (!rec) return;
    const el = document.getElementById('play-aside'); if (!el) return;
    el.innerHTML = asideHTML(p);
    mount(el, p, rec.before);
    el.querySelector('.pa-village').classList.add('pa-flash');
    if (rec.result !== 'tent') PR.sfx.play(rec.result === 'olive' ? 'badge' : 'correct');
    if (counts(p).houses === SLOTS && rec.result !== 'tent') setTimeout(() => { PR.fx.confetti(40); PR.toast('🇵🇸 اكتملت البيوت العشرة… وارتفع العلم فوق قرية لولو!', 'reward'); }, 900);
  }

  PR.village = { SLOTS, start, record, counts, list, panel, mountPanel, mount, mountAside, update, resultOf, stakes, consequence };
})(typeof self !== 'undefined' ? self : this);
