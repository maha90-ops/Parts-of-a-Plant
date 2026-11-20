/* =========================================================================
   teacher-dashboard.js — لوحة المعلم
   تجمع بيانات الطلاب الحقيقيين (من هذا الجهاز) + صفًّا تجريبيًا اختياريًا للعرض.
   ========================================================================= */
(function () {
  'use strict';
  const PR = window.PR;
  const D = PR.data, E = PR.engine;
  const { $, $$, esc, ar, pct } = PR.util;

  /* ---------- مولّد صف تجريبي حتمي (للعرض والتقييم) ---------- */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function makeDemo(d, i) {
    const R = rng(1000 + i * 77);
    const p = PR.newProfile(d.name, 'الرابع الأساسي');
    p.studentId = 'demo_' + i; p.demo = true;
    const T = d.target;
    const off = { identify: 12, name: 9, function: -4, match: -13, explain: -6, infer: -3, apply: 2, solve: 0 };
    D.SKILL_ORDER.forEach((s) => { p.skillMastery[s] = Math.max(5, Math.min(100, Math.round(T + off[s] + (R() * 10 - 5)))); });
    D.MAIN_PARTS.forEach((pt, k) => { p.partMastery[pt] = Math.max(5, Math.min(100, Math.round(T + [-10, 2, 4, 6][k] + (R() * 10 - 5)))); });
    const diagAdj = Math.max(10, Math.round(T - 8 + R() * 6));
    p.diagnosticResults = { completedAt: new Date(Date.now() - 864e5 * (3 + i)).toISOString(), adjusted: diagAdj, raw: Math.min(100, diagAdj + 8), skillScores: Object.assign({}, p.skillMastery), answers: [], metrics: { hints: Math.round((100 - T) / 15) } };
    const path = T >= 80 ? 'challenge' : T >= 60 ? 'practice' : 'remediation';
    p.currentPath = path; p.pathHistory = [{ at: p.diagnosticResults.completedAt, path, source: 'diagnostic', reasons: [] }];
    const doneN = Math.min(6, Math.round(T / 18) + (R() > .5 ? 1 : 0));
    D.ZONES.forEach((z, k) => { p.zones[z.id] = { status: k < doneN ? 'done' : k === doneN ? 'open' : 'locked', stars: k < doneN ? Math.max(1, Math.min(3, Math.round(T / 33))) : 0, attempts: k < doneN ? 1 : 0, completedAt: null }; });
    p.badges = ['explorer'].concat(D.ZONES.slice(0, doneN).map((z) => z.badge));
    p.hintsUsed = Math.round((100 - T) / 6 + R() * 4);
    p.points = Math.round(T * 6 + R() * 120); p.seeds = Math.round(T / 6); p.drops = doneN * 5 + 3; p.stars = doneN * 2;
    const nM = Math.round((100 - T) / 7 + R() * 3);
    const pool = [
      { part: 'root', chosenPart: 'leaf', errorType: 'function-confusion', skill: 'match' }, { part: 'root', chosenPart: 'stem', errorType: 'function-confusion', skill: 'match', expectedPart: 'stem' },
      { part: 'stem', chosenPart: 'root', errorType: 'part-confusion', skill: 'match' }, { part: 'leaf', chosenPart: null, errorType: 'misconception', skill: 'explain' },
      { part: 'flower', chosenPart: 'leaf', errorType: 'function-confusion', skill: 'function' }, { part: 'root', chosenPart: null, errorType: 'overgeneralization', skill: 'infer' },
    ];
    for (let k = 0; k < nM; k++) { const m = pool[Math.floor(R() * R() * pool.length)]; p.mistakes.push(Object.assign({ at: new Date().toISOString(), qid: 'demo' }, m)); }
    p.responses = Array.from({ length: 10 + doneN * 6 }, () => ({}));
    p.activitiesCompleted = D.ZONES.slice(0, doneN).map((z) => ({ id: z.id }));
    if (doneN >= 6) p.postTest = { adjusted: Math.min(100, T + 6) };
    p.responses = p.responses.map(() => ({ correct: R() < T / 100 + 0.1 }));
    p.puzzles = {}; PR.puzzle.KEYS.slice(0, Math.min(5, doneN)).forEach((k) => { const total = PR.puzzle.totalFor(k, path); const got = Math.min(total, Math.round(total * (T / 100 + 0.15 + R() * 0.1))); p.puzzles[k] = { total, got, best: got, bestTotal: total }; });
    if (doneN >= 6) p.rescueVillage = { results: Array.from({ length: 10 }, () => { const x = R(); return x < T / 100 - 0.25 ? 'olive' : x < T / 100 + 0.1 ? 'house' : 'tent'; }) };
    p.progress = PR.progress.computeProgress(p);
    p.decisions = [{ at: new Date().toISOString(), type: 'path', text: `تحدد المسار: «${D.PATHS[path].name}» (بيانات تجريبية)` }];
    p.updatedAt = new Date(Date.now() - 36e5 * i).toISOString();
    return p;
  }

  function mistakeLabel(m) {
    const P = (k) => (D.PARTS[k] ? D.PARTS[k].name : '');
    if (m.expectedPart && m.chosenPart) return `ربط ${P(m.chosenPart)} بوظيفة ${P(m.expectedPart)}`;
    if (m.chosenPart && m.part && m.chosenPart !== m.part) return `الخلط بين ${P(m.part)} و${P(m.chosenPart)}`;
    const et = D.ERROR_TYPES[m.errorType];
    return `${et ? et.label : 'خطأ'}${m.part ? ' — ' + P(m.part) : ''}`;
  }

  PR.pages.teacher = function () {
    const KEY = 'plantRescue.teacher.demo';
    let showDemo = true;
    try { showDemo = localStorage.getItem(KEY) !== '0'; } catch (e) { /* */ }
    let filter = 'all', query = '';

    function students() {
      const real = PR.progress.all().filter((s) => s.diagnosticResults);
      return real.concat(showDemo ? D.DEMO_CLASS.map(makeDemo) : []);
    }

    function render() {
      const S = students();
      const root = $('#t-root');
      if (!S.length) {
        root.innerHTML = `<div class="card center"><h2>لا توجد بيانات طلاب بعد</h2><p class="muted">عندما يُكمل الطلاب مهمة اكتشاف المستوى على هذا الجهاز ستظهر بياناتهم هنا.</p><div class="row-end" style="justify-content:center"><button class="btn" id="demo-on">📋 اعرض صفًّا تجريبيًا</button><a class="btn btn-primary" href="student.html">➕ تسجيل طالب</a></div></div>`;
        $('#demo-on').onclick = () => { showDemo = true; try { localStorage.setItem(KEY, '1'); } catch (e) { /* */ } render(); };
        return;
      }
      const M = S.map((s) => ({ s, m: E.overallMastery(s) }));
      const avgAll = Math.round(M.reduce((a, x) => a + x.m, 0) / M.length);
      const skillAvg = D.SKILL_ORDER.map((k) => ({ k, v: Math.round(S.reduce((a, s) => a + (s.skillMastery[k] || 0), 0) / S.length) }));
      const weakest = skillAvg.slice().sort((a, b) => a.v - b.v)[0];
      const paths = { challenge: 0, practice: 0, remediation: 0 };
      S.forEach((s) => { paths[s.currentPath] = (paths[s.currentPath] || 0) + 1; });
      const need = M.filter((x) => x.m < 60).sort((a, b) => a.m - b.m);
      const adv = M.filter((x) => x.m >= 80).sort((a, b) => b.m - a.m);
      const mc = {};
      S.forEach((s) => s.mistakes.forEach((m) => { const l = mistakeLabel(m); mc[l] = (mc[l] || 0) + 1; }));
      const topM = Object.entries(mc).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const maxM = topM.length ? topM[0][1] : 1;
      const done = S.filter((s) => s.zones.rescue.status === 'done').length;
      const avgHints = Math.round(S.reduce((a, s) => a + s.hintsUsed, 0) / S.length * 10) / 10;
      const realN = S.filter((s) => !s.demo).length;

      const list = M.filter((x) => (filter === 'all' || x.s.currentPath === filter) && (!query || x.s.name.includes(query))).sort((a, b) => a.m - b.m);

      root.innerHTML = `
        <div class="row t-tools"><label class="row"><input type="checkbox" class="switch" id="demo-t" ${showDemo ? 'checked' : ''}> <span>إظهار الصف التجريبي (${ar(D.DEMO_CLASS.length)} طلاب)</span></label><span class="grow"></span>
          <span class="chip">👤 طلاب حقيقيون على هذا الجهاز: ${ar(realN)}</span><button class="btn sm" id="csv">⬇️ تصدير CSV</button><button class="btn sm" id="json">⬇️ تصدير JSON</button></div>
        <div class="grid-4 kpi-row">
          <div class="card kpi-card"><span>👥 عدد الطلاب</span><b>${ar(S.length)}</b></div>
          <div class="card kpi-card"><span>📈 متوسط الإتقان</span><b>${pct(avgAll)}</b></div>
          <div class="card kpi-card"><span>🏆 أكملوا الرحلة</span><b>${ar(done)}</b><small class="muted">${pct(done / S.length * 100)}</small></div>
          <div class="card kpi-card"><span>💡 متوسط التلميحات</span><b>${ar(avgHints)}</b></div>
        </div>
        <div class="t-grid">
          <section class="card"><h2 class="h-sm">📊 متوسط إتقان الصف لكل مهارة</h2>
            <div class="alert-weak">⚠️ المهارة الأكثر ضعفًا لدى الصف: <b>«${D.SKILLS[weakest.k].name}» — ${pct(weakest.v)}</b></div>
            ${skillAvg.map((x) => `<div class="hbar ${x.k === weakest.k ? 'is-weak' : ''}" title="${D.SKILLS[x.k].name}: ${x.v}٪"><span class="hb-l">${D.SKILLS[x.k].icon} ${D.SKILLS[x.k].short}</span><span class="hb-track"><span class="hb-fill" style="width:${x.v}%"></span></span><span class="hb-v">${pct(x.v)}</span></div>`).join('')}
            <details class="mt"><summary>عرض كجدول</summary><table class="tbl"><thead><tr><th>المهارة</th><th>المتوسط</th></tr></thead><tbody>${skillAvg.map((x) => `<tr><td>${D.SKILLS[x.k].name}</td><td>${pct(x.v)}</td></tr>`).join('')}</tbody></table></details>
          </section>
          <section class="stack">
            <div class="card"><h2 class="h-sm">🧭 مستويات الطلاب (المسارات)</h2><div class="path-tiles">${['challenge', 'practice', 'remediation'].map((k) => `<div class="pt path-${k}"><b>${ar(paths[k] || 0)}</b><span>${D.PATHS[k].icon} ${D.PATHS[k].name}</span></div>`).join('')}</div></div>
            <div class="card"><h2 class="h-sm">❌ أكثر الأخطاء شيوعًا</h2>${topM.length ? topM.map(([l, n]) => `<div class="hbar" title="${esc(l)}: ${n}"><span class="hb-l wide">${esc(l)}</span><span class="hb-track"><span class="hb-fill red" style="width:${n / maxM * 100}%"></span></span><span class="hb-v">${ar(n)}</span></div>`).join('') : '<p class="muted">لا أخطاء مسجّلة.</p>'}</div>
          </section>
        </div>
        <div class="grid-2">
          <section class="card"><h2 class="h-sm">🔵 الطلاب الذين يحتاجون تدخلًا علاجيًا</h2>${need.length ? `<ul class="slist">${need.map((x) => `<li><button class="link-btn" data-id="${x.s.studentId}">${esc(x.s.name)}</button><span class="pill-bad">▼ ${pct(x.m)}</span><small class="muted">أضعف مهارة: ${D.SKILLS[E.weakestSkills(x.s, 1)[0].s].short}</small></li>`).join('')}</ul>` : '<p class="muted">لا يوجد.</p>'}</section>
          <section class="card"><h2 class="h-sm">🟢 الطلاب المتقدمون</h2>${adv.length ? `<ul class="slist">${adv.map((x) => `<li><button class="link-btn" data-id="${x.s.studentId}">${esc(x.s.name)}</button><span class="pill-ok">▲ ${pct(x.m)}</span><small class="muted">مقترح: نشاط إثرائي</small></li>`).join('')}</ul>` : '<p class="muted">لا يوجد.</p>'}</section>
        </div>
        <section class="card"><div class="row"><h2 class="h-sm">📋 تقدّم كل طالب</h2><span class="grow"></span>
          <input class="input sm-input" id="q" placeholder="🔎 ابحث بالاسم" value="${esc(query)}" aria-label="ابحث بالاسم">
          <select class="input sm-input" id="f" aria-label="تصفية حسب المسار"><option value="all">كل المسارات</option>${Object.keys(D.PATHS).map((k) => `<option value="${k}" ${filter === k ? 'selected' : ''}>${D.PATHS[k].name}</option>`).join('')}</select></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>الطالب</th><th>المسار</th><th>الإتقان</th><th>الربط</th><th>المناطق</th><th>التلميحات</th><th>الأخطاء</th><th>🧩 لوحات · 🏠 / <i class="olive-ic" aria-hidden="true"></i></th><th></th></tr></thead><tbody>
          ${list.map((x) => `<tr><td><b>${esc(x.s.name)}</b>${x.s.demo ? ' <small class="muted">(تجريبي)</small>' : ''}</td><td>${PR.ui.pathBadge(x.s.currentPath)}</td><td><span class="${x.m >= 80 ? 'pill-ok' : x.m < 60 ? 'pill-bad' : ''}">${pct(x.m)}</span></td><td>${pct(x.s.skillMastery.match || 0)}</td><td>${ar(D.ZONES.filter((z) => x.s.zones[z.id].status === 'done').length)}/${ar(6)}</td><td>${ar(x.s.hintsUsed)}</td><td>${ar(x.s.mistakes.length)}</td><td>${ar(PR.puzzle.completed(x.s).length)}/٥ · ${ar(PR.village.counts(x.s).houses)} / ${ar(PR.village.counts(x.s).olives)}</td><td><button class="btn sm" data-id="${x.s.studentId}">فتح الملف</button></td></tr>`).join('')}
          </tbody></table></div>
          ${realN ? '<div class="row-end"><button class="btn sm btn-ghost" id="wipe">🗑️ حذف بيانات الطلاب الحقيقيين من هذا الجهاز</button></div>' : ''}
        </section>`;

      const byId = Object.fromEntries(S.map((s) => [s.studentId, s]));
      $$('[data-id]', root).forEach((b) => b.onclick = () => openStudent(byId[b.dataset.id]));
      $('#demo-t').onchange = (e) => { showDemo = e.target.checked; try { localStorage.setItem(KEY, showDemo ? '1' : '0'); } catch (er) { /* */ } render(); };
      $('#f').onchange = (e) => { filter = e.target.value; render(); };
      $('#q').oninput = (e) => { query = e.target.value.trim(); clearTimeout(render._t); render._t = setTimeout(() => { render(); const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 300); };
      $('#csv').onclick = () => download('plant-rescue-class.csv', toCSV(S), 'text/csv');
      $('#json').onclick = () => download('plant-rescue-data.json', JSON.stringify(S, null, 2), 'application/json');
      const w = $('#wipe'); if (w) w.onclick = async () => { const ok = await PR.modal('<h2>تأكيد الحذف</h2><p>سيتم حذف جميع بيانات الطلاب الحقيقيين المحفوظة على هذا الجهاز. لا يمكن التراجع.</p><div class="row-end"><button class="btn" data-close="no">إلغاء</button><button class="btn btn-red" data-close="yes">حذف</button></div>'); if (ok === 'yes') { PR.progress.clearAll(); PR.ui.refreshStats(); render(); } };
    }

    function openStudent(s) {
      const m = E.overallMastery(s);
      const mc = {}; s.mistakes.forEach((x) => { const l = mistakeLabel(x); mc[l] = (mc[l] || 0) + 1; });
      const recs = E.recommendations(s);
      PR.modal(`<div class="row"><div class="avatar-lg">🔬</div><div><h2 class="h-sm">${esc(s.name)}</h2>${PR.ui.pathBadge(s.currentPath)} ${s.demo ? '<small class="muted">(طالب تجريبي)</small>' : ''}</div><span class="grow"></span><div class="kpi kpi-main"><b>${pct(m)}</b><span>الإتقان العام</span></div></div>
        <div class="grid-2 mt"><div><h3>📊 المهارات</h3>${D.SKILL_ORDER.map((k) => PR.ui.masteryBar(D.SKILLS[k].name, s.skillMastery[k], { icon: D.SKILLS[k].icon })).join('')}</div>
        <div><h3>🌿 الأجزاء</h3><div class="parts-row">${D.MAIN_PARTS.map((pt) => `<div class="part-tile ${s.partMastery[pt] >= 80 ? 'hi' : s.partMastery[pt] >= 60 ? 'mid' : 'lo'}"><span>${D.PARTS[pt].icon}</span><b>${pct(s.partMastery[pt])}</b><small>${D.PARTS[pt].name}</small></div>`).join('')}</div>
          <h3 class="mt">❌ الأخطاء</h3><ul class="reasons">${Object.entries(mc).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, n]) => `<li>${esc(l)} (${ar(n)})</li>`).join('') || '<li>لا أخطاء.</li>'}</ul>
          <h3>🎯 التوصية</h3><p>${esc(recs[0].text)}</p>
          <p class="muted small">التشخيص: ${pct(s.diagnosticResults.adjusted)}${s.postTest ? ` · التقييم النهائي: ${pct(s.postTest.adjusted)}` : ''} · التلميحات: ${ar(s.hintsUsed)} · المناطق: ${ar(D.ZONES.filter((z) => s.zones[z.id].status === 'done').length)}/٦</p></div></div>
        <h3>🤖 آخر قرارات التكيف</h3><ul class="decisions">${s.decisions.slice(-6).reverse().map((d) => `<li>${esc(d.text)}</li>`).join('')}</ul>
        <div class="row-end">${s.demo ? '' : `<a class="btn" href="report.html?id=${s.studentId}">📄 التقرير الكامل</a>`}<button class="btn btn-primary" data-close="ok">إغلاق</button></div>`, { cls: 'wide', label: 'ملف الطالب' });
    }

    function toCSV(S) {
      const head = ['الاسم', 'المسار', 'الإتقان العام'].concat(D.SKILL_ORDER.map((k) => D.SKILLS[k].name), ['المناطق المكتملة', 'التلميحات', 'الأخطاء', 'النقاط', 'تجريبي']);
      const rows = S.map((s) => [s.name, D.PATHS[s.currentPath].name, E.overallMastery(s)].concat(D.SKILL_ORDER.map((k) => s.skillMastery[k]), [D.ZONES.filter((z) => s.zones[z.id].status === 'done').length, s.hintsUsed, s.mistakes.length, s.points, s.demo ? 'نعم' : 'لا']));
      return '﻿' + [head].concat(rows).map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    }
    function download(name, text, type) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    render();
    PR.nabti.say('مرحبًا بك في لوحة المعلم. ابدأ بالطلاب الذين يحتاجون تدخلًا علاجيًا.', 'happy');
  };
  PR.teacher = { makeDemo, mistakeLabel };
})();
