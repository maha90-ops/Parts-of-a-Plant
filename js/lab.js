/* =========================================================================
   lab.js — المنطقة الخامسة: المختبر النباتي
   ١) «طابق وأنقذ» — سحب وإفلات (مع بديل بالنقر/لوحة المفاتيح) + تشخيص الضعف لكل جزء
   ٢) «ماذا يحدث لو؟» — مواقف استنتاجية تربط النتيجة بالوظيفة
   ٣) «مختبر لولو» — محاكاة متغيرات (ماء، ضوء، حالة الأجزاء) وأثرها على النبتة
   ========================================================================= */
(function () {
  'use strict';
  const PR = window.PR;
  const D = PR.data, E = PR.engine;
  const { $, $$, esc, ar, pct, shuffle, wait } = PR.util;
  const STATIONS = [
    { id: 'match', t: 'طابق وأنقذ', i: '🧩' },
    { id: 'whatif', t: 'ماذا يحدث لو؟', i: '❓' },
    { id: 'sim', t: 'مختبر لولو', i: '🧪' },
  ];

  function rec(p, r) { const res = PR.progress.recordResponse(p, Object.assign({ zone: 'lab' }, r)); PR.progress.save(p); PR.ui.reward(res.reward); return res; }
  function log(p, t) { PR.progress.log(p, 'adapt', t); PR.progress.save(p); }

  /* ======================= ١) طابق وأنقذ ======================= */
  async function matchStation(box, p, round) {
    const level = E.activityLevel(p.currentPath);
    const funcs = shuffle(D.MATCH_SETS[level].map((f, i) => Object.assign({ key: 'f' + i }, f)));
    const chips = shuffle(funcs.map((f, i) => ({ id: 'c' + i, part: f.part })));
    const wrong = {}, hintsBy = {}; const details = {};
    D.MAIN_PARTS.forEach((pt) => { wrong[pt] = 0; hintsBy[pt] = 0; details[pt] = []; });
    const t0 = performance.now();
    box.innerHTML = `<div class="act-head"><h3>🧩 طابق وأنقذ ${round > 1 ? '· إعادة المحاولة 🔁' : ''}</h3>
      <p class="act-ins">اسحب كل جزء من النبات إلى وظيفته المناسبة. (بديل: اضغط على الجزء ثم على الوظيفة، أو استخدم Tab ثم Enter)</p></div>
      <div class="match">
        <div class="m-parts" role="group" aria-label="أجزاء النبات">${chips.map((c) => `<button class="mchip" data-id="${c.id}" data-part="${c.part}" aria-pressed="false"><span class="mc-i" aria-hidden="true">${D.PARTS[c.part].icon}</span>${D.PARTS[c.part].name}</button>`).join('')}</div>
        <div class="m-funcs">${funcs.map((f) => `<button class="mslot" data-key="${f.key}" data-part="${f.part}"><span class="ms-t">${f.icon ? f.icon + ' ' : ''}${esc(f.t)}</span><span class="ms-drop" aria-hidden="true">⬚ أفلت هنا</span></button>`).join('')}</div>
      </div><p class="act-fb" role="status"></p>`;
    const fb = $('.act-fb', box);
    let selected = null, placed = 0;
    PR.nabti.say(level === 3 ? 'تحدٍّ: لكل جزء وظيفتان! طابق الثماني بطاقات.' : 'طابق كل جزء بوظيفته. سأراقب أداءك لأساعدك عند الحاجة.', 'happy');

    return new Promise((resolve) => {
      function select(chip) {
        $$('.mchip', box).forEach((c) => c.setAttribute('aria-pressed', 'false'));
        if (selected === chip) { selected = null; return; }
        selected = chip; chip.setAttribute('aria-pressed', 'true');
        fb.className = 'act-fb'; fb.textContent = `اخترت «${D.PARTS[chip.dataset.part].name}». اختر وظيفته الآن.`;
      }
      async function drop(chip, slot) {
        if (!chip || !slot || slot.classList.contains('filled')) return;
        const part = chip.dataset.part, need = slot.dataset.part;
        if (part === need) {
          slot.classList.add('filled');
          $('.ms-drop', slot).innerHTML = `${D.PARTS[part].icon} ${D.PARTS[part].name} ✓`;
          slot.setAttribute('aria-label', `${$('.ms-t', slot).textContent}: ${D.PARTS[part].name} ✓`);
          chip.remove(); selected = null; placed++;
          PR.sfx.play('correct'); PR.fx.pop(slot);
          fb.className = 'act-fb good'; fb.textContent = `✓ صحيح! ${D.PARTS[part].name}: ${$('.ms-t', slot).textContent.trim()}.`;
          if (placed === funcs.length) finish();
          else { const n = $('.mchip', box); if (n) n.focus(); }
        } else {
          wrong[part]++;
          details[part].push({ errorType: 'function-confusion', chosen: D.PARTS[part].name, chosenPart: part, expectedPart: need, slot: $('.ms-t', slot).textContent.trim() });
          PR.fx.shake(slot); PR.sfx.play('wrong');
          fb.className = 'act-fb bad';
          fb.textContent = `✗ «${$('.ms-t', slot).textContent.trim()}» ليست وظيفة ${D.PARTS[part].name}.`;
          const action = E.ladderAction(p.currentPath, wrong[part]);
          log(p, `طابق وأنقذ: خطأ ${wrong[part]} في ${D.PARTS[part].name} (${part}_function_matching) ← ${action}`);
          if (action === 'hint1' || action === 'hint2' || action === 'nudge') {
            const h = D.PARTS[part].hints[action === 'hint2' ? 1 : action === 'hint1' ? 0 : 0];
            if (action !== 'nudge') hintsBy[part]++;
            PR.nabti.say(action === 'nudge' ? `فكّر مجددًا: ماذا يفعل ${D.PARTS[part].name}؟` : `💡 ${h}`, 'think');
          } else if (action === 'minilesson') {
            hintsBy[part]++;
            const m = D.PARTS[part].mini;
            await PR.modal(`<p class="eyebrow">📖 شرح مصغّر</p><h2>${D.PARTS[part].icon} ${D.PARTS[part].name}</h2><ul class="mini-lines">${m.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul><p class="tip">💡 ${esc(m.tip)}</p><div class="row-end">${PR.ui.speakBtn(m.lines.join(' '))}<button class="btn btn-primary" data-close="ok">فهمت، سأحاول مجددًا 🔁</button></div>`, { label: 'شرح مصغر' });
          } else PR.nabti.say(`${D.PARTS[part].hints[2]}`, 'think');
        }
      }
      function finish() {
        const timeMs = performance.now() - t0;
        const weakParts = D.MAIN_PARTS.filter((pt) => wrong[pt] > 0);
        D.MAIN_PARTS.forEach((pt) => {
          if (!chips.some((c) => c.part === pt)) return;
          rec(p, { qid: `match-${pt}`, activity: 'match', skill: 'match', part: pt, level, correct: true, attempts: 1 + wrong[pt], hints: hintsBy[pt], timeMs: timeMs / 4, errors: details[pt].map((d) => d.errorType), errorsDetail: details[pt] });
        });
        PR.sfx.play('win'); PR.fx.confetti(18);
        resolve({ weakParts, wrong, timeMs });
      }
      // ---- السحب والإفلات بمؤشر الفأرة/اللمس ----
      $$('.mchip', box).forEach((chip) => {
        chip.addEventListener('click', (e) => { if (chip._dragged) { chip._dragged = false; return; } select(chip); });
        chip.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          const sx = e.clientX, sy = e.clientY; let ghost = null, over = null;
          const move = (ev) => {
            if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
              ghost = chip.cloneNode(true); ghost.classList.add('ghost'); document.body.appendChild(ghost); chip.classList.add('dragging');
            }
            if (ghost) {
              ev.preventDefault();
              ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
              const el = document.elementFromPoint(ev.clientX, ev.clientY);
              const s = el && el.closest('.mslot');
              if (over && over !== s) over.classList.remove('over');
              over = s; if (s) s.classList.add('over');
            }
          };
          const up = () => {
            document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
            if (ghost) { ghost.remove(); chip.classList.remove('dragging'); chip._dragged = true; if (over) { over.classList.remove('over'); drop(chip, over); } setTimeout(() => { chip._dragged = false; }, 50); }
          };
          document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', up);
        });
      });
      $$('.mslot', box).forEach((slot) => slot.addEventListener('click', () => { if (selected) drop(selected, slot); else { fb.className = 'act-fb'; fb.textContent = 'اختر جزءًا من النبات أولًا، ثم اختر وظيفته.'; } }));
    });
  }

  async function remedialFor(box, p, parts) {
    for (const pt of parts.slice(0, 2)) {
      const P = D.PARTS[pt];
      const flag = `${pt}_function_matching`;
      log(p, `نشاط علاجي موجّه: ${flag}`);
      box.innerHTML = `<div class="card-inner reveal"><p class="eyebrow">🎮 نشاط علاجي · ${flag}</p><h3>${P.icon} لنثبّت وظيفة ${P.name}</h3><ul class="mini-lines">${P.mini.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul><p class="tip">💡 ${esc(P.mini.tip)}</p><div class="row-end">${PR.ui.speakBtn(P.mini.lines.join(' '))}<button class="btn btn-primary" id="rm-go">لنتدرّب ←</button></div></div>`;
      $('#rm-go', box).focus();
      await new Promise((r) => { $('#rm-go', box).onclick = r; });
      for (let k = 0; k < P.remedial.length; k++) {
        const q = Object.assign({ id: `rem-${pt}-${k}`, skill: 'match', part: pt, level: 1 }, P.remedial[k]);
        const holder = document.createElement('div'); box.innerHTML = ''; box.appendChild(holder);
        const resp = await PR.QuestionCard(holder, q, { path: 'remediation', zone: 'lab', activity: 'match-remedial', label: `تدريب علاجي ${ar(k + 1)} من ${ar(P.remedial.length)}`, onDecision: (t) => log(p, t) });
        rec(p, resp);
      }
    }
  }

  /* ======================= ٢) ماذا يحدث لو؟ ======================= */
  async function whatifStation(box, p) {
    const path = p.currentPath;
    const list = path === 'remediation' ? D.WHATIF.slice(0, 2) : path === 'practice' ? D.WHATIF.slice(0, 3) : D.WHATIF;
    PR.nabti.say('في كل موقف: توقّع ما سيحدث، ثم فسّر إجابتك بربطها بوظيفة الجزء.', 'think');
    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      box.innerHTML = '<div id="wi-q"></div>';
      const resp = await PR.QuestionCard($('#wi-q', box), q, { path, zone: 'lab', activity: 'whatif', label: `موقف ${ar(i + 1)} من ${ar(list.length)}`, onDecision: (t) => log(p, t) });
      rec(p, resp);
    }
    if (path === 'challenge') {
      const O = D.WHATIF_OPEN; const t0 = performance.now();
      box.innerHTML = `<div class="card-inner reasoning"><p class="eyebrow">✍️ مشكلة مفتوحة</p><h3>${esc(O.prompt)}</h3><textarea class="input" id="wo-a" aria-label="إجابتك" placeholder="اكتب الجزء المحتمل وتفسيرك…"></textarea>
        <div class="rubric">${O.rubric.map((r, i) => `<span class="rb" data-i="${i}">○ ${esc(r.label)}</span>`).join('')}</div><p class="act-fb" role="status"></p><div class="row-end"><button class="btn btn-primary" id="wo-go">✔️ قيّم إجابتي</button></div></div>`;
      let attempts = 0;
      await new Promise((res) => {
        $('#wo-go', box).onclick = () => {
          const t = $('#wo-a', box).value.trim(); const fb = $('.act-fb', box);
          if (t.length < 8) { fb.className = 'act-fb bad'; fb.textContent = 'اكتب جملة كاملة ✍️'; return; }
          attempts++;
          const sc = E.scoreOpen(t, O.rubric);
          sc.hits.forEach((h, i) => { const el = $(`.rb[data-i="${i}"]`, box); el.textContent = `${h ? '✓' : '✗'} ${O.rubric[i].label}`; el.className = 'rb ' + (h ? 'hit' : 'miss'); });
          const ok = sc.score >= 0.67;
          if (ok || attempts >= 2) {
            rec(p, { qid: 'whatif-open', activity: 'whatif', skill: 'solve', part: 'root', level: 3, type: 'open', correct: ok, attempts, hints: attempts - 1, timeMs: performance.now() - t0, errors: ok ? [] : ['partial'], errorsDetail: ok ? [] : [{ errorType: 'partial', chosen: t.slice(0, 80) }], answerText: t });
            fb.className = 'act-fb ' + (ok ? 'good' : 'neutral'); fb.innerHTML = `${ok ? '✓ تحليل علمي ممتاز!' : '📘 قارن بالإجابة النموذجية:'}<br><b>نموذج:</b> ${esc(O.model)}`;
            $('#wo-go', box).textContent = 'إنهاء المحطة ←'; $('#wo-go', box).onclick = res;
          } else { fb.className = 'act-fb bad'; fb.textContent = '💡 حسّن إجابتك: هل ذكرت الجزء، ووظيفته، والماء؟'; }
        };
      });
    }
  }

  /* ======================= ٣) مختبر لولو (محاكاة) ======================= */
  function simulate(s) {
    const rootF = { healthy: 1, weak: 0.55, damaged: 0.1 }[s.root];
    const stemF = { healthy: 1, weak: 0.6 }[s.stem];
    const leafF = { healthy: 1, damaged: 0.45 }[s.leaves];
    const absorbed = (s.water / 2) * rootF;
    const toLeaves = absorbed * stemF;
    const food = Math.min(toLeaves, s.light / 2) * leafF;
    const health = Math.round(100 * (0.45 * toLeaves + 0.55 * food));
    const chain = [];
    if (s.water < 2) chain.push(s.water === 0 ? '💧 لا ماء في التربة ← الجذر لا يجد ما يمتصه ← تعطش لولو' : '💧 الماء متوسط ← يمتص الجذر كمية غير كافية');
    if (s.root !== 'healthy') chain.push(`🌱 الجذر ${s.root === 'damaged' ? 'تالف' : 'ضعيف'} ← لا يمتص الماء والأملاح جيدًا`);
    if (s.stem === 'weak') chain.push('🌿 الساق ضعيفة ← تنقل ماءً أقل إلى الأوراق، وتميل النبتة');
    if (s.light < 2) chain.push(s.light === 0 ? '☀️ لا ضوء ← الأوراق لا تصنع الغذاء ← تصفرّ' : '☀️ الضوء متوسط ← غذاء أقل');
    if (s.leaves === 'damaged') chain.push('🍃 الأوراق متضررة ← يقلّ الغذاء المصنوع');
    if (!chain.length) chain.push('✓ كل الأجزاء تؤدي وظائفها معًا ← لولو بصحة ممتازة 🌺');
    return { absorbed, toLeaves, food, health, chain };
  }

  async function simStation(box, p) {
    const s = { water: 1, light: 1, root: 'healthy', stem: 'healthy', leaves: 'healthy' };
    const need = p.currentPath === 'remediation' ? 2 : 3;
    const solved = new Set();
    let changes = 0; const t0 = performance.now();
    const ctl = (k, label, opts) => `<fieldset class="ctl"><legend>${label}</legend><div class="segs">${opts.map(([v, t]) => `<button class="seg-b" data-k="${k}" data-v="${v}">${t}</button>`).join('')}</div></fieldset>`;
    box.innerHTML = `<div class="act-head"><h3>🧪 مختبر لولو</h3><p class="act-ins">غيّر المتغيرات ولاحظ كيف تتغير حالة لولو. أكمل ${ar(need)} تحديات.</p></div>
      <div class="sim">
        <div class="sim-ctl">
          ${ctl('water', '💧 الماء', [[0, 'قليل'], [1, 'متوسط'], [2, 'كافٍ']])}
          ${ctl('light', '☀️ الضوء', [[0, 'ضعيف'], [1, 'متوسط'], [2, 'مناسب']])}
          ${ctl('root', '🌱 حالة الجذر', [['healthy', 'سليم'], ['weak', 'ضعيف'], ['damaged', 'تالف']])}
          ${ctl('stem', '🌿 حالة الساق', [['healthy', 'سليمة'], ['weak', 'ضعيفة']])}
          ${ctl('leaves', '🍃 حالة الأوراق', [['healthy', 'سليمة'], ['damaged', 'متضررة']])}
        </div>
        <div class="sim-plant" aria-live="polite"></div>
        <div class="sim-out">
          <div class="gauge"><span>💧 الماء الواصل إلى الأوراق</span><div class="health"><div class="health-fill g-w"></div></div><b class="g-wv"></b></div>
          <div class="gauge"><span>🍎 الغذاء المصنوع</span><div class="health"><div class="health-fill g-f"></div></div><b class="g-fv"></b></div>
          <div class="gauge"><span>🌺 صحة لولو</span><div class="health"><div class="health-fill g-h"></div></div><b class="g-hv"></b></div>
          <h4>🔗 سلسلة السبب والنتيجة</h4><ul class="chain"></ul>
        </div>
      </div>
      <h4>🎯 التحديات</h4><ol class="challenges">${D.LAB_CHALLENGES.map((c) => `<li data-c="${c.id}"><span class="ck" aria-hidden="true">○</span><div><b>${esc(c.title)}</b><p class="muted small">${esc(c.desc)}</p></div></li>`).join('')}</ol>
      <div id="sim-q"></div><div class="row-end"><button class="btn btn-primary" id="sim-done" disabled>إنهاء المحطة ←</button></div>`;
    let busy = false;
    function render() {
      $$('.seg-b', box).forEach((x) => { const on = String(s[x.dataset.k]) === x.dataset.v; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      const r = simulate(s);
      const leavesVis = s.leaves === 'damaged' ? 'damaged' : (r.food < 0.4 && r.toLeaves > 0.5 ? 'yellow' : 'healthy');
      $('.sim-plant', box).innerHTML = PR.art.plant({ scene: true, water: s.water, light: s.light, root: s.root, stem: s.stem, leaves: leavesVis, health: r.health, flow: r.toLeaves > 0.3, title: `لولو بصحة ${r.health}٪` });
      const set = (c, v) => { $('.' + c, box).style.width = Math.round(v * 100) + '%'; $('.' + c + 'v', box).textContent = pct(v * 100); };
      set('g-w', r.toLeaves); set('g-f', r.food); $('.g-h', box).style.width = r.health + '%'; $('.g-hv', box).textContent = pct(r.health);
      $('.chain', box).innerHTML = r.chain.map((c) => `<li>${esc(c)}</li>`).join('');
      return r;
    }
    async function check(r) {
      if (busy) return;
      for (const c of D.LAB_CHALLENGES) {
        if (solved.has(c.id)) continue;
        const ok = c.check === 'best' ? r.health >= 100
          : c.check === 'rootDamagedWater' ? s.root === 'damaged' && s.water === 2
          : s.root === 'healthy' && s.stem === 'healthy' && s.leaves === 'healthy' && s.water === 2 && s.light === 0;
        if (!ok) continue;
        busy = true;
        PR.sfx.play('correct');
        const li = $(`.challenges li[data-c="${c.id}"]`, box);
        if (c.question) {
          PR.nabti.say('لاحظ حالة لولو جيدًا، ثم أجب عن السؤال.', 'think');
          const resp = await PR.QuestionCard($('#sim-q', box), Object.assign({ zone: 'lab' }, c.question), { path: p.currentPath, zone: 'lab', activity: 'sim', label: `تحدٍّ: ${c.title}`, onDecision: (t) => log(p, t) });
          rec(p, resp);
          $('#sim-q', box).innerHTML = '';
        } else {
          rec(p, { qid: 'sim-best', activity: 'sim', skill: 'apply', part: 'leaf', level: 2, correct: true, attempts: Math.max(1, Math.ceil(changes / 4)), hints: 0, timeMs: performance.now() - t0, errors: [], errorsDetail: [] });
          PR.nabti.say('رائع! عندما تعمل كل الأجزاء معًا تكون لولو بأفضل حال.', 'cheer');
        }
        solved.add(c.id); li.classList.add('done'); $('.ck', li).textContent = '✓';
        busy = false;
        if (solved.size >= need) { $('#sim-done', box).disabled = false; PR.toast('✓ أكملت تحديات المختبر!'); }
        break;
      }
    }
    $$('.seg-b', box).forEach((x) => x.onclick = () => { if (busy) return; const v = x.dataset.v; s[x.dataset.k] = isNaN(+v) ? v : +v; changes++; PR.sfx.play('click'); check(render()); });
    render();
    PR.nabti.say('جرّب بنفسك: غيّر الماء أو الضوء أو حالة الأجزاء، وراقب لولو.', 'happy');
    await new Promise((res) => { $('#sim-done', box).onclick = res; });
  }

  /* ======================= الصفحة ======================= */
  PR.pages.lab = function () {
    const p = PR.progress.require({ diagnostic: true });
    if (!p) return;
    if (!PR.progress.isUnlocked(p, 'lab')) { location.href = 'map.html?locked=lab'; return; }
    const params = new URLSearchParams(location.search);
    $('#lab-path').innerHTML = PR.ui.pathBadge(p.currentPath);
    const tabs = $('#lab-tabs'), stage = $('#lab-stage');
    function drawTabs(active) {
      tabs.innerHTML = STATIONS.map((st, i) => `<button role="tab" class="tab ${st.id === active ? 'on' : ''}" aria-selected="${st.id === active}" data-st="${st.id}"><span aria-hidden="true">${st.i}</span> ${ar(i + 1)}. ${st.t} ${p.labStations[st.id] ? '<span class="pill-ok">✓</span>' : ''}</button>`).join('');
      $$('.tab', tabs).forEach((b) => b.onclick = () => open(b.dataset.st));
    }
    async function open(id) {
      drawTabs(id);
      stage.innerHTML = '<div class="card reveal" id="st-box"></div>';
      const box = $('#st-box');
      if (id === 'match') {
        let round = 1;
        for (;;) {
          const r = await matchStation(box, p, round);
          if (!r.weakParts.length) {
            box.innerHTML = `<div class="center"><div class="badge-medal">🧩</div><h3>طابقتَ جميع الأجزاء بلا أخطاء!</h3><p>ربطك بين الأجزاء ووظائفها قوي.</p></div>`;
            break;
          }
          const flags = r.weakParts.map((pt) => `${pt}_function_matching`);
          box.innerHTML = `<div class="card-inner"><p class="eyebrow">🤖 تحليل نَبْتي</p><h3>أكملت المطابقة، لكن لاحظت ضعفًا في:</h3>
            <ul class="reasons">${r.weakParts.map((pt) => `<li>ربط <b>${D.PARTS[pt].name}</b> بوظيفته (${ar(r.wrong[pt])} ${r.wrong[pt] === 1 ? 'خطأ' : 'أخطاء'}) — <code>skill = ${pt}_function_matching</code></li>`).join('')}</ul>
            <p>سأوجّهك إلى نشاط علاجي قصير مناسب، ثم يمكنك إعادة المحاولة.</p><div class="row-end"><button class="btn btn-primary" id="go-rem">🎮 ابدأ النشاط العلاجي</button></div></div>`;
          log(p, `طابق وأنقذ: ضعف في ${flags.join('، ')} ← توجيه إلى نشاط علاجي`);
          PR.nabti.say(`أحسنت لإكمال المطابقة! لنتدرّب قليلًا على ${r.weakParts.map((pt) => D.PARTS[pt].name).join(' و')}.`, 'concern');
          $('#go-rem').focus();
          await new Promise((res) => { $('#go-rem').onclick = res; });
          await remedialFor(box, p, r.weakParts);
          box.innerHTML = `<div class="center"><h3>🔁 هل تريد إعادة «طابق وأنقذ» لتثبيت ما تعلّمته؟</h3><div class="row-end" style="justify-content:center"><button class="btn" id="skip-r">لاحقًا</button><button class="btn btn-primary" id="again">🔁 إعادة المحاولة</button></div></div>`;
          const again = await new Promise((res) => { $('#again').onclick = () => res(true); $('#skip-r').onclick = () => res(false); });
          if (!again) { box.innerHTML = '<div class="center"><div class="badge-medal">🧩</div><h3>✓ أكملت «طابق وأنقذ» والنشاط العلاجي</h3><p class="muted">يمكنك العودة لإعادة المحاولة في أي وقت.</p></div>'; break; }
          round++;
        }
      } else if (id === 'whatif') await whatifStation(box, p);
      else await simStation(box, p);
      p.labStations[id] = true;
      PR.progress.completeActivity(p, 'lab-' + id);
      PR.progress.save(p);
      afterStation(id);
    }
    function afterStation(id) {
      drawTabs(id);
      const left = STATIONS.filter((s) => !p.labStations[s.id]);
      if (!left.length && p.zones.lab.status !== 'done') return completeLab();
      const nxt = left[0];
      stage.insertAdjacentHTML('beforeend', `<div class="card center reveal" style="margin-top:16px"><p>✓ أكملت المحطة!</p>${nxt ? `<button class="btn btn-primary" id="nx-st">التالي: ${nxt.i} ${nxt.t} ←</button>` : '<a class="btn btn-primary" href="map.html">🗺️ الخريطة</a>'}</div>`);
      const b = $('#nx-st'); if (b) { b.focus(); b.onclick = () => open(nxt.id); }
    }
    function completeLab() {
      const labResp = p.responses.filter((r) => r.zone === 'lab');
      const credits = labResp.map((r) => r.credit);
      const stars = E.starsFor(credits.length ? credits : [1]);
      PR.progress.completeZone(p, 'lab', { stars, score: Math.round(credits.reduce((a, b) => a + b, 0) / (credits.length || 1) * 100) });
      const nb = PR.progress.addBadge(p, 'little_scientist');
      const vrec = PR.village ? PR.village.record(p, 'lab', credits.length ? credits.reduce((a, b) => a + b, 0) / credits.length : 1) : null;
      const re = E.reevaluatePath(p);
      if (re.changed) PR.progress.setPath(p, re.path, re.reasons, 'reevaluation');
      p.recommendations = E.recommendations(p);
      PR.progress.save(p); PR.ui.refreshStats();
      stage.innerHTML = `<div class="card summary center reveal"><div class="sum-stars">${'⭐'.repeat(stars)}${'<span class="dim">☆</span>'.repeat(3 - stars)}</div><h2>🔬 أكملت المختبر النباتي!</h2>
        <p>ربطتَ الأجزاء بوظائفها، وتوقّعت النتائج، وجرّبت المتغيرات كالعلماء.</p>${re.changed ? `<p class="note">🧭 مسارك الآن: ${D.PATHS[re.path].name}</p>` : ''}
        <div class="row-end" style="justify-content:center"><a class="btn" href="dashboard.html">📊 لوحتي</a><a class="btn btn-red lg" href="map.html?done=lab">🚨 إلى مركز إنقاذ لولو</a></div></div>`;
      PR.sfx.play('win'); PR.fx.confetti(30); PR.ui.reward({ points: 30, drops: 5 });
      PR.nabti.say('أنت الآن عالم نبات صغير حقيقي! لولو تنتظرك في مركز الإنقاذ.', 'cheer');
      setTimeout(async () => { if (vrec) await PR.village.celebrate(p, vrec); if (nb) PR.ui.badge('little_scientist'); }, 800);
    }
    const first = params.get('station') || (STATIONS.find((s) => !p.labStations[s.id]) || STATIONS[0]).id;
    PR.nabti.say('مرحبًا بك في المختبر! ثلاث محطات تربط فيها الأجزاء بوظائفها.', 'happy');
    open(first);
  };
  PR.lab = { simulate };
})();
