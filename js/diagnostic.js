/* =========================================================================
   diagnostic.js — الاختبار التشخيصي (٨ مهارات) + تحليل المستوى + الملف الذكي
   ========================================================================= */
(function () {
  'use strict';
  const PR = window.PR;
  const D = PR.data, E = PR.engine;

  PR.pages.diagnostic = async function () {
    const { $, esc, ar, pct, wait } = PR.util;
    const p = PR.progress.require();
    if (!p) return;
    const rootEl = $('#diag-root');
    const bar = $('#diag-bar');

    if (p.diagnosticResults && new URLSearchParams(location.search).get('retake') !== '1') {
      bar.style.width = '100%';
      return showProfile(p, false);
    }

    PR.nabti.say(`لنبدأ يا ${p.name}! اقرأ كل سؤال بهدوء. يمكنك طلب تلميح، ولديك محاولتان.`, 'happy');
    const answers = [];
    const qs = D.DIAGNOSTIC;
    for (let i = 0; i < qs.length; i++) {
      bar.style.width = `${(i / qs.length) * 100}%`;
      $('#diag-step').textContent = `السؤال ${ar(i + 1)} من ${ar(qs.length)}`;
      const r = await PR.QuestionCard(rootEl, qs[i], { path: 'practice', ladder: false, maxAttempts: 2, maxHints: 2, label: `السؤال ${ar(i + 1)} من ${ar(qs.length)}`, nextLabel: i < qs.length - 1 ? 'السؤال التالي ←' : '🧬 حلّل مستواي' });
      answers.push(r);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    bar.style.width = '100%';

    // ---- شاشة التحليل ----
    $('#diag-title').textContent = 'يحلّل نَبْتي إجاباتك…';
    rootEl.innerHTML = `<div class="card analyzing"><div class="an-nabti">${PR.art.nabti('think')}</div><ul class="an-steps">
      <li>🔎 مراجعة الإجابات الصحيحة والخاطئة</li><li>💡 احتساب التلميحات والمحاولات</li><li>⏱️ تحليل الوقت ونوع الأخطاء</li><li>🧭 اختيار المسار المناسب</li></ul></div>`;
    const lis = rootEl.querySelectorAll('.an-steps li');
    for (const li of lis) { await wait(450); li.classList.add('done'); }

    const A = E.analyzeDiagnostic(answers);
    p.diagnosticResults = {
      completedAt: new Date().toISOString(), answers, skillScores: A.skillScores, raw: A.raw, adjusted: A.adjusted,
      metrics: A.metrics, narrative: A.narrative, strengths: A.strengths, weaknesses: A.weaknesses, path: A.path, reasons: A.reasons,
    };
    p.skillMastery = A.initialMastery;
    p.partMastery = A.partMastery;
    answers.forEach((a) => {
      p.responses.push(Object.assign({ at: new Date().toISOString(), source: 'diagnostic', credit: Math.round(E.responseCredit(a) * 100) / 100 }, a));
      a.errorsDetail.forEach((m) => p.mistakes.push(Object.assign({ at: new Date().toISOString(), qid: a.qid, skill: a.skill, part: a.part, zone: 'diagnostic' }, m)));
      if (a.hints) { p.hintsUsed += a.hints; p.hintsLog.push({ at: new Date().toISOString(), qid: a.qid, skill: a.skill, count: a.hints, auto: 0 }); }
      if (a.correct) { p.points += a.attempts === 1 ? 10 : 5; p.seeds += a.attempts === 1 && !a.hints ? 1 : 0; }
      if (E.responseCredit(a) < 0.6 && a.part) { const f = `${a.part}_${D.SKILLS[a.skill].code}`; p.weakFlags[f] = (p.weakFlags[f] || 0) + 1; }
    });
    PR.progress.setPath(p, A.path, A.reasons, 'diagnostic');
    PR.progress.log(p, 'diagnostic', `أكمل التشخيص: خام ${A.raw}٪، معدّل ${A.adjusted}٪`);
    p.drops += 3;
    PR.progress.completeActivity(p, 'diagnostic', { score: A.adjusted });
    const newBadge = PR.progress.addBadge(p, 'explorer');
    p.recommendations = E.recommendations(p);
    PR.progress.save(p);
    PR.ui.refreshStats();
    PR.sfx.play('win');
    showProfile(p, true);
    if (newBadge) setTimeout(() => PR.ui.badge('explorer'), 900);

    function showProfile(p, fresh) {
      const R = p.diagnosticResults;
      const P = D.PATHS[R.path];
      $('#diag-title').textContent = '🧬 ملفك التعليمي الذكي';
      const m = R.metrics;
      const avgTime = Math.round(R.answers.reduce((s, a) => s + a.timeMs, 0) / R.answers.length / 1000);
      const plan = { remediation: ['📷 صورة الجزء', '🏷️ اسمه', '⚙️ وظيفته', '<i class="olive-ic" aria-hidden="true"></i> مثال من بيئتنا', '🎮 نشاط بسيط', '❓ سؤال قصير', '🔁 إعادة المحاولة'],
        practice: ['📖 شرح مختصر', '🖼️ صور وأمثلة', '🎮 نشاط تفاعلي', '📶 أسئلة متدرجة', '💡 تلميحات عند الحاجة'],
        challenge: ['🔬 مواقف علمية', '❓ «ماذا يحدث لو؟»', '🧪 تجارب افتراضية', '✍️ مشكلات مفتوحة', '⚖️ اتخاذ القرار'] }[R.path];
      rootEl.innerHTML = `<div class="profile-grid">
        <section class="card reveal">
          <div class="row"><div class="avatar-lg">🔬</div><div><p class="eyebrow">الطالب</p><h2 class="h-sm">${esc(p.name)}</h2></div><span class="grow"></span>${PR.ui.pathBadge(R.path)}</div>
          <div class="kpis">
            <div class="kpi"><b>${pct(R.raw)}</b><span>الدرجة الخام</span></div>
            <div class="kpi kpi-main"><b>${pct(R.adjusted)}</b><span>الإتقان المعدّل</span></div>
            <div class="kpi"><b>${ar(m.hints)}</b><span>تلميحات</span></div>
            <div class="kpi"><b>${ar(m.retries)}</b><span>محاولات إضافية</span></div>
            <div class="kpi"><b>${ar(avgTime)} ث</b><span>متوسط الوقت</span></div>
          </div>
          <h3>📊 مستوى المهارات</h3>
          ${D.SKILL_ORDER.map((s) => PR.ui.masteryBar(D.SKILLS[s].name, R.skillScores[s], { icon: D.SKILLS[s].icon })).join('')}
        </section>
        <section class="stack">
          <div class="card insight reveal">
            <p class="eyebrow">🤖 استنتاج نَبْتي</p>
            <p class="insight-t">${esc(R.narrative)}</p>
            ${PR.ui.speakBtn(R.narrative, 'استمع إلى الاستنتاج')}
          </div>
          <div class="card path-card path-${R.path} reveal">
            <p class="eyebrow">🧭 مسارك التكيفي</p>
            <h2 class="h-sm">${P.icon} ${P.name}</h2>
            <p>${esc(P.desc)}</p>
            <details open><summary>لماذا هذا المسار؟</summary><ul class="reasons">${R.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></details>
            <p class="muted small">ملاحظة: المسار ليس ثابتًا؛ سيتغيّر تلقائيًا حسب أدائك في كل منطقة.</p>
            <ol class="plan">${plan.map((x) => `<li>${x}</li>`).join('')}</ol>
          </div>
          <div class="row-end"><a class="btn btn-primary lg" href="map.html" id="to-map">🗺️ انطلق إلى خريطة الرحلة</a></div>
        </section>
      </div>`;
      PR.nabti.say(fresh ? `انتهيت! ${R.narrative} اخترتُ لك «${P.name}».` : 'هذا ملفك الذكي. يمكنك العودة إلى الخريطة لمتابعة رحلتك.', 'cheer');
      $('#to-map').focus();
    }
  };
})();
