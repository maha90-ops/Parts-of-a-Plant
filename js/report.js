/* report.js — التقرير النهائي الذكي + الشهادة */
(function () {
  'use strict';
  const PR = window.PR;
  const D = PR.data, E = PR.engine;
  const { $, esc, ar, pct } = PR.util;

  function getStudent() {
    const id = new URLSearchParams(location.search).get('id');
    if (id) { const s = PR.progress.get(id); if (s) return s; }
    return PR.progress.require({ diagnostic: true });
  }

  function buildReport(p) {
    const overall = E.overallMastery(p);
    const mastered = D.SKILL_ORDER.filter((s) => p.skillMastery[s] >= 75);
    const support = D.SKILL_ORDER.filter((s) => p.skillMastery[s] < 60).sort((a, b) => p.skillMastery[a] - p.skillMastery[b]);
    const learning = p.responses.filter((r) => r.source !== 'diagnostic');
    const attempts = learning.reduce((s, r) => s + (r.attempts || 1), 0);
    const recs = E.recommendations(p);
    const nm = (s) => D.SKILLS[s].name;
    let rec = mastered.length ? `أظهرت الرحلة إتقانًا جيدًا في ${E.joinAr(mastered.slice(0, 3).map(nm))}` : 'أظهرت الرحلة تقدّمًا تدريجيًا في المهارات';
    rec += support.length ? `، مع الحاجة إلى مزيد من التدريب في ${E.joinAr(support.slice(0, 2).map(nm))}. يُوصى بإكمال: «${recs[0].title}».` : '. يُوصى بأنشطة إثرائية في حل المشكلات والتجارب المفتوحة.';
    const pathsUsed = [...new Set(p.pathHistory.map((h) => h.path))].map((k) => D.PATHS[k].name);
    return { overall, mastered, support, attempts, rec, pathsUsed, recs, activities: p.activitiesCompleted.length };
  }

  PR.pages.report = function () {
    const p = getStudent(); if (!p) return;
    const R = buildReport(p);
    const pre = p.diagnosticResults.adjusted, post = p.postTest ? p.postTest.adjusted : null;
    const mc = {}; p.mistakes.forEach((m) => { const k = m.errorType || 'misconception'; mc[k] = (mc[k] || 0) + 1; });
    $('#rep-root').innerHTML = `<article class="card report tatreez-frame">
      <header class="rep-head"><div><p class="eyebrow">🌱 تقرير رحلة التعلم</p><h1 class="h-md">${esc(p.name)}</h1><p class="muted">${esc(p.grade || '')} · ${new Date().toLocaleDateString('ar-EG', { dateStyle: 'long' })}</p></div>
        <div class="kpi kpi-main"><b>${pct(R.overall)}</b><span>مستوى الإتقان العام</span></div></header>
      <dl class="rep-dl">
        <div><dt>اسم الطالب</dt><dd>${esc(p.name)}</dd></div>
        <div><dt>مستوى الإتقان العام</dt><dd>${pct(R.overall)} — ${E.masteryLabel(R.overall)}</dd></div>
        <div><dt>المهارات المتقنة</dt><dd>${R.mastered.length ? R.mastered.map((s) => `<span class="chip">▲ ${D.SKILLS[s].name}</span>`).join(' ') : '—'}</dd></div>
        <div><dt>المهارات التي تحتاج إلى دعم</dt><dd>${R.support.length ? R.support.map((s) => `<span class="chip">▼ ${D.SKILLS[s].name}</span>`).join(' ') : 'لا يوجد 🎉'}</dd></div>
        <div><dt>عدد المحاولات</dt><dd>${ar(R.attempts)}</dd></div>
        <div><dt>عدد التلميحات</dt><dd>${ar(p.hintsUsed)}</dd></div>
        <div><dt>عدد الأنشطة المكتملة</dt><dd>${ar(R.activities)}</dd></div>
        <div><dt>المسار الذي اتبعه الطالب</dt><dd>${p.pathHistory.map((h) => D.PATHS[h.path].icon + ' ' + D.PATHS[h.path].name).join(' ← ')}</dd></div>
        <div><dt>قبل الرحلة / بعدها</dt><dd>${pct(pre)} ← ${post != null ? pct(post) : 'لم يُكمل التقييم النهائي بعد'}${post != null ? ` (مكسب ${post - pre >= 0 ? '+' : '−'}${ar(Math.abs(post - pre))})` : ''}</dd></div>
        <div><dt>قرية لولو (الخيمة والزيتون)</dt><dd>🏠 ${ar(PR.village.counts(p).houses)} / ١٠ بيوت · 🫒 ${ar(PR.village.counts(p).olives)} حبات زيتون</dd></div>
        <div><dt>بازل قبة الصخرة</dt><dd>🧩 ${ar(PR.puzzle.pieces(p))} / ${ar(PR.puzzle.TOTAL)} قطعة</dd></div>
        <div><dt>المناطق المكتملة</dt><dd>${D.ZONES.map((z) => `${z.icon} ${p.zones[z.id].status === 'done' ? '✓' : '—'}`).join('  ')}</dd></div>
      </dl>
      <section class="rep-rec"><h2 class="h-sm">🎯 التوصية التعليمية التالية</h2><p>${esc(R.rec)}</p>${PR.ui.speakBtn(R.rec)}</section>
      <div class="grid-2">
        <section><h2 class="h-sm">📊 المهارات</h2>${D.SKILL_ORDER.map((s) => PR.ui.masteryBar(D.SKILLS[s].name, p.skillMastery[s], { icon: D.SKILLS[s].icon })).join('')}</section>
        <section><h2 class="h-sm">❌ تحليل الأخطاء</h2><table class="tbl"><thead><tr><th>نوع الخطأ</th><th>العدد</th></tr></thead><tbody>${Object.entries(mc).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<tr><td>${(D.ERROR_TYPES[k] || { label: k }).label}</td><td>${ar(n)}</td></tr>`).join('') || '<tr><td colspan="2">لا أخطاء</td></tr>'}</tbody></table>
          <h2 class="h-sm mt">🧭 تاريخ المسار</h2><ul class="reasons">${p.pathHistory.map((h) => `<li><b>${D.PATHS[h.path].name}</b> — ${h.source === 'diagnostic' ? 'بعد التشخيص' : 'إعادة تقييم'}${h.reasons && h.reasons.length ? `: ${esc(h.reasons.join(' '))}` : ''}</li>`).join('')}</ul></section>
      </div>
      <div class="row-end no-print"><button class="btn" onclick="window.print()">🖨️ طباعة / PDF</button>${p.zones.rescue.status === 'done' ? '<a class="btn btn-red" href="certificate.html">🏆 الشهادة</a>' : '<a class="btn btn-primary" href="map.html">🗺️ تابع الرحلة</a>'}</div>
    </article>`;
    PR.nabti.say(R.rec, 'happy');
  };

  PR.pages.certificate = function () {
    const p = getStudent(); if (!p) return;
    const root = $('#cert-root');
    if (p.zones.rescue.status !== 'done') {
      const left = D.ZONES.filter((z) => p.zones[z.id].status !== 'done');
      root.innerHTML = `<div class="card center"><div class="badge-medal locked big">🏆</div><h1 class="h-md">الشهادة بانتظارك!</h1><p>أكمل المناطق المتبقية لتحصل على شهادة «العالم النباتي الصغير»:</p>
        <ul class="zp-list">${left.map((z) => `<li><span>${z.icon}</span> ${z.title}</li>`).join('')}</ul><a class="btn btn-primary" href="map.html">🗺️ تابع الرحلة</a></div>`;
      PR.nabti.say(`بقيت ${left.length} مناطق للحصول على الشهادة. أنت قادر!`, 'happy');
      return;
    }
    const c = p.certificate || { issuedAt: new Date().toISOString(), mastery: E.overallMastery(p), level: E.levelFor(p.points).name };
    root.innerHTML = `<article class="certificate" aria-label="شهادة العالم النباتي الصغير">
      <div class="cert-in">
        <div class="cert-corner tl" aria-hidden="true">🌺</div><div class="cert-corner tr" aria-hidden="true">🫒</div>
        <p class="cert-eyebrow">مَهَمَّةُ إِنْقَاذِ النَّبْتَة</p>
        <div class="cert-medal" aria-hidden="true">🏆</div>
        <h1>شهادة «العالم النباتي الصغير»</h1>
        <p class="cert-to">تُمنح هذه الشهادة إلى</p>
        <p class="cert-name">${esc(p.name)}</p>
        <p class="cert-text">لقد نجحت في اكتشاف وظائف أجزاء النبات وساعدت لولو على استعادة عافيتها.</p>
        <div class="cert-meta">
          <div><span>التاريخ</span><b>${new Date(c.issuedAt).toLocaleDateString('ar-EG', { dateStyle: 'long' })}</b></div>
          <div><span>نسبة الإتقان</span><b>${pct(c.mastery)}</b></div>
          <div><span>مستوى الطالب</span><b>${esc(c.level)}</b></div>
        </div>
        <div class="cert-badges">${p.badges.map((b) => `<span title="${D.BADGES[b].name}">${D.BADGES[b].icon}</span>`).join('')}</div>
        <div class="cert-sign"><div>${PR.art.nabti('cheer')}<small>نَبْتي — المساعد الذكي</small></div><div class="cert-lulu">${PR.art.plant({ mode: 'pot', health: 100, water: 2 })}<small>لولو 🌺</small></div></div>
      </div></article>
      <div class="row-end no-print"><a class="btn" href="report.html">📄 التقرير</a><button class="btn btn-primary" onclick="window.print()">🖨️ طباعة الشهادة</button></div>`;
    PR.fx.confetti(40); PR.sfx.play('badge');
    PR.nabti.say(`مبارك يا ${p.name}! أنت العالم النباتي الصغير ومنقذ لولو.`, 'cheer');
  };
})();
