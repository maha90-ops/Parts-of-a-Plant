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
        <div><dt>تحدّي الخيمة والزيتون (مركز الإنقاذ)</dt><dd>🏠 ${ar(PR.village.counts(p).houses)} / ١٠ بيوت · <i class="olive-ic" aria-hidden="true"></i> ${ar(PR.village.counts(p).olives)} حبات زيتون</dd></div>
        <div><dt>تحدّي البازل (المحطات الخمس)</dt><dd>🕌 ${ar(PR.puzzle.completed(p).length)} / ٥ لوحات مكتملة — ${PR.puzzle.KEYS.map((k) => { const s = PR.puzzle.state(p, k); return `${PR.puzzle.STATIONS[k].i} ${s ? ar(s.got) + '/' + ar(s.total) : '—'}`; }).join(' · ')}</dd></div>
        <div><dt>المناطق المكتملة</dt><dd>${D.ZONES.map((z) => `${z.icon} ${p.zones[z.id].status === 'done' ? '✓' : '—'}`).join('  ')}</dd></div>
      </dl>
      <section class="rep-rec"><h2 class="h-sm">🎯 التوصية التعليمية التالية</h2><p>${esc(R.rec)}</p>${PR.ui.speakBtn(R.rec)}</section>
      <div class="grid-2">
        <section><h2 class="h-sm">📊 المهارات</h2>${D.SKILL_ORDER.map((s) => PR.ui.masteryBar(D.SKILLS[s].name, p.skillMastery[s], { icon: D.SKILLS[s].icon })).join('')}</section>
        <section><h2 class="h-sm">❌ تحليل الأخطاء</h2><table class="tbl"><thead><tr><th>نوع الخطأ</th><th>العدد</th></tr></thead><tbody>${Object.entries(mc).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<tr><td>${(D.ERROR_TYPES[k] || { label: k }).label}</td><td>${ar(n)}</td></tr>`).join('') || '<tr><td colspan="2">لا أخطاء</td></tr>'}</tbody></table>
          <h2 class="h-sm mt">🧭 تاريخ المسار</h2><ul class="reasons">${p.pathHistory.map((h) => `<li><b>${D.PATHS[h.path].name}</b> — ${h.source === 'diagnostic' ? 'بعد التشخيص' : 'إعادة تقييم'}${h.reasons && h.reasons.length ? `: ${esc(h.reasons.join(' '))}` : ''}</li>`).join('')}</ul></section>
      </div>
      <div class="row-end no-print"><button class="btn" onclick="window.print()">🖨️ طباعة / PDF</button>${p.zones.rescue.status === 'done' ? '<a class="btn btn-red" href="certificate.html">📄 عرض الشهادة</a>' : '<a class="btn btn-primary" href="map.html">🗺️ تابع الرحلة</a>'}</div>
    </article>`;
    PR.nabti.say(R.rec, 'happy');
  };

  /* ---------- تنزيل الشهادة PDF ----------
     تُلتقط الشهادة كما تظهر على الشاشة (html2canvas) وتوضع في صفحة A4 (jsPDF).
     المكتبتان مضمّنتان في assets/vendor وتُحمَّلان فقط عند الضغط على الزر. */
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[data-src="${src}"]`)) return res();
      const s = document.createElement('script'); s.src = src; s.dataset.src = src;
      s.onload = res; s.onerror = () => rej(new Error('تعذّر تحميل ' + src));
      document.head.appendChild(s);
    });
  }
  async function downloadPDF(p, btn) {
    const label = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '⏳ جارٍ تجهيز الشهادة…';
    const el = document.querySelector('.certificate');
    try {
      await loadScript('assets/vendor/html2canvas.min.js');
      await loadScript('assets/vendor/jspdf.umd.min.js');
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      el.classList.add('capturing');
      const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: '#fffdf6', useCORS: true, logging: false, windowWidth: 1100 });
      el.classList.remove('capturing');
      const { jsPDF } = window.jspdf;
      const landscape = canvas.width > canvas.height;
      const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 8;
      const ratio = Math.min((pw - 2 * m) / canvas.width, (ph - 2 * m) / canvas.height);
      const w = canvas.width * ratio, h = canvas.height * ratio;
      pdf.setFillColor(251, 246, 236); pdf.rect(0, 0, pw, ph, 'F');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
      pdf.setProperties({ title: `شهادة عالم النبات الصغير — ${p.name}`, subject: 'مهمة إنقاذ لولو', creator: 'مهمة إنقاذ لولو' });
      const safe = String(p.name).replace(/[\\/:*?"<>|]/g, '').trim() || 'طالب';
      // الحفظ بأنفسنا (رابط تنزيل باسم الملف) ليبقى اسم الطالب في اسم الملف على كل المتصفحات
      const url = URL.createObjectURL(pdf.output('blob'));
      const a = document.createElement('a');
      a.href = url; a.download = `شهادة-عالم-النبات-الصغير-${safe}.pdf`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
      PR.toast('✓ نُزّلت الشهادة على جهازك', 'reward');
      PR.progress.log(p, 'certificate', 'نزّل الطالب الشهادة بصيغة PDF'); PR.progress.save(p);
    } catch (err) {
      el.classList.remove('capturing');
      PR.reportError(err, 'certificate-pdf');
      PR.toast('تعذّر التنزيل المباشر، ستُفتح نافذة الطباعة: اختر «حفظ بتنسيق PDF».', 'bad');
      setTimeout(() => window.print(), 800);
    } finally {
      btn.disabled = false; btn.innerHTML = label;
    }
  }

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
    root.innerHTML = `<article class="certificate" aria-label="شهادة عالم النبات الصغير">
      <div class="cert-in">
        <div class="cert-corner tl" aria-hidden="true">🌺</div><div class="cert-corner tr" aria-hidden="true"><svg viewBox="0 0 64 64" width="52" height="52"><path d="M8 56C22 44 34 30 56 8" stroke="#6b4a2a" stroke-width="3" fill="none" stroke-linecap="round"/><g fill="#6f8f42"><ellipse cx="22" cy="40" rx="9" ry="3.6" transform="rotate(-50 22 40)"/><ellipse cx="34" cy="26" rx="9" ry="3.6" transform="rotate(-20 34 26)"/><ellipse cx="44" cy="20" rx="9" ry="3.6" transform="rotate(-70 44 20)"/><ellipse cx="28" cy="36" rx="8" ry="3.2" transform="rotate(10 28 36)"/></g><g fill="#2f4a12"><ellipse cx="40" cy="30" rx="4.2" ry="5.6" transform="rotate(-30 40 30)"/><ellipse cx="26" cy="46" rx="4.2" ry="5.6" transform="rotate(-30 26 46)"/></g></svg></div>
        <p class="cert-eyebrow">مَهَمَّةُ إِنْقَاذِ لُولُو</p>
        <div class="cert-medal" aria-hidden="true">🏆</div>
        <h1>شهادة عالم النبات الصغير</h1>
        <p class="cert-to">تشهد هذه الشهادة بأن</p>
        <p class="cert-name">${esc(p.name)}</p>
        <p class="cert-text">قد نجح في إتمام مهمة إنقاذ لولو، وتعرّف إلى أجزاء النبات ووظائفها، وأظهر مهارات في الملاحظة والاستقصاء وحل المشكلات.</p>
        <div class="cert-meta">
          <div><span>التاريخ</span><b>${new Date(c.issuedAt).toLocaleDateString('ar-EG', { dateStyle: 'long' })}</b></div>
          <div><span>نسبة الإتقان</span><b>${pct(c.mastery)}</b></div>
          <div><span>مستوى الطالب</span><b>${esc(c.level)}</b></div>
        </div>
        <div class="cert-badges">${p.badges.map((b) => `<span title="${D.BADGES[b].name}">${D.BADGES[b].icon}</span>`).join('')}</div>
        <div class="cert-sign"><div>${PR.art.nabti('cheer')}<small>نَبْتي — المساعد الذكي</small></div><div class="cert-lulu">${PR.lulu.img(100, 'excited')}<small>لولو 🌺</small></div></div>
      </div></article>
      <div class="row-end no-print"><a class="btn" href="report.html">📄 التقرير</a><button class="btn" onclick="window.print()">🖨️ طباعة الشهادة</button><button class="btn btn-red lg" id="cert-pdf">⬇️ تنزيل الشهادة (PDF)</button></div>`;
    $('#cert-pdf').onclick = (e) => downloadPDF(p, e.currentTarget);
    PR.fx.confetti(40); PR.sfx.play('badge');
    PR.nabti.say(`مبارك يا ${p.name}! أنت العالم النباتي الصغير ومنقذ لولو.`, 'cheer');
  };
})();
