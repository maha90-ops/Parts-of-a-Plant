/* dashboard.js — لوحة تقدّم الطالب */
(function () {
  'use strict';
  const PR = window.PR;
  const D = PR.data, E = PR.engine;

  PR.pages.dashboard = function () {
    const { $, esc, ar, pct } = PR.util;
    const p = PR.progress.require({ diagnostic: true });
    if (!p) return;
    const lv = E.levelFor(p.points);
    const overall = E.overallMastery(p);
    const recs = E.recommendations(p);
    p.recommendations = recs; PR.progress.save(p);
    const nz = PR.progress.nextZone(p);
    const doneZones = D.ZONES.filter((z) => p.zones[z.id].status === 'done');
    const group = [
      { t: 'التعرف على الأجزاء', v: avg(['identify', 'name']) },
      { t: 'وظائف الأجزاء', v: avg(['function', 'explain']) },
      { t: 'الربط بين الجزء والوظيفة', v: p.skillMastery.match },
      { t: 'حل المشكلات', v: avg(['infer', 'apply', 'solve']) },
    ];
    function avg(ks) { const v = ks.map((k) => p.skillMastery[k]).filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; }
    const top = recs[0];
    const recent = p.decisions.slice(-8).reverse();

    $('#dash-root').innerHTML = `
      <section class="dash-hero card">
        <div class="dh-id"><div class="avatar-lg">🔬</div><div><p class="eyebrow">عالم النبات الصغير</p><h1 class="h-md">${esc(p.name)}</h1><p class="muted">${esc(p.grade || '')}</p></div></div>
        <div class="dh-level"><span class="lv-ic" aria-hidden="true">${lv.icon}</span><div class="grow"><b>المستوى ${ar(lv.index)}: ${lv.name}</b><div class="health"><div class="health-fill" style="width:${Math.round(lv.progress * 100)}%"></div></div><small class="muted">${lv.next ? `${ar(lv.next.min - p.points)} نقطة حتى «${lv.next.name}»` : 'أعلى مستوى!'}</small></div></div>
        <div class="dh-stats">
          <div class="stat"><b>⭐ ${ar(p.points)}</b><span>النقاط</span></div><div class="stat"><b>🌱 ${ar(p.seeds)}</b><span>البذور</span></div>
          <div class="stat"><b>💧 ${ar(p.drops)}</b><span>قطرات الماء</span></div><div class="stat"><b>🌟 ${ar(p.stars)}</b><span>النجوم</span></div>
        </div>
      </section>
      <div class="dash-grid">
        <section class="card">
          <div class="row"><h2 class="h-sm">📊 مستوى المهارات</h2><span class="grow"></span><span class="chip">الإتقان العام ${pct(overall)}</span></div>
          ${group.map((g) => PR.ui.masteryBar(g.t, g.v)).join('')}
          <details><summary>عرض المهارات الثماني بالتفصيل</summary><div style="margin-top:10px">${D.SKILL_ORDER.map((s) => PR.ui.masteryBar(D.SKILLS[s].name, p.skillMastery[s], { icon: D.SKILLS[s].icon, delta: p.diagnosticResults.skillScores[s] != null ? (p.skillMastery[s] - p.diagnosticResults.skillScores[s]) : 0 })).join('')}
            <p class="muted small">↑↓ = التغيّر منذ مهمة اكتشاف المستوى.</p></div></details>
          <h3 class="mt">🌿 إتقان أجزاء النبات</h3>
          <div class="parts-row">${D.MAIN_PARTS.map((pt) => { const v = p.partMastery[pt]; return `<div class="part-tile ${v >= 80 ? 'hi' : v >= 60 ? 'mid' : 'lo'}" title="${D.PARTS[pt].name}: ${v}٪"><span aria-hidden="true">${D.PARTS[pt].icon}</span><b>${pct(v)}</b><small>${D.PARTS[pt].name} · ${E.masteryLabel(v)}</small></div>`; }).join('')}</div>
        </section>
        <section class="stack">
          <div class="card rec-card">
            <p class="eyebrow">🎯 التدريب المقترح لك</p>
            <p class="rec-t">${esc(top.text)}</p>
            <a class="btn btn-primary" href="${top.href}">🌱 ابدأ التدريب</a>
            ${recs.length > 1 ? `<ul class="rec-more">${recs.slice(1, 4).map((r) => `<li><a href="${r.href}">${esc(r.title)}</a></li>`).join('')}</ul>` : ''}
          </div>
          <div class="card"><p class="eyebrow">🗺️ المهمة التالية</p>${nz ? `<h3>${nz.icon} ${nz.title}</h3><a class="btn" href="${nz.href}">تابع ←</a>` : '<h3>🏆 أكملت جميع المناطق!</h3><a class="btn" href="certificate.html">شهادتي</a>'}
            <p class="muted small mt">المناطق المكتملة: ${ar(doneZones.length)} من ${ar(D.ZONES.length)}</p>
            <div class="zones-mini">${D.ZONES.map((z) => `<span class="zm ${p.zones[z.id].status}" title="${z.title}">${z.icon}<small>${p.zones[z.id].status === 'done' ? '✓' : p.zones[z.id].status === 'open' ? '▶' : '🔒'}</small></span>`).join('')}</div></div>
          <div class="card"><p class="eyebrow">🧭 مسارك</p>${PR.ui.pathBadge(p.currentPath)}<p class="muted small mt">${esc(D.PATHS[p.currentPath].desc)}</p>
            <ol class="timeline">${p.pathHistory.map((h) => `<li>${D.PATHS[h.path].icon} ${D.PATHS[h.path].name} <small class="muted">${h.source === 'diagnostic' ? 'بعد التشخيص' : 'بعد إعادة التقييم'}</small></li>`).join('')}</ol></div>
        </section>
      </div>
      <div class="fun-row"><section class="card fun-card" id="d-village"></section><section class="card fun-card" id="d-puzzle"></section></div>
      <section class="card">
        <h2 class="h-sm">🏅 الشارات</h2>
        <div class="badges">${Object.entries(D.BADGES).map(([id, b]) => { const has = p.badges.includes(id); return `<div class="badge ${has ? '' : 'is-locked'}"><div class="badge-medal ${has ? '' : 'locked'}">${b.icon}</div><b>${b.name}</b><small class="muted">${has ? b.desc : '🔒 لم تُفتح بعد'}</small></div>`; }).join('')}</div>
      </section>
      <section class="card">
        <h2 class="h-sm">🤖 لماذا اتخذ نَبْتي هذه القرارات؟</h2>
        <p class="muted small">سجلّ شفاف لقرارات محرك التكيف (آخر ٨ قرارات).</p>
        <ul class="decisions">${recent.map((d) => `<li><small class="muted">${new Date(d.at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</small> ${esc(d.text)}</li>`).join('') || '<li>لا توجد قرارات بعد.</li>'}</ul>
        <div class="row"><span class="chip">💡 التلميحات: ${ar(p.hintsUsed)}</span><span class="chip">✗ الأخطاء المسجّلة: ${ar(p.mistakes.length)}</span><span class="chip">📝 الاستجابات: ${ar(p.responses.length)}</span></div>
      </section>`;
    $('#d-village').innerHTML = PR.village.panel(p);
    PR.village.mount($('#d-village'), p);
    $('#d-puzzle').innerHTML = PR.puzzle.panel(p);
    PR.nabti.say(`${top.text} اضغط «ابدأ التدريب».`, 'happy');
  };
})();
