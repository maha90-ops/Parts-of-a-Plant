/* =========================================================================
   rescue.js — المنطقة السادسة: مركز إنقاذ لولو (مهمة متعددة الخطوات) + التقييم النهائي
   التحقيق ← (اختيار الأدلة للمتقدم) ← المشكلة ← الجزء ← الحل ← تطبيق الحل ← التقييم النهائي
   الحالة تختلف حسب المسار: علاجي (عطش)، متوسط (ساق مكسورة)، متقدم (نقص الضوء).
   ========================================================================= */
(function () {
  'use strict';
  const PR = window.PR;
  const D = PR.data, E = PR.engine;
  const { $, $$, esc, ar, pct, wait } = PR.util;
  const CLUE_BTNS = [
    { k: 'soil', t: 'الماء', i: '💧' }, { k: 'root', t: 'الجذر', i: '🌱' }, { k: 'stem', t: 'الساق', i: '🌿' },
    { k: 'leaf', t: 'الأوراق', i: '🍃' }, { k: 'env', t: 'الضوء', i: '☀️' }, { k: 'flower', t: 'الزهرة', i: '🌸' },
  ];

  PR.pages.rescue = async function () {
    const p = PR.progress.require({ diagnostic: true });
    if (!p) return;
    if (!PR.progress.isUnlocked(p, 'rescue')) { location.href = 'map.html?locked=rescue'; return; }
    const stage = $('#rescue-stage');
    const steps = $('#rescue-steps');
    const STEP_T = ['🚨 الإنذار', '🔎 جمع الأدلة', '🧩 المشكلة', '🔗 الجزء', '💊 الحل', '🎓 تحدي التخرج', '🏆 النتيجة'];
    const setStep = (i) => { steps.innerHTML = STEP_T.map((t, k) => `<li class="${k === i ? 'on' : k < i ? 'done' : ''}" ${k === i ? 'aria-current="step"' : ''}><span class="sn">${ar(k + 1)}</span> ${t}</li>`).join(''); };
    $('#rescue-path').innerHTML = PR.ui.pathBadge(p.currentPath);

    if (p.zones.rescue.status === 'done' && new URLSearchParams(location.search).get('again') !== '1') return results(true);

    const C = D.RESCUE_CASES[D.RESCUE_BY_PATH[p.currentPath] || 'A'];
    const state = Object.assign({}, C.state);
    const log = (t) => { PR.progress.log(p, 'adapt', t); PR.progress.save(p); };
    const rec = (r) => { const res = PR.progress.recordResponse(p, Object.assign({ zone: 'rescue' }, r)); PR.progress.save(p); PR.ui.reward(res.reward); return res; };
    // تحدّي الخيمة والزيتون: لحظة الإجابة تتحول الخيمة إلى بيت (أو تبقى) أمام الطالب
    const villageNow = (r) => { const vr = PR.village.record(p, r); PR.progress.save(p); PR.village.update(p, vr); };
    const FACTS = D.RESCUE_FACTS[C.id] || {};
    const challenge = () => ({ stakes: PR.village.stakes(p), consequence: PR.village.consequence, onFinish: villageNow, revealOnFail: true });
    PR.village.start(p); PR.puzzle.stop(p); PR.progress.save(p);
    PR.village.mountAside(p);
    const drawLulu = (el, extra) => { el.innerHTML = PR.art.plant(Object.assign({ scene: true }, state, extra || {}, { title: `لولو: ${C.title}` })); };
    log(`بدء مهمة الإنقاذ: الحالة ${C.id} «${C.title}» حسب ${(D.PATHS[p.currentPath].kid || D.PATHS[p.currentPath].name)}`);

    // ---- ١) الإنذار ----
    setStep(0);
    stage.innerHTML = `<div class="card alarm reveal"><div class="alarm-art" id="al-lulu"></div><div><p class="eyebrow blink">🚨 إنذار!</p><h2>لولو ما زالت تحتاج إلى مساعدتك!</h2>
      ${PR.lulu.html('ساعدني… أنا ذابلة جدًا! 😢', 'help', { cls: 'inline', health: 30 })}
      <p>افحص الأدلة: 💧 الماء، 🌱 الجذر، 🌿 الساق، 🍃 الأوراق، ☀️ الضوء. ثم قرّر خطوة بخطوة: ما المشكلة؟ وأيّ جزء؟ وما الحل؟</p>
      <div class="row-end"><button class="btn btn-red lg" id="al-go">🔎 ابدأ التحقيق</button></div></div></div>`;
    drawLulu($('#al-lulu'), { mood: 'help' });
    PR.nabti.say('لولو تحتاجك الآن! لا تتسرّع، فالعالِم يجمع الأدلة قبل أن يحكم.', 'concern');
    if (PR.lulu) PR.lulu.say('ساعدني… أنا ذابلة جدًا! 😢', 'help');
    if (PR.audio) PR.audio.narrate('final');
    $('#al-go').focus();
    await new Promise((r) => { $('#al-go').onclick = r; });

    // ---- ٢) جمع الأدلة ----
    setStep(1);
    const seen = new Set();
    const minClues = p.currentPath === 'remediation' ? 3 : 4;
    stage.innerHTML = `<div class="investigate"><div class="card inv-plant"><div id="inv-lulu"></div><p class="muted small center">يمكنك أيضًا الضغط على أجزاء لولو مباشرة 🔎</p></div>
      <div class="card"><h3>🔎 افحص لولو (${ar(minClues)} أدلة على الأقل)</h3><div class="clue-btns">${CLUE_BTNS.map((c) => `<button class="btn clue-b" data-k="${c.k}">${c.i} ${c.t}</button>`).join('')}</div>
      <h4>📓 دفتر الأدلة</h4><ul class="notebook" id="nb" aria-live="polite"><li class="muted">لم تجمع أدلة بعد.</li></ul>
      <div class="row-end"><button class="btn btn-primary" id="inv-next" disabled>حلّل الأدلة ←</button></div></div></div>`;
    drawLulu($('#inv-lulu'), { hotspots: true });
    const reveal = (k) => {
      if (!C.clues[k]) return;
      if (!seen.has(k)) {
        seen.add(k);
        if (seen.size === 1) $('#nb').innerHTML = '';
        $('#nb').insertAdjacentHTML('beforeend', `<li class="reveal ${p.currentPath === 'remediation' && C.key.includes(k) ? 'key' : ''}">${esc(C.clues[k])}${p.currentPath === 'remediation' && C.key.includes(k) ? ' <b class="pill-bad">← دليل مهم!</b>' : ''}</li>`);
        PR.sfx.play('click');
        const b = $(`.clue-b[data-k="${k}"]`); if (b) { b.classList.add('used'); b.setAttribute('aria-pressed', 'true'); }
      }
      if (seen.size >= minClues) $('#inv-next').disabled = false;
      PR.nabti.say(C.clues[k], 'think');
    };
    $$('.clue-b').forEach((b) => b.onclick = () => reveal(b.dataset.k));
    $$('#inv-lulu .part').forEach((g) => g.addEventListener('click', () => reveal(g.dataset.part)));
    await new Promise((r) => { $('#inv-next').onclick = r; });
    log(`جمع ${seen.size} أدلة: ${[...seen].join('، ')}`);

    // ---- للمسار المتقدم: اختيار الأدلة الداعمة ----
    {  // اختيار الأدلة الداعمة (لكل المسارات؛ في العلاجي تُميَّز الأدلة المهمة)
      const t0 = performance.now();
      stage.innerHTML = `<div class="card reveal"><p class="eyebrow">⚖️ اتخاذ القرار</p><h3>اختر الدليلين الأهم اللذين يكشفان مشكلة لولو:</h3>
        <p class="q-stakes">${PR.village.stakes(p)}</p>
        <div class="evidence">${[...seen].map((k) => `<label class="ev"><input type="checkbox" value="${k}"> <span>${esc(C.clues[k])}</span></label>`).join('')}</div>
        <p class="act-fb" role="status"></p><div class="row-end"><button class="btn btn-primary" id="ev-go">تأكيد ←</button></div></div>`;
      let attempts = 0;
      await new Promise((res) => {
        $('#ev-go').onclick = () => {
          const picked = $$('.ev input:checked').map((x) => x.value);
          const fb = $('.act-fb');
          if (picked.length !== 2) { fb.className = 'act-fb bad'; fb.textContent = 'اختر دليلين بالضبط.'; return; }
          attempts++;
          const ok = C.key.every((k) => picked.includes(k)) || !C.key.every((k) => seen.has(k)) && picked.some((k) => C.key.includes(k));
          if (ok || attempts >= 2) {
            const er = { qid: `rescue-${C.id}-evidence`, skill: 'infer', part: C.key[0] === 'env' ? 'leaf' : C.key[0] === 'soil' ? 'root' : C.key[0], level: 3, correct: ok, attempts, hints: 0, timeMs: performance.now() - t0, errors: ok ? [] : ['partial'], errorsDetail: ok ? [] : [{ errorType: 'partial', chosen: picked.join('+') }] };
            rec(er); villageNow(er);
            const cq = PR.village.consequence(er);
            fb.className = 'act-fb ' + cq.cls;
            fb.innerHTML = cq.html + (ok ? '' : `<br>📘 الدليلان الأهم: ${esc(C.key.map((k) => C.clues[k]).join(' + '))}`);
            document.querySelectorAll('.ev input').forEach((x) => { x.disabled = true; });
            if (FACTS.evidence) fb.insertAdjacentHTML('afterend', `<p class="fact"><b>معلومة من بلادنا:</b> ${esc(FACTS.evidence)}</p>`);
            $('#ev-go').textContent = 'التالي ←'; $('#ev-go').onclick = res;
          } else { fb.className = 'act-fb bad'; fb.textContent = '💡 فكّر: أيّ دليلين يختلفان عن الحالة الطبيعية للنبتة؟'; }
        };
      });
    }

    // ---- ٣-٥) المشكلة ← الجزء ← الحل ----
    const QS = [
      { key: 'problem', skill: 'infer', step: 2 },
      { key: 'part', skill: 'match', step: 3 },
      { key: 'solution', skill: 'solve', step: 4 },
    ];
    const casePart = { A: 'root', B: 'stem', C: 'leaf' }[C.id];
    for (const s of QS) {
      setStep(s.step);
      stage.innerHTML = `<div class="rescue-q"><div class="card rq-side"><div id="rq-lulu"></div><h4>📓 أدلتك</h4><ul class="notebook small">${[...seen].map((k) => `<li>${esc(C.clues[k])}</li>`).join('')}</ul></div><div id="rq-box"></div></div>`;
      drawLulu($('#rq-lulu'));
      const q = Object.assign({ id: `rescue-${C.id}-${s.key}`, skill: s.skill, part: casePart, level: 3, hints: [D.PARTS[casePart].hints[0], 'راجع دفتر الأدلة: ما الشيء غير الطبيعي؟', D.PARTS[casePart].hints[2]] }, C[s.key]);
      q.fact = FACTS[s.key];
      const resp = await PR.QuestionCard($('#rq-box'), q, Object.assign({ path: p.currentPath, zone: 'rescue', label: `الخطوة ${ar(s.step - 1)} من ٣`, onDecision: log }, challenge()));
      rec(resp);
    }

    // ---- تطبيق الحل ----
    stage.innerHTML = `<div class="card heal reveal"><div id="heal-lulu"></div><div><h2>💊 طبّق الحل</h2><p>${esc(C.solution.options.find((o) => o.c).t)}</p>
      <div class="row-end"><button class="btn btn-primary lg" id="heal-go">✨ أنقذ لولو الآن</button></div><p class="act-fb" role="status"></p></div></div>`;
    drawLulu($('#heal-lulu'));
    $('#heal-go').focus();
    await new Promise((r) => { $('#heal-go').onclick = r; });
    $('#heal-go').disabled = true;
    Object.assign(state, C.fix, { health: state.health });
    $('.act-fb').className = 'act-fb good'; $('.act-fb').textContent = C.fixText;
    // لولو تستعيد عافيتها تدريجيًا، مع سلسلة الفهم: الجذر يمتص ← الساق ينقل ← الأوراق تصنع الغذاء
    $('.act-fb').insertAdjacentHTML('afterend', `<ol class="heal-chain" aria-label="ماذا حدث داخل لولو؟">
      <li>🌱 <b>الجذر</b> يمتص الماء.</li><li>🌿 <b>الساق</b> ينقل الماء.</li><li>🍃 <b>الأوراق</b> تستخدم الماء وضوء الشمس لصنع الغذاء.</li></ol>`);
    const chain = document.querySelectorAll('.heal-chain li');
    const moods = ['help', 'help', 'happy', 'happy', 'excited'];
    for (let k = 0; k < 5; k++) { state.health = [50, 65, 80, 92, 100][k]; drawLulu($('#heal-lulu'), { flow: true, mood: moods[k] }); if (chain[k - 1]) chain[k - 1].classList.add('on'); await wait(520); }
    if (PR.lulu) PR.lulu.say('أحسنت! لقد أنقذتني! 🌱💚', 'excited');
    PR.sfx.play('win'); PR.fx.confetti(50);
    PR.nabti.say('لقد أنقذتَ لولو! انظر كيف عادت إليها الحياة 🌺 بقي «تحدي التخرج» القصير 🎓', 'cheer');
    p.rescue = { caseId: C.id, clues: [...seen], completedAt: new Date().toISOString() };
    PR.progress.save(p);
    $('#heal-go').outerHTML = '<button class="btn btn-red lg" id="post-go">🎓 ابدأ تحدي التخرج</button>';
    $('#post-go').focus();
    await new Promise((r) => { $('#post-go').onclick = r; });

    // ---- ٦) التقييم النهائي ----
    setStep(5);
    const answers = [];
    for (let i = 0; i < D.POSTTEST.length; i++) {
      const pq = Object.assign({}, D.POSTTEST[i], { fact: D.POSTTEST_FACTS[D.POSTTEST[i].id] });
      const r = await PR.QuestionCard(stage, pq, Object.assign({ path: p.currentPath, ladder: false, maxAttempts: 2, maxHints: 1, zone: 'posttest', label: `🎓 تحدي التخرج ${ar(i + 1)} من ${ar(D.POSTTEST.length)}`, nextLabel: i < D.POSTTEST.length - 1 ? 'التالي ←' : '🏆 النتيجة' }, challenge()));
      answers.push(r);
      rec(Object.assign({}, r, { zone: 'posttest' }));
    }
    const A = E.analyzeDiagnostic(answers);
    p.postTest = { completedAt: new Date().toISOString(), answers, raw: A.raw, adjusted: A.adjusted, skillScores: A.skillScores };
    const rescueResp = p.responses.filter((r) => r.zone === 'rescue');
    const stars = E.starsFor(rescueResp.map((r) => r.credit).concat(answers.map(E.responseCredit)));
    PR.progress.completeZone(p, 'rescue', { stars, score: A.adjusted });
    PR.progress.addBadge(p, 'lulu_savior');
    const overall = E.overallMastery(p);
    p.certificate = { issuedAt: new Date().toISOString(), mastery: overall, level: E.levelFor(p.points).name, path: p.currentPath };
    p.recommendations = E.recommendations(p);
    PR.progress.log(p, 'rescue', `أنقذ لولو. التقييم النهائي: خام ${A.raw}٪، معدّل ${A.adjusted}٪`);
    PR.progress.save(p);
    PR.ui.refreshStats();
    results(false);

    function results(revisit) {
      setStep(6);
      const pre = p.diagnosticResults.adjusted, post = p.postTest ? p.postTest.adjusted : null;
      const gain = post != null ? post - pre : 0;
      stage.innerHTML = `<div class="card summary reveal"><div class="sum-top"><div class="final-lulu">${PR.art.plant({ mode: 'pot', health: 100, water: 2, mood: 'excited' })}</div>
        <div><p class="eyebrow">🏆 مهمة مكتملة</p><h2>🎉 لقد أنقذت لولو!</h2>
        <p class="big-t">أصبحت الآن عالم نبات صغيرًا يا ${esc(p.name)}!</p>
        ${PR.lulu.html('أحسنت! لقد أنقذتني! 🌱💚', 'excited', { cls: 'inline' })}
        <div class="kpis"><div class="kpi"><b>${pct(pre)}</b><span>قبل الرحلة</span></div><div class="kpi kpi-main"><b>${post != null ? pct(post) : '—'}</b><span>بعد الرحلة</span></div><div class="kpi"><b>${gain >= 0 ? '+' : '−'}${ar(Math.abs(gain))}</b><span>مكسب التعلم</span></div><div class="kpi"><b>${pct(E.overallMastery(p))}</b><span>الإتقان العام</span></div></div>
        <div class="row-end"><a class="btn" href="dashboard.html">📊 لوحتي</a><a class="btn" href="report.html">📄 تقرير رحلة التعلم</a><a class="btn btn-red lg" href="certificate.html">📄 عرض الشهادة</a></div>
        ${revisit ? '<p class="muted small">يمكنك <a href="rescue.html?again=1">إعادة مهمة الإنقاذ</a> للتدريب.</p>' : ''}</div></div>
        <div class="card-inner mt" id="final-village">${PR.village.panel(p)}</div></div>`;
      PR.village.mountPanel($('#final-village'), p);
      PR.puzzle.stop(p); PR.progress.save(p);
      PR.village.mountAside(p);
      $('#final-village').insertAdjacentHTML('afterend', `<div class="card-inner mt">${PR.passport.html(p)}</div>`);
      if (!revisit) { PR.fx.confetti(40); setTimeout(async () => { await PR.passport.stamp(p, 'rescue'); PR.ui.badge('lulu_savior'); }, 700); }
      PR.nabti.say(revisit ? 'لولو بخير بفضلك! شاهد تقريرك وشهادتك.' : 'أنت منقذ لولو! 🏆 شهادتك جاهزة.', 'cheer');
    }
  };
})();
