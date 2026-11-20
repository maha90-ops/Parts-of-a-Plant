/* =========================================================================
   activities.js — المناطق التعليمية الأربع + منفّذ المنطقة التكيفي + التدريب الموجّه
   كل منطقة تتكوّن من خطوات يختارها المحرك حسب المسار:
     علاجي:  micro → activity → questions → summary
     متوسط:  explore → brief → activity → questions → summary
     متقدم:  explore → activity → questions → reasoning → summary
   ========================================================================= */
(function () {
  'use strict';
  const PR = window.PR;
  const D = PR.data, E = PR.engine;
  const { $, $$, esc, ar, pct, shuffle, wait } = PR.util;

  const STEP_LABELS = { micro: '👣 خطوة بخطوة', explore: '🔎 استكشف', brief: '📖 شرح مختصر', activity: '🎮 نشاط', questions: '❓ أسئلة', reasoning: '🧠 فكّر كالعلماء', summary: '🏁 النتيجة' };

  /* أسئلة «لماذا؟» بعد كل نشاط */
  const WHY = {
    roots: { id: 'roots-why', zone: 'roots', part: 'root', skill: 'explain', level: 1, prompt: 'لماذا يحتاج النبات إلى الجذر؟',
      options: [{ t: 'ليمتص الماء والأملاح ويثبّت النبات في التربة', c: 1 }, { t: 'ليصنع الغذاء من ضوء الشمس', e: 'function-confusion', p: 'leaf' }, { t: 'ليجذب النحل إلى النبتة', e: 'function-confusion', p: 'flower' }, { t: 'ليحمل الأزهار في الأعلى', e: 'function-confusion', p: 'stem' }],
      explain: 'الجذر يشرب للنبات من التربة ويمسكه بقوة.' },
    stem: { id: 'stem-why', zone: 'stem', part: 'stem', skill: 'explain', level: 1, prompt: 'ما الدور الذي تؤديه الساق؟',
      options: [{ t: 'تدعم النبات وتنقل الماء والأملاح من الجذر إلى الأوراق', c: 1 }, { t: 'تمتص الماء من التربة', e: 'function-confusion', p: 'root' }, { t: 'تصنع الغذاء', e: 'function-confusion', p: 'leaf' }, { t: 'تكوّن البذور', e: 'function-confusion', p: 'flower' }],
      explain: 'الساق جسر وطريق: تحمل النبات وينتقل فيها الماء.' },
    leaves: { id: 'leaves-why', zone: 'leaves', part: 'leaf', skill: 'explain', level: 1, prompt: 'ماذا يحدث داخل مصنع الأوراق؟',
      options: [{ t: 'تصنع الورقة الغذاء من الضوء والماء وثاني أكسيد الكربون، وتُطلق الأكسجين', c: 1 }, { t: 'تمتص الورقة الأملاح من التربة', e: 'function-confusion', p: 'root' }, { t: 'تنقل الورقة الماء إلى الجذر', e: 'misconception', p: 'stem' }, { t: 'تكوّن الورقة البذور', e: 'function-confusion', p: 'flower' }],
      explain: 'الورقة مصنع غذاء النبات.' },
    flower: { id: 'flower-why', zone: 'flower', part: 'flower', skill: 'explain', level: 1, prompt: 'كيف تساعد الزهرة النبات؟',
      options: [{ t: 'تساعده على التكاثر، فمنها تتكوّن الثمار والبذور', c: 1 }, { t: 'تمتص الماء والأملاح', e: 'function-confusion', p: 'root' }, { t: 'تصنع الغذاء للنبات', e: 'function-confusion', p: 'leaf' }, { t: 'تثبّت النبات في التربة', e: 'function-confusion', p: 'root' }],
      explain: 'الزهرة بداية جيل جديد من النباتات.' },
  };

  /* =================== مكوّن الترتيب العام =================== */
  function orderActivity(box, cfg) {
    return new Promise((resolve) => {
      const n = cfg.items.length;
      let next = 0, mistakes = 0; const errorsDetail = [];
      box.innerHTML = `<div class="order">
        <p class="act-ins">${esc(cfg.instructions)}</p>
        <ol class="order-slots">${cfg.items.map((_, i) => `<li class="slot" data-i="${i}"><span class="slot-n">${ar(i + 1)}</span><span class="slot-v">؟</span></li>`).join('')}</ol>
        <div class="order-pool" role="group" aria-label="البطاقات">${shuffle(cfg.items).map((it) => `<button type="button" class="ocard" data-id="${it.id}"><span class="oc-i" aria-hidden="true">${it.icon}</span>${esc(it.label)}</button>`).join('')}</div>
        <p class="act-fb" role="status"></p></div>`;
      $('.order', box)._ids = cfg.items.map((x) => x.id); // للاختبارات الآلية
      const fb = $('.act-fb', box);
      $$('.ocard', box).forEach((b) => b.onclick = () => {
        const it = cfg.items.find((x) => x.id === b.dataset.id);
        if (it.id === cfg.items[next].id) {
          const slot = $(`.slot[data-i="${next}"]`, box);
          $('.slot-v', slot).innerHTML = `${it.icon} ${esc(it.label)} <b aria-hidden="true">✓</b>`;
          slot.classList.add('filled'); PR.fx.pop(slot);
          b.disabled = true; b.classList.add('used');
          PR.sfx.play('click');
          next++;
          fb.className = 'act-fb good'; fb.textContent = next < n ? `✓ صحيح! ما الذي يأتي بعد «${it.label}»؟` : '✓ رتّبت كل الخطوات بشكل صحيح!';
          if (next === n) { PR.sfx.play('correct'); setTimeout(() => resolve({ mistakes, errorsDetail }), 500); }
          else { const nb = $('.ocard:not(:disabled)', box); if (nb) nb.focus(); }
        } else {
          mistakes++; errorsDetail.push({ errorType: 'sequence', chosen: it.label, stage: next });
          PR.fx.shake(b); PR.sfx.play('wrong');
          fb.className = 'act-fb bad';
          fb.textContent = next === 0 ? `✗ ليست هذه البداية. ${cfg.startHint || 'من أين تبدأ الرحلة؟'}` : `✗ فكّر: ما الذي يأتي مباشرة بعد «${cfg.items[next - 1].label}»؟`;
          if (mistakes === 2 && cfg.hint) PR.nabti.say(cfg.hint, 'think');
        }
      });
    });
  }

  /* =================== النشاط ١: متاهة الجذر =================== */
  const MAZES = {
    1: ['..S..', '.#.#.', '.#.#.', '..W..'],
    2: ['...S..', '.###..', '....#.', '.##.#.', '...#W.'],
    3: ['...S...', '.#.#.#.', '.#...#.', 'M#.#.#.', '...#...', '.#..#W#'],
  };
  function rootMaze(box, level, ctx) {
    return new Promise((resolve) => {
      const G = MAZES[level].map((r) => r.split(''));
      const R = G.length, C = G[0].length, S = 64, TOP = 70;
      let start, water, mineral = null;
      G.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'S') start = [r, c]; if (ch === 'W') water = [r, c]; if (ch === 'M') mineral = [r, c]; }));
      const path = [start];
      let gotMineral = !mineral, mistakes = 0, hints = 0, done = false; const errorsDetail = []; const t0 = performance.now();
      box.innerHTML = `<div class="act-head"><h3>💧 ساعد الجذر على الوصول إلى الماء</h3>
        <p class="act-ins">اضغط على المربع المجاور لطرف الجذر ليَنمو نحوه، أو استخدم أزرار الاتجاهات. تجنّب الصخور 🪨${mineral ? '، واجمع الأملاح المعدنية 🧂 قبل الوصول إلى الماء' : ''}.</p></div>
        <div class="maze-wrap"><svg class="maze" viewBox="0 0 ${C * S} ${R * S + TOP}" tabindex="0" role="application" aria-label="متاهة الجذر: استخدم الأسهم لتوجيه الجذر"></svg></div>
        <div class="maze-ctrl" role="group" aria-label="أزرار توجيه الجذر">
          <button class="btn sm" data-d="up">⬆ أعلى</button><button class="btn sm" data-d="right">➡ يمين</button><button class="btn sm" data-d="down">⬇ أسفل</button><button class="btn sm" data-d="left">⬅ يسار</button>
          <button class="btn sm" data-d="undo">↩ تراجع</button><button class="btn sm btn-hint" data-d="hint">💡 تلميح</button>
        </div>
        <p class="act-fb" role="status"></p>`;
      const svg = $('.maze', box), fb = $('.act-fb', box);
      const say = (t, cls) => { fb.className = 'act-fb ' + (cls || ''); fb.textContent = t; };
      const key = (r, c) => r + ',' + c;
      const isFree = (r, c) => r >= 0 && c >= 0 && r < R && c < C && G[r][c] !== '#';
      function bfsNext() {
        const tip = path[path.length - 1];
        const goals = gotMineral ? [water] : [mineral];
        const visited = new Set(path.slice(0, -1).map((p) => key(...p)));
        const q = [[tip, null]]; const seen = new Set([key(...tip)]);
        while (q.length) {
          const [cur, first] = q.shift();
          if (goals.some((g) => g[0] === cur[0] && g[1] === cur[1])) return first;
          for (const [dr, dc] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
            const nr = cur[0] + dr, nc = cur[1] + dc, k = key(nr, nc);
            if (!isFree(nr, nc) || seen.has(k) || visited.has(k)) continue;
            if (!gotMineral && G[nr][nc] === 'W') continue;
            seen.add(k); q.push([[nr, nc], first || [nr, nc]]);
          }
        }
        return null;
      }
      let hintCell = null;
      function draw() {
        const vis = new Set(path.map((p) => key(...p)));
        const tip = path[path.length - 1];
        let s = `<rect x="0" y="0" width="${C * S}" height="${TOP}" fill="#dff0d0"/><path d="M0 ${TOP} H${C * S}" stroke="#5e8f3a" stroke-width="6"/>`;
        const sx = start[1] * S + S / 2;
        s += `<g transform="translate(${sx} ${TOP})"><path d="M0 0 V-30" stroke="#2f8f46" stroke-width="6" stroke-linecap="round"/><path d="M0 -22 C-18 -30 -24 -44 -22 -48 C-8 -44 -2 -34 0 -22Z M0 -28 C14 -38 26 -40 28 -44 C20 -30 10 -26 0 -28Z" fill="#4cbf5f"/></g>`;
        G.forEach((row, r) => row.forEach((ch, c) => {
          const x = c * S, y = TOP + r * S;
          const adj = !done && Math.abs(r - tip[0]) + Math.abs(c - tip[1]) === 1 && isFree(r, c) && !vis.has(key(r, c));
          const fill = ch === '#' ? '#7c6a58' : (r + c) % 2 ? '#8a5c38' : '#93633d';
          s += `<g class="cell${adj ? ' can' : ''}${hintCell && hintCell[0] === r && hintCell[1] === c ? ' hinted' : ''}" data-r="${r}" data-c="${c}"><rect x="${x + 1}" y="${y + 1}" width="${S - 2}" height="${S - 2}" rx="8" fill="${fill}"/>`;
          if (ch === '#') s += `<ellipse cx="${x + S / 2}" cy="${y + S / 2 + 4}" rx="22" ry="16" fill="#a39a90"/><ellipse cx="${x + S / 2 - 6}" cy="${y + S / 2}" rx="10" ry="6" fill="#c4bdb4"/><text x="${x + S / 2}" y="${y + S - 6}" text-anchor="middle" font-size="11" fill="#fff">صخرة</text>`;
          if (ch === 'W') s += `<ellipse cx="${x + S / 2}" cy="${y + S / 2}" rx="26" ry="18" fill="#4aa8f0"/><ellipse cx="${x + S / 2 - 6}" cy="${y + S / 2 - 5}" rx="10" ry="5" fill="#a9dcff"/><text x="${x + S / 2}" y="${y + S - 4}" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">ماء</text>`;
          if (ch === 'M') s += `<g opacity="${gotMineral ? .35 : 1}"><path d="M${x + 22} ${y + 40} l6 -16 l6 16z M${x + 34} ${y + 42} l5 -12 l5 12z" fill="#f4f1ea" stroke="#9aa"/><text x="${x + S / 2}" y="${y + S - 4}" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">أملاح</text></g>`;
          if (adj) s += `<rect x="${x + 4}" y="${y + 4}" width="${S - 8}" height="${S - 8}" rx="8" fill="none" stroke="#ffd23f" stroke-width="2.5" stroke-dasharray="5 5"/>`;
          s += '</g>';
        }));
        const pts = [[sx, TOP]].concat(path.map(([r, c]) => [c * S + S / 2, TOP + r * S + S / 2]));
        s += `<polyline class="root-line${done ? ' filled' : ''}" points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#efd29c" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
        if (done) s += `<polyline class="root-water" points="${pts.slice().reverse().map((p) => p.join(',')).join(' ')}" fill="none" stroke="#3aa0ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" pathLength="100"/>`;
        const tp = pts[pts.length - 1];
        if (!done) s += `<circle class="tip" cx="${tp[0]}" cy="${tp[1]}" r="9" fill="#fff3c4" stroke="#c99a2e" stroke-width="3"/>`;
        svg.innerHTML = s;
        $$('.cell', svg).forEach((g) => g.addEventListener('click', () => grow(+g.dataset.r, +g.dataset.c)));
      }
      function grow(r, c) {
        if (done) return;
        const tip = path[path.length - 1];
        if (Math.abs(r - tip[0]) + Math.abs(c - tip[1]) !== 1) { say('ينمو الجذر خطوة واحدة من طرفه 🟡. اختر مربعًا مجاورًا للطرف.'); return; }
        if (r < 0 || c < 0 || r >= R || c >= C) { say('هذا خارج التربة.'); return; }
        if (G[r][c] === '#') {
          mistakes++; errorsDetail.push({ errorType: 'obstacle', chosen: 'صخرة' });
          PR.sfx.play('wrong'); PR.fx.shake(svg.parentElement);
          say('🪨 صخرة! الجذر لا يستطيع اختراق الصخر. جرّب اتجاهًا آخر.', 'bad');
          if (mistakes === 3) PR.nabti.say('استخدم زر التلميح 💡 إن احتجت. الماء في الأسفل!', 'think');
          return;
        }
        if (path.some((p) => p[0] === r && p[1] === c)) { say('مرّ الجذر من هنا من قبل.'); return; }
        if (G[r][c] === 'W' && !gotMineral) { say('🧂 اجمع الأملاح المعدنية أولًا؛ فالجذر يمتص الماء والأملاح معًا.', 'bad'); mistakes++; errorsDetail.push({ errorType: 'partial', chosen: 'الماء قبل الأملاح' }); return; }
        path.push([r, c]); hintCell = null; PR.sfx.play('click');
        if (G[r][c] === 'M') { gotMineral = true; say('🧂 رائع! امتصّ الجذر الأملاح المعدنية. الآن إلى الماء!', 'good'); }
        else say('');
        if (G[r][c] === 'W') { finish(); return; }
        draw();
        // كشف الطريق المسدود
        const canMove = [[1, 0], [0, 1], [0, -1], [-1, 0]].some(([dr, dc]) => { const nr = r + dr, nc = c + dc; return isFree(nr, nc) && !path.some((p) => p[0] === nr && p[1] === nc); });
        if (!canMove) { say('طريق مسدود! اضغط «↩ تراجع» لتعيد توجيه الجذر.', 'bad'); mistakes++; errorsDetail.push({ errorType: 'obstacle', chosen: 'طريق مسدود' }); }
      }
      function finish() {
        done = true; draw();
        PR.sfx.play('win'); PR.fx.confetti(16);
        say('✓ وصل الجذر إلى الماء! امتصّ الماء والأملاح المعدنية لتصعد إلى النبتة 💧', 'good');
        PR.nabti.say('أحسنت! هكذا يبحث الجذر عن الماء في التربة ويمتصه.', 'cheer');
        $('.maze-ctrl', box).innerHTML = '<button class="btn btn-primary" id="maze-next">التالي ←</button>';
        $('#maze-next', box).focus();
        $('#maze-next', box).onclick = () => resolve({ mistakes, hints, errorsDetail, timeMs: performance.now() - t0 });
      }
      const dirs = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
      $$('.maze-ctrl button', box).forEach((b) => b.onclick = () => {
        const d = b.dataset.d; const tip = path[path.length - 1];
        if (d === 'undo') { if (path.length > 1) { const last = path.pop(); if (G[last[0]][last[1]] === 'M') gotMineral = false; draw(); say('↩ تراجع الجذر خطوة.'); } return; }
        if (d === 'hint') {
          hints++;
          if (hints === 1) { say(`💡 ${level === 1 ? 'الماء أسفل الجذر مباشرة. انزل إلى الأسفل ⬇' : 'ابحث عن ممر بين الصخور يقود إلى الأسفل.'}`, 'neutral'); PR.sfx.play('hint'); }
          else { hintCell = bfsNext(); draw(); say(hintCell ? '💡 المربع المضيء بالأصفر هو الخطوة التالية المقترحة.' : '💡 تراجع خطوة أو أكثر ثم جرّب طريقًا آخر.', 'neutral'); }
          return;
        }
        grow(tip[0] + dirs[d][0], tip[1] + dirs[d][1]);
      });
      svg.addEventListener('keydown', (e) => {
        const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
        if (m) { e.preventDefault(); const tip = path[path.length - 1]; grow(tip[0] + dirs[m][0], tip[1] + dirs[m][1]); }
      });
      draw();
    });
  }

  /* =================== النشاط ٢: رحلة الماء في الساق =================== */
  async function waterJourney(box, level, ctx) {
    const t0 = performance.now();
    let mistakes = 0, hints = 0; const errorsDetail = [];
    box.innerHTML = '<div class="act-head"><h3>💧 رحلة الماء</h3></div><div id="wj-a"></div><div id="wj-b"></div>';
    const items = level === 1
      ? [{ id: 'root', label: 'الجذر', icon: '🌱' }, { id: 'stem', label: 'الساق', icon: '🌿' }, { id: 'leaf', label: 'الأوراق', icon: '🍃' }]
      : [{ id: 'soil', label: 'التربة', icon: '🟫' }, { id: 'root', label: 'الجذر', icon: '🌱' }, { id: 'stem', label: 'الساق', icon: '🌿' }, { id: 'leaf', label: 'الأوراق', icon: '🍃' }];
    const r1 = await orderActivity($('#wj-a', box), { instructions: 'رتّب المحطات التي يمرّ بها الماء من البداية إلى النهاية (اضغط على البطاقات بالترتيب):', items, startHint: 'من أين يأتي الماء أولًا؟', hint: 'الماء يبدأ من الأسفل ويصعد إلى الأعلى.' });
    mistakes += r1.mistakes; errorsDetail.push(...r1.errorsDetail);
    const b = $('#wj-b', box);
    let state = { stem: 'healthy', health: 90, flow: false };
    const render = () => {
      $('.wj-plant', b).innerHTML = PR.art.plant(Object.assign({ scene: true, water: 2 }, state, { title: 'نبتة يتحرك فيها الماء' }));
    };
    b.innerHTML = `<div class="wj-grid"><div class="wj-plant"></div><div class="wj-side">
      <p class="act-ins">شاهد الماء 💧 يصعد من الجذر عبر الساق إلى الأوراق والزهرة.</p>
      <div class="row"><button class="btn btn-primary" id="wj-go">💧 أطلق الماء</button></div>
      <div id="wj-exp"></div><p class="act-fb" role="status"></p><div class="row-end" id="wj-end"></div></div></div>`;
    render();
    const fb = $('.act-fb', b);
    await new Promise((res) => { $('#wj-go', b).onclick = () => { state.flow = true; render(); fb.className = 'act-fb good'; fb.textContent = '💧 الماء يصعد داخل أنابيب دقيقة في الساق!'; PR.sfx.play('correct'); $('#wj-go', b).disabled = true; setTimeout(res, PR.settings.reduceMotion ? 200 : 1800); }; });
    if (level >= 2) {
      const exp = $('#wj-exp', b);
      if (level === 3) {
        exp.innerHTML = `<div class="card-inner"><p><b>🔮 توقّع قبل التجربة:</b> ماذا سيحدث للأوراق إذا قطعنا الساق؟</p><div class="q-options">
          <button class="opt" data-ok="1"><span class="opt-t">ستذبل الأوراق لأن الماء لن يصل إليها</span><span class="opt-mark"></span></button>
          <button class="opt" data-ok="0"><span class="opt-t">ستبقى الأوراق كما هي</span><span class="opt-mark"></span></button>
          <button class="opt" data-ok="0"><span class="opt-t">سيصعد الماء أسرع</span><span class="opt-mark"></span></button></div></div>`;
        await new Promise((res) => $$('.opt', exp).forEach((o) => o.onclick = () => {
          if (o.dataset.ok === '1') { o.classList.add('correct'); $('.opt-mark', o).textContent = '✓'; PR.sfx.play('correct'); res(); }
          else { o.classList.add('wrong'); o.disabled = true; $('.opt-mark', o).textContent = '✗'; mistakes++; errorsDetail.push({ errorType: 'misconception', chosen: $('.opt-t', o).textContent }); PR.sfx.play('wrong'); }
        }));
      }
      exp.insertAdjacentHTML('beforeend', '<p class="act-ins">🧪 تجربة: ماذا يحدث إذا انقطع طريق الماء؟</p><div class="row"><button class="btn btn-red" id="wj-cut">✂️ اقطع الساق</button></div>');
      await new Promise((res) => { $('#wj-cut', b).onclick = async () => {
        $('#wj-cut', b).disabled = true;
        state.stem = 'broken'; render();
        for (const hv of [75, 60, 45, 35]) { await wait(350); state.health = hv; render(); }
        fb.className = 'act-fb bad'; fb.textContent = '🥀 توقّف الماء عند الشق، فذبلت الأوراق والزهرة رغم وجود الماء في التربة!';
        PR.nabti.say('لاحظت؟ الساق هي طريق الماء. إذا انقطع الطريق عطشت الأوراق.', 'concern');
        $('#wj-end', b).innerHTML = '<button class="btn" id="wj-fix">🩹 أصلح الساق</button>';
        $('#wj-fix', b).onclick = async () => { state.stem = 'healthy'; state.health = 90; render(); fb.className = 'act-fb good'; fb.textContent = '✓ عادت الساق سليمة، فعاد الماء يصعد!'; PR.sfx.play('correct'); await wait(500); res(); };
      }; });
    }
    const end = $('#wj-end', b);
    end.innerHTML = '<button class="btn btn-primary" id="wj-next">التالي ←</button>';
    $('#wj-next', b).focus();
    await new Promise((res) => { $('#wj-next', b).onclick = res; });
    return { mistakes, hints, errorsDetail, timeMs: performance.now() - t0 };
  }

  /* =================== النشاط ٣: مصنع الأوراق =================== */
  async function leafFactory(box, level, ctx) {
    const t0 = performance.now();
    let mistakes = 0, hints = 0; const errorsDetail = [];
    box.innerHTML = '<div class="act-head"><h3>🏭 مصنع الأوراق</h3></div><div id="lf-a"></div><div id="lf-b"></div>';
    if (level >= 2) {
      const cards = [{ id: 'light', t: 'ضوء الشمس', i: '☀️', bin: 'in' }, { id: 'water', t: 'الماء', i: '💧', bin: 'in' }, { id: 'co2', t: 'ثاني أكسيد الكربون', i: '🌬️', bin: 'in' }, { id: 'food', t: 'الغذاء', i: '🍎', bin: 'out' }, { id: 'o2', t: 'الأكسجين', i: '🫧', bin: 'out' }];
      if (level === 3) cards.push({ id: 'rock', t: 'الحجارة', i: '🪨', bin: 'none' });
      const bins = [{ id: 'in', t: '⬇️ يدخل إلى المصنع' }, { id: 'out', t: '⬆️ يخرج من المصنع' }].concat(level === 3 ? [{ id: 'none', t: '🚫 لا يحتاجه المصنع' }] : []);
      const a = $('#lf-a', box);
      a.innerHTML = `<p class="act-ins">صنّف البطاقات: ما الذي يدخل إلى مصنع الورقة، وما الذي يخرج منه؟ (اختر بطاقة ثم اختر مكانها)</p>
        <div class="sort-pool" role="group" aria-label="البطاقات">${shuffle(cards).map((c) => `<button class="scard" data-id="${c.id}" aria-pressed="false"><span aria-hidden="true">${c.i}</span> ${c.t}</button>`).join('')}</div>
        <div class="sort-bins">${bins.map((bn) => `<button class="sbin" data-bin="${bn.id}"><b>${bn.t}</b><span class="sbin-items"></span></button>`).join('')}</div><p class="act-fb" role="status"></p>`;
      const fb = $('.act-fb', a);
      let sel = null, placed = 0;
      await new Promise((res) => {
        $$('.scard', a).forEach((c) => c.onclick = () => { $$('.scard', a).forEach((x) => x.setAttribute('aria-pressed', 'false')); c.setAttribute('aria-pressed', 'true'); sel = c; fb.textContent = `اخترت «${c.textContent.trim()}». أين مكانها؟`; fb.className = 'act-fb'; });
        $$('.sbin', a).forEach((bn) => bn.onclick = () => {
          if (!sel) { fb.textContent = 'اختر بطاقة أولًا.'; return; }
          const card = cards.find((c) => c.id === sel.dataset.id);
          if (card.bin === bn.dataset.bin) {
            $('.sbin-items', bn).insertAdjacentHTML('beforeend', `<span class="chip">${card.i} ${card.t} ✓</span>`);
            sel.remove(); sel = null; placed++; PR.sfx.play('click'); PR.fx.pop(bn);
            fb.className = 'act-fb good'; fb.textContent = '✓ صحيح!';
            if (placed === cards.length) { PR.sfx.play('correct'); fb.textContent = '✓ أحسنت! هذه مدخلات المصنع ومخرجاته.'; setTimeout(res, 600); }
          } else {
            mistakes++; errorsDetail.push({ errorType: card.bin === 'none' ? 'irrelevant' : 'function-confusion', chosen: card.t });
            PR.fx.shake(bn); PR.sfx.play('wrong'); fb.className = 'act-fb bad';
            fb.textContent = card.bin === 'out' ? `✗ «${card.t}» شيء يصنعه المصنع، فهل يدخل أم يخرج؟` : card.bin === 'in' ? `✗ «${card.t}» تحتاجه الورقة لتعمل. فكّر مرة أخرى.` : '✗ هل تحتاج الورقة إلى الحجارة لتصنع الغذاء؟';
          }
        });
      });
    }
    const b = $('#lf-b', box);
    const s = { light: 0, water: 1, co2: 0 };
    let reached = false, stopped = level === 1;
    b.innerHTML = `<p class="act-ins">⚙️ اضبط الظروف المناسبة لمساعدة الورقة على صنع الغذاء. الهدف: إنتاج ١٠٠٪.</p>
      <div class="factory">
        <div class="fac-controls">
          <fieldset class="ctl"><legend>☀️ الضوء</legend><div class="segs">${['ضعيف', 'متوسط', 'مناسب'].map((t, i) => `<button class="seg-b" data-k="light" data-v="${i}">${t}</button>`).join('')}</div></fieldset>
          <fieldset class="ctl"><legend>💧 الماء</legend><div class="segs">${['قليل', 'متوسط', 'كافٍ'].map((t, i) => `<button class="seg-b" data-k="water" data-v="${i}">${t}</button>`).join('')}</div></fieldset>
          <fieldset class="ctl"><legend>🌬️ ثاني أكسيد الكربون</legend><div class="segs">${['غير متوفر', 'متوفر'].map((t, i) => `<button class="seg-b" data-k="co2" data-v="${i}">${t}</button>`).join('')}</div></fieldset>
        </div>
        <div class="fac-visual" aria-hidden="true"><div class="fac-in"></div><div class="fac-leaf"></div><div class="fac-out"></div></div>
        <div class="fac-meter"><span>إنتاج الغذاء</span><div class="health"><div class="health-fill" id="fac-fill"></div></div><b id="fac-val"></b></div>
      </div>
      <p class="act-fb" role="status"></p><div class="row-end"><button class="btn btn-hint sm" id="fac-hint">💡 أحتاج إلى مساعدة</button><button class="btn btn-primary" id="fac-next" disabled>التالي ←</button></div>`;
    const fb = $('.act-fb', b);
    const prod = () => (s.co2 ? Math.min(s.light, s.water) * 50 : 0);
    function render() {
      $$('.seg-b', b).forEach((x) => { const on = +x.dataset.v === s[x.dataset.k]; x.setAttribute('aria-pressed', on); x.classList.toggle('on', on); });
      const v = prod();
      $('#fac-fill', b).style.width = v + '%'; $('#fac-val', b).textContent = pct(v);
      $('.fac-in', b).innerHTML = `<span class="${s.light ? 'flow-in' : 'off'}" style="--o:${s.light / 2}">☀️</span><span class="${s.water ? 'flow-in' : 'off'}" style="--o:${s.water / 2}">💧</span><span class="${s.co2 ? 'flow-in' : 'off'}">🌬️</span>`;
      $('.fac-leaf', b).innerHTML = `<svg viewBox="0 0 200 120"><defs><linearGradient id="fl" x1="0" x2="1"><stop offset="0" stop-color="${v ? '#5cc46f' : '#a8a86a'}"/><stop offset="1" stop-color="${v ? '#1f7a3a' : '#7a7a40'}"/></linearGradient></defs><path d="M10 60 C50 0 150 0 190 60 C150 120 50 120 10 60Z" fill="url(#fl)"/><path d="M14 60 H186" stroke="#fff" stroke-width="2" opacity=".5"/><g class="${v ? 'gear-spin' : ''}" transform="translate(100 60)"><circle r="16" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="6 4" opacity=".85"/><circle r="5" fill="#fff"/></g></svg>`;
      $('.fac-out', b).innerHTML = v ? `<span class="flow-out">🍎</span><span class="flow-out d2">🫧</span>${v === 100 ? '<span class="flow-out d3">🍎</span>' : ''}` : '<span class="off">🍎</span><span class="off">🫧</span>';
      if (v === 100 && !reached) {
        reached = true; PR.sfx.play('correct');
        fb.className = 'act-fb good';
        fb.textContent = level === 1 ? '✓ المصنع يعمل بكامل طاقته! الورقة تصنع الغذاء 🍎 وتُطلق الأكسجين 🫧.' : '✓ إنتاج ١٠٠٪! الآن جرّب: غيّر متغيرًا واحدًا فقط لتجعل المصنع يتوقف. ماذا تلاحظ؟';
        PR.nabti.say('رائع! الضوء والماء وثاني أكسيد الكربون معًا تجعل الورقة تصنع الغذاء.', 'cheer');
      } else if (reached && !stopped && v === 0) {
        stopped = true; PR.sfx.play('correct'); fb.className = 'act-fb good';
        fb.textContent = '✓ اكتشاف علمي: إذا نقص أيّ مدخل توقف المصنع أو ضعف. الورقة تحتاجها جميعًا!';
      } else if (!reached) { fb.className = 'act-fb'; fb.textContent = v ? `المصنع يعمل بنسبة ${pct(v)}… ما الذي ينقصه؟` : 'المصنع متوقف ⛔'; }
      $('#fac-next', b).disabled = !(reached && stopped);
    }
    $$('.seg-b', b).forEach((x) => x.onclick = () => { s[x.dataset.k] = +x.dataset.v; PR.sfx.play('click'); render(); });
    $('#fac-hint', b).onclick = () => {
      hints++;
      const t = hints === 1 ? 'الورقة تحتاج إلى ثلاثة أشياء تأتي من الشمس والتربة والهواء.' : !s.co2 ? 'هل ثاني أكسيد الكربون متوفر؟' : s.light < 2 ? 'الضوء ما زال غير كافٍ ☀️.' : 'هل الماء كافٍ؟ 💧';
      fb.className = 'act-fb neutral'; fb.textContent = '💡 ' + t; PR.sfx.play('hint');
    };
    render();
    await new Promise((res) => { $('#fac-next', b).onclick = res; });
    return { mistakes, hints, errorsDetail, timeMs: performance.now() - t0 };
  }

  /* =================== النشاط ٤: حديقة الأزهار ودورة الحياة =================== */
  async function flowerCycle(box, level, ctx) {
    const t0 = performance.now();
    let mistakes = 0, hints = 0; const errorsDetail = [];
    const INFO = {
      petals: { n: 'البتلات', t: '🌺 البتلات: ألوانها الزاهية تجذب النحل وطائر الشمس الفلسطيني.' },
      stamens: { n: 'الأسدية', t: '✨ الأسدية: تحمل حبوب اللقاح الصفراء، فينقلها النحل إلى زهرة أخرى.' },
      pistil: { n: 'المِدقة', t: '🟢 المِدقة: هنا تتكوّن البذور بعد التلقيح، وتكبر لتصبح ثمرة.' },
    };
    box.innerHTML = `<div class="act-head"><h3>🌸 استكشف زهرة شقائق النعمان</h3><p class="act-ins">اضغط على أجزاء الزهرة الثلاثة لتكتشف دور كل جزء.</p></div>
      <div class="fl-grid"><div class="fl-art">${PR.art.flowerParts({ hotspots: true })}<span class="bee" aria-hidden="true">🐝</span></div>
      <div><ul class="fl-list">${Object.keys(INFO).map((k) => `<li data-k="${k}"><span class="chk" aria-hidden="true">○</span> ${INFO[k].n}</li>`).join('')}</ul><div class="fl-info card-inner" role="status">اختر جزءًا من الزهرة 👆</div></div></div>
      <div id="fl-b"></div>`;
    const seen = new Set();
    await new Promise((res) => {
      $$('.fpart', box).forEach((g) => g.addEventListener('click', () => {
        const k = g.dataset.fpart; seen.add(k);
        $('.fl-info', box).innerHTML = `${esc(INFO[k].t)} ${PR.ui.speakBtn(INFO[k].t)}`;
        const li = $(`.fl-list li[data-k="${k}"]`, box); li.classList.add('done'); $('.chk', li).textContent = '✓';
        $$('.fpart', box).forEach((x) => x.classList.toggle('sel', x === g));
        PR.sfx.play('click');
        if (seen.size === 3) { setTimeout(res, 700); PR.nabti.say('اكتشفت أجزاء الزهرة! الآن لنتتبّع كيف تصبح الزهرة بذرة.', 'cheer'); }
      }));
    });
    const items = { 1: ['flower', 'fruit', 'seed'], 2: ['flower', 'pollen', 'fruit', 'seed'], 3: ['flower', 'pollen', 'fruit', 'seed', 'new'] }[level];
    const ALL = { flower: { label: 'زهرة', icon: '🌸' }, pollen: { label: 'تلقيح (النحلة تنقل حبوب اللقاح)', icon: '🐝' }, fruit: { label: 'ثمرة', icon: '🍊' }, seed: { label: 'بذرة', icon: '🌰' }, new: { label: 'نبتة جديدة', icon: '🌱' } };
    const fb2 = $('#fl-b', box);
    fb2.innerHTML = '<h3 class="mt">🔄 كيف تساعد الزهرة النبات على التكاثر؟</h3><div id="fl-order"></div>';
    const r = await orderActivity($('#fl-order', box), { instructions: 'رتّب مراحل تكوين البذور من الزهرة:', items: items.map((id) => Object.assign({ id }, ALL[id])), startHint: 'كل شيء يبدأ من الجزء الملوّن.', hint: 'الزهرة ← … ← ثمرة فيها بذور.' });
    mistakes += r.mistakes; errorsDetail.push(...r.errorsDetail);
    fb2.insertAdjacentHTML('beforeend', `<div class="cycle card-inner reveal">${items.map((id) => `<span class="cy">${ALL[id].icon}<small>${ALL[id].label.split(' (')[0]}</small></span>`).join('<span class="cy-ar" aria-hidden="true">←</span>')}<span class="cy-ar" aria-hidden="true">↺</span></div>
      <p class="act-fb good">✓ الزهرة تساعد النبات على التكاثر: منها تتكوّن الثمرة، وفي الثمرة البذور التي تنمو نباتات جديدة.</p><div class="row-end"><button class="btn btn-primary" id="fl-next">التالي ←</button></div>`);
    $('#fl-next', box).focus();
    await new Promise((res) => { $('#fl-next', box).onclick = res; });
    return { mistakes, hints, errorsDetail, timeMs: performance.now() - t0 };
  }

  const ACTIVITIES = { rootMaze, waterJourney, leafFactory, flowerCycle };

  /* =================== منفّذ المنطقة =================== */
  function record(ctx, resp) {
    const res = PR.progress.recordResponse(ctx.p, resp);
    ctx.responses.push(resp); ctx.credits.push(res.credit);
    PR.progress.save(ctx.p);
    PR.ui.reward(res.reward);
    return res;
  }
  /* قرية لولو: نتيجة المحطة تبني بيتًا أو تُسقط زيتونة */
  async function villageStep(ctx, key, credit) {
    if (!PR.village) return;
    const rec = PR.village.record(ctx.p, key, credit);
    PR.progress.save(ctx.p);
    await PR.village.celebrate(ctx.p, rec);
  }
  function decision(ctx, text) { PR.progress.log(ctx.p, 'adapt', text); ctx.decisions.push(text); PR.progress.save(ctx.p); }

  const STEPS = {
    async micro(ctx) {
      const part = D.PARTS[ctx.zone.part];
      const cards = [
        { t: '📷 صورة الجزء', body: `<div class="micro-art">${PR.art.plant({ highlight: ctx.zone.part, hotspots: true, health: 90, title: `صورة ${part.name}` })}</div><p class="big-t">اضغط على الجزء المضيء ✨</p>`, needClick: true },
        { t: '🏷️ اسمه', body: `<div class="name-card"><span class="nm-ic">${part.icon}</span><span class="nm">${part.name}</span>${PR.ui.speakBtn(part.name, 'استمع إلى الاسم')}</div><p class="big-t">مكانه: ${esc(part.location)}</p>` },
        { t: '⚙️ وظيفته', body: `<ul class="func-list">${part.speech.slice(1).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>${PR.ui.speakBtn(part.speech.join(' '), 'استمع إلى الوظيفة')}` },
        { t: '🫒 مثال من بيئتنا', body: `<div class="example"><span class="ex-ic" aria-hidden="true">🇵🇸</span><p>${esc(part.example)}</p>${PR.ui.speakBtn(part.example)}</div>` },
      ];
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        ctx.stage.innerHTML = `<div class="card micro reveal"><p class="eyebrow">خطوة ${ar(i + 1)} من ${ar(cards.length)}</p><h2 class="h-sm">${c.t}</h2>${c.body}<p class="act-fb" role="status"></p>
          <div class="row-end"><button class="btn btn-primary" id="micro-next" ${c.needClick ? 'disabled' : ''}>التالي ←</button></div></div>`;
        PR.nabti.say(i === 0 ? `لنتعرّف على ${part.name}. اضغط على الجزء المضيء.` : stripHtml(c.body).slice(0, 140), 'happy');
        if (c.needClick) {
          let wrong = 0; const t0 = performance.now();
          $$('.part', ctx.stage).forEach((g) => g.addEventListener('click', () => {
            const fb = $('.act-fb', ctx.stage);
            if (g.dataset.part === ctx.zone.part) {
              g.classList.add('picked-ok'); fb.className = 'act-fb good'; fb.textContent = `✓ أحسنت! هذا ${part.name}.`; PR.sfx.play('correct');
              if (!$('#micro-next').disabled) return;
              $('#micro-next').disabled = false; $('#micro-next').focus();
              record(ctx, { qid: `${ctx.zone.id}-micro-id`, skill: 'identify', part: ctx.zone.part, level: 1, correct: true, attempts: wrong + 1, hints: 0, timeMs: performance.now() - t0, errors: [], errorsDetail: [], zone: ctx.zone.id });
            } else { wrong++; fb.className = 'act-fb bad'; fb.textContent = `✗ هذا ${D.PARTS[g.dataset.part].name}. ابحث عن الجزء المضيء ✨`; PR.sfx.play('wrong'); }
          }));
        }
        await new Promise((res) => { $('#micro-next').onclick = res; });
      }
    },

    async explore(ctx) {
      const target = ctx.zone.part, part = D.PARTS[target];
      let wrong = 0, hints = 0; const t0 = performance.now(); const errorsDetail = [];
      const draw = (hl) => PR.art.plant({ hotspots: true, scene: true, health: 85, highlight: hl || null, title: 'نبتة تفاعلية: اضغط على أجزائها' });
      ctx.stage.innerHTML = `<div class="explore card reveal"><div class="ex-plant">${draw()}</div><div class="ex-side">
        <p class="eyebrow">🔎 استكشف</p><h2 class="h-sm">اضغط على ${part.name} ${part.icon} في النبتة</h2>
        <div class="speech-card" id="ex-info" role="status"><p class="muted">كل جزء في النبتة له دور. اضغط لتكتشف!</p></div>
        <div class="row-end"><button class="btn btn-hint sm" id="ex-hint">💡 أحتاج إلى مساعدة</button><button class="btn btn-primary" id="ex-next" disabled>التالي ←</button></div></div></div>`;
      PR.nabti.say(ctx.intro, 'happy');
      const bind = () => $$('.ex-plant .part', ctx.stage).forEach((g) => g.addEventListener('click', () => onPick(g.dataset.part)));
      let found = false;
      function onPick(pt) {
        const info = $('#ex-info', ctx.stage);
        const P2 = D.PARTS[pt];
        if (pt === target) {
          info.innerHTML = `<div class="speech-lines">${P2.speech.map((s, i) => `<p class="sl reveal" style="animation-delay:${i * .25}s">${i === 0 ? '<b>' + esc(s) + '</b>' : esc(s)}</p>`).join('')}</div>${PR.ui.speakBtn(P2.speech.join(' '))}`;
          PR.sfx.play('correct');
          if (!found) {
            found = true; $('#ex-next').disabled = false; $('#ex-next').focus();
            record(ctx, { qid: `${ctx.zone.id}-explore`, skill: 'identify', part: target, level: 1, correct: true, attempts: wrong + 1, hints, timeMs: performance.now() - t0, errors: errorsDetail.map((e) => e.errorType), errorsDetail, zone: ctx.zone.id });
            if (PR.settings.autoRead) PR.tts.speak(P2.speech.join(' '));
          }
        } else {
          if (!found) { wrong++; errorsDetail.push({ errorType: 'location-confusion', chosen: P2.name, chosenPart: pt }); }
          info.innerHTML = `<p>هذا <b>${P2.name} ${P2.icon}</b>: ${esc(P2.func)}.</p>${found ? '' : `<p class="muted">لكننا نبحث عن ${part.name}… ${esc(part.hints[Math.min(wrong, 2) - 1] || '')}</p>`}`;
          if (!found && wrong >= 2) { $('.ex-plant', ctx.stage).innerHTML = draw(target); bind(); decision(ctx, `استكشاف ${part.name}: خطآن ← إضاءة الجزء المطلوب`); }
        }
      }
      bind();
      $('#ex-hint').onclick = () => { hints++; PR.sfx.play('hint'); $('#ex-info').innerHTML = `<p>💡 ${esc(part.hints[Math.min(hints, 3) - 1])}</p>`; if (hints >= 2) { $('.ex-plant', ctx.stage).innerHTML = draw(target); bind(); } };
      await new Promise((res) => { $('#ex-next').onclick = res; });
    },

    async brief(ctx) {
      const part = D.PARTS[ctx.zone.part];
      const lines = D.ZONE_CONTENT[ctx.zone.id].brief;
      ctx.stage.innerHTML = `<div class="card brief reveal"><div class="brief-grid"><div class="brief-art">${PR.art.plant({ labels: true, highlight: ctx.zone.part, health: 95, scene: true })}</div>
        <div><p class="eyebrow">📖 شرح مختصر</p><h2 class="h-sm">${part.icon} ${part.name}: ${esc(part.func)}</h2>
        <div class="info-tiles">${lines.map((l) => `<div class="tile"><span>${l.split(' ')[0]}</span><p>${esc(l.split(' ').slice(1).join(' '))}</p></div>`).join('')}</div>
        <div class="example"><span class="ex-ic" aria-hidden="true">🫒</span><p>${esc(part.example)}</p></div>
        <div class="row-end">${PR.ui.speakBtn(lines.join(' ') + ' ' + part.example, 'استمع إلى الشرح')}<button class="btn btn-primary" id="br-next">إلى النشاط 🎮</button></div></div></div></div>`;
      PR.nabti.say(`انظر إلى البطاقات: ${part.name} ${part.func}.`, 'happy');
      $('#br-next').focus();
      await new Promise((res) => { $('#br-next').onclick = res; });
    },

    async activity(ctx) {
      const level = E.activityLevel(ctx.p.currentPath);
      PR.nabti.say(level === 1 ? 'نشاط بسيط: خذ وقتك، وأنا هنا لمساعدتك.' : level === 3 ? 'نشاط متقدم: فكّر وجرّب كالعلماء!' : 'حان وقت النشاط التفاعلي!', 'happy');
      ctx.stage.innerHTML = '<div class="card activity reveal" id="act-box"></div>';
      const r = await ACTIVITIES[ctx.zone.activity]($('#act-box'), level, ctx);
      const ra = record(ctx, { qid: `${ctx.zone.id}-activity`, activity: ctx.zone.activity, skill: 'apply', part: ctx.zone.part, level, correct: true, attempts: 1 + Math.min(r.mistakes, 4), hints: r.hints, timeMs: r.timeMs, errors: r.errorsDetail.map((e) => e.errorType), errorsDetail: r.errorsDetail, zone: ctx.zone.id });
      // سؤال «لماذا؟»
      const why = Object.assign({}, WHY[ctx.zone.id], { level: Math.min(level, 2) });
      if (ctx.p.currentPath === 'remediation') why.options = why.options.slice(0, 3);
      ctx.stage.innerHTML = '<div id="why-box"></div>';
      const resp = await PR.QuestionCard($('#why-box'), why, { path: ctx.p.currentPath, zone: ctx.zone.id, label: 'سؤال بعد النشاط', onDecision: (t) => decision(ctx, t) });
      const rw = record(ctx, resp);
      await villageStep(ctx, `${ctx.zone.id}-act`, (ra.credit + rw.credit) / 2);
    },

    async questions(ctx) {
      const path = ctx.p.currentPath;
      const plan = E.questionPlan(path);
      const pool = D.BANK.filter((q) => q.zone === ctx.zone.id);
      let state = { level: E.startLevel(path, ctx.p.partMastery[ctx.zone.part]) };
      decision(ctx, `بدء الأسئلة في «${ctx.zone.title}» بمستوى صعوبة ${state.level} (المسار: ${D.PATHS[path].name}، إتقان الجزء ${ctx.p.partMastery[ctx.zone.part]}٪)`);
      const asked = [];
      const qResps = [];
      for (let i = 0; i < plan.count; i++) {
        let q = E.pickQuestion(pool, state.level, asked);
        if (path === 'challenge' && i === plan.count - 1) { const ts = pool.find((x) => x.type === 'twostep' && !asked.includes(x.id)); if (ts) q = ts; }
        if (!q) break;
        asked.push(q.id);
        ctx.stage.innerHTML = '<div id="q-box"></div>';
        const resp = await PR.QuestionCard($('#q-box'), q, { path, zone: ctx.zone.id, label: `سؤال ${ar(i + 1)} من ${ar(plan.count)}`, onDecision: (t) => decision(ctx, t) });
        record(ctx, resp); qResps.push(resp);
        const ad = E.adaptDifficulty(state, resp, path);
        state = ad.state;
        if (ad.event === 'level-up') { PR.toast('⬆️ إجابات متتالية ممتازة! رفعنا مستوى التحدي.'); decision(ctx, `رفع مستوى الصعوبة إلى ${state.level}`); }
        if (ad.event === 'level-down') { PR.toast('🤝 سنخفف الصعوبة قليلًا لنثبّت الفكرة.'); decision(ctx, `خفض مستوى الصعوبة إلى ${state.level}`); }
      }
      await villageStep(ctx, `${ctx.zone.id}-q`, qResps.length ? qResps.reduce((s, r) => s + E.responseCredit(r), 0) / qResps.length : 1);
      if (E.shouldEnrich(qResps, path)) {
        const extra = pool.find((q) => q.level === 3 && !asked.includes(q.id));
        decision(ctx, 'إتقان متكرر ← عرض نشاط إثرائي');
        if (extra) {
          const ok = await PR.modal(`<div class="center"><div class="badge-medal">🚀</div><h2>إتقان متكرر!</h2><p>أجبت بدقة عن الأسئلة. هل تريد تحديًا إثرائيًا إضافيًا (+نقاط مضاعفة)؟</p><div class="row-end" style="justify-content:center"><button class="btn" data-close="no">لاحقًا</button><button class="btn btn-primary" data-close="yes">🚀 نعم، تحدَّني!</button></div></div>`, { label: 'تحدٍّ إثرائي' });
          if (ok === 'yes') {
            ctx.stage.innerHTML = '<div id="q-box"></div>';
            const resp = await PR.QuestionCard($('#q-box'), extra, { path: 'challenge', zone: ctx.zone.id, label: '🚀 تحدٍّ إثرائي', onDecision: (t) => decision(ctx, t) });
            const res = record(ctx, resp);
            if (resp.correct) { ctx.p.points += res.reward.points; PR.progress.save(ctx.p); PR.ui.reward({ points: res.reward.points }); }
          }
        }
      }
    },

    async reasoning(ctx) {
      const O = D.ZONE_CONTENT[ctx.zone.id].open;
      const t0 = performance.now();
      ctx.stage.innerHTML = `<div class="card reasoning reveal"><p class="eyebrow">🧠 فكّر كالعلماء · مسألة مفتوحة</p><h2 class="h-sm">${esc(O.prompt)}</h2>
        <label class="field"><span class="sr-only">إجابتك</span><textarea class="input" id="open-ans" placeholder="اكتب توقّعك وفسّره بربطه بوظيفة الجزء…"></textarea></label>
        <div class="rubric" aria-label="معايير الإجابة">${O.rubric.map((r, i) => `<span class="rb" data-i="${i}">○ ${esc(r.label)}</span>`).join('')}</div>
        <p class="act-fb" role="status"></p><div class="row-end">${PR.ui.speakBtn(O.prompt)}<button class="btn btn-primary" id="open-go">✔️ قيّم إجابتي</button></div></div>`;
      PR.nabti.say('اكتب إجابتك بكلماتك. سأتحقق من الأفكار العلمية التي ذكرتها.', 'think');
      $('#open-ans').focus();
      let attempts = 0, hints = 0;
      await new Promise((res) => {
        $('#open-go').onclick = () => {
          const txt = $('#open-ans').value.trim();
          const fb = $('.act-fb', ctx.stage);
          if (txt.length < 8) { fb.className = 'act-fb bad'; fb.textContent = 'اكتب جملة كاملة على الأقل ✍️'; return; }
          attempts++;
          const sc = E.scoreOpen(txt, O.rubric);
          sc.hits.forEach((h, i) => { const el = $(`.rb[data-i="${i}"]`, ctx.stage); el.textContent = `${h ? '✓' : '✗'} ${O.rubric[i].label}`; el.className = 'rb ' + (h ? 'hit' : 'miss'); });
          const ok = sc.score >= 0.67;
          if (ok || attempts >= 2) {
            fb.className = 'act-fb ' + (ok ? 'good' : 'neutral');
            fb.innerHTML = (ok ? '✓ تفسير علمي ممتاز! ' : '📘 قارن إجابتك بالإجابة النموذجية: ') + `<br><b>إجابة نموذجية:</b> ${esc(O.model)}`;
            PR.sfx.play(ok ? 'correct' : 'hint');
            record(ctx, { qid: `${ctx.zone.id}-open`, skill: 'explain', part: ctx.zone.part, level: 3, type: 'open', correct: ok, attempts, hints, timeMs: performance.now() - t0, errors: ok ? [] : ['partial'], errorsDetail: ok ? [] : [{ errorType: 'partial', chosen: txt.slice(0, 80) }], zone: ctx.zone.id, answerText: txt });
            $('#open-go').textContent = 'التالي ←';
            $('#open-go').onclick = (ev) => { ev.currentTarget.disabled = true; ev.currentTarget.textContent = '⏳ لحظة…'; res(); };
          } else {
            hints++;
            const miss = O.rubric.filter((_, i) => !sc.hits[i]).map((r) => r.label);
            fb.className = 'act-fb bad'; fb.textContent = `💡 إجابتك جيدة، لكن ينقصها: ${miss.join('، ')}. حسّنها وأعد التقييم.`;
            PR.sfx.play('hint');
          }
        };
      });
    },

    async summary(ctx) {
      const p = ctx.p;
      const stars = E.starsFor(ctx.credits.length ? ctx.credits : [1]);
      const score = Math.round((ctx.credits.reduce((s, x) => s + x, 0) / (ctx.credits.length || 1)) * 100);
      const { first } = PR.progress.completeZone(p, ctx.zone.id, { stars, score });
      const newBadge = PR.progress.addBadge(p, ctx.zone.badge);
      const re = E.reevaluatePath(p);
      let pathMsg = '';
      if (re.changed) {
        PR.progress.setPath(p, re.path, re.reasons, 'reevaluation');
        pathMsg = re.direction === 'up' ? `🚀 أداؤك رائع! انتقلت إلى «${D.PATHS[re.path].name}» لتحديات أكبر.` : `🤝 سننتقل إلى «${D.PATHS[re.path].name}» لنمنحك دعمًا أكثر في المنطقة القادمة.`;
      } else PR.progress.log(p, 'path', `بقي المسار «${D.PATHS[p.currentPath].name}» بعد إعادة التقييم`, { reasons: re.reasons });
      p.recommendations = E.recommendations(p);
      PR.progress.save(p);
      PR.ui.refreshStats();
      const touched = [...new Set(ctx.responses.map((r) => r.skill))];
      const hints = ctx.responses.reduce((s, r) => s + (r.hints || 0), 0);
      const attempts = ctx.responses.reduce((s, r) => s + (r.attempts || 1), 0);
      const nextZ = D.ZONES[D.ZONES.findIndex((z) => z.id === ctx.zone.id) + 1];
      ctx.stage.innerHTML = `<div class="card summary reveal"><div class="sum-top"><div class="sum-stars" aria-label="${ar(stars)} من ٣ نجوم">${'⭐'.repeat(stars)}${'<span class="dim">☆</span>'.repeat(3 - stars)}</div>
        <h2>أكملت «${ctx.zone.title}» ${ctx.zone.icon}</h2><p class="muted">النتيجة المعدّلة ${pct(score)} · المحاولات ${ar(attempts)} · التلميحات ${ar(hints)}</p></div>
        <div class="grid-2"><div><h3>📈 كيف تغيّر إتقانك؟</h3>${touched.map((s) => PR.ui.masteryBar(D.SKILLS[s].name, p.skillMastery[s], { icon: D.SKILLS[s].icon, delta: (p.skillMastery[s] ?? 0) - (ctx.before[s] ?? 0) })).join('')}
          ${PR.ui.masteryBar('إتقان ' + D.PARTS[ctx.zone.part].name, p.partMastery[ctx.zone.part], { icon: D.PARTS[ctx.zone.part].icon, delta: p.partMastery[ctx.zone.part] - ctx.beforePart })}</div>
        <div><h3>🤖 قرارات نَبْتي في هذه المنطقة</h3><ul class="decisions">${(ctx.decisions.length ? ctx.decisions : ['لم تحتج إلى دعم إضافي — أحسنت!']).slice(-6).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
          ${pathMsg ? `<p class="note">${esc(pathMsg)}</p>` : `<p class="muted">مسارك الحالي: ${PR.ui.pathBadge(p.currentPath)}</p>`}</div></div>
        <div class="row-end"><a class="btn" href="dashboard.html">📊 لوحتي</a><a class="btn btn-primary lg" href="map.html?done=${ctx.zone.id}">🗺️ ${nextZ ? 'إلى المحطة التالية: ' + nextZ.title : 'العودة إلى الخريطة'}</a></div></div>`;
      PR.sfx.play('win'); PR.fx.confetti(30);
      PR.nabti.say(pathMsg || (stars === 3 ? 'عمل مذهل! حصلت على ثلاث نجوم.' : 'أحسنت! كل منطقة تجعلك عالمًا أفضل.'), 'cheer');
      if (newBadge) setTimeout(() => PR.ui.badge(ctx.zone.badge), 800);
      if (first) PR.ui.reward({ points: 30, drops: 5 });
    },
  };

  function stripHtml(h) { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' ').trim(); }

  async function runZone(p, zone) {
    const path = p.currentPath;
    const steps = E.stepsFor(path);
    const ctx = { p, zone, stage: $('#zone-stage'), responses: [], credits: [], decisions: [], before: Object.assign({}, p.skillMastery), beforePart: p.partMastery[zone.part], intro: D.ZONE_CONTENT[zone.id].intro[path] };
    $('#zone-head').innerHTML = `<div class="zone-banner zb-${zone.id}"><span class="zb-ic" aria-hidden="true">${zone.icon}</span><div><p class="eyebrow">المنطقة ${ar(D.ZONES.indexOf(zone) + 1)} · تعلّم: ${zone.learn}</p><h1 class="h-md">${zone.title}</h1></div><span class="grow"></span>${PR.ui.pathBadge(path)}</div>`;
    const nav = $('#zone-steps');
    nav.innerHTML = steps.map((s, i) => `<li data-s="${s}"><span class="sn">${ar(i + 1)}</span> ${STEP_LABELS[s]}</li>`).join('');
    PR.progress.log(p, 'zone', `دخل «${zone.title}» (${D.PATHS[path].name}): ${steps.join(' → ')}`);
    PR.progress.save(p);
    for (let i = 0; i < steps.length; i++) {
      $$('#zone-steps li').forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('done', k < i); if (k === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      try {
        await STEPS[steps[i]](ctx);
      } catch (err) {
        // لا يتوقف الطالب أبدًا: نسجّل الخطأ ونتابع إلى الخطوة التالية (أو نُنهي المنطقة)
        PR.reportError(err, `zone:${zone.id}:${steps[i]}`);
        if (steps[i] === 'summary') {
          ctx.stage.innerHTML = `<div class="card summary center"><h2>أكملت «${zone.title}» ${zone.icon}</h2><p>حُفظ تقدّمك.</p><a class="btn btn-primary lg" href="map.html?done=${zone.id}">🗺️ العودة إلى الخريطة</a></div>`;
          if (p.zones[zone.id].status !== 'done') { PR.progress.completeZone(p, zone.id, { stars: E.starsFor(ctx.credits.length ? ctx.credits : [1]), score: 0 }); PR.progress.save(p); }
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* =================== التدريب الموجّه (من التوصيات) =================== */
  async function runTraining(p, params) {
    const skill = params.get('skill'), part = params.get('part'), forced = +params.get('level') || null;
    const path = p.currentPath;
    let pool = D.BANK.filter((q) => (skill ? q.skill === skill : true) && (part ? q.part === part : true));
    const related = { name: ['identify'], identify: ['name'], solve: ['apply', 'infer'], infer: ['solve', 'explain'], explain: ['infer', 'function'], apply: ['solve'], function: ['match'], match: ['function'] };
    if (pool.length < 5 && skill) pool = pool.concat(D.BANK.filter((q) => (related[skill] || []).includes(q.skill)));
    const title = skill ? D.SKILLS[skill].name : part ? D.PARTS[part].name : 'مراجعة عامة';
    $('#zone-head').innerHTML = `<div class="zone-banner zb-train"><span class="zb-ic" aria-hidden="true">🎯</span><div><p class="eyebrow">تدريب موجّه اقترحه نَبْتي</p><h1 class="h-md">${esc(title)}</h1></div><span class="grow"></span>${PR.ui.pathBadge(path)}</div>`;
    $('#zone-steps').innerHTML = '';
    const ctx = { p, zone: { id: 'train', title: 'تدريب', part: part || 'root' }, stage: $('#zone-stage'), responses: [], credits: [], decisions: [], before: Object.assign({}, p.skillMastery) };
    const tPart = part || (pool[0] && pool[0].part) || 'root';
    const PP = D.PARTS[tPart];
    ctx.stage.innerHTML = `<div class="card reveal"><p class="eyebrow">📖 تذكير سريع قبل التدريب</p><h2 class="h-sm">${PP.icon} ${PP.name}</h2><ul class="mini-lines">${PP.mini.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul><div class="row-end"><button class="btn btn-primary" id="tr-go">🌱 ابدأ التدريب</button></div></div>`;
    PR.nabti.say(`تدريب خاص لك على «${title}». خمسة أسئلة تتكيّف صعوبتها مع إجاباتك.`, 'happy');
    await new Promise((res) => { $('#tr-go').onclick = res; });
    let state = { level: forced || E.startLevel(path, skill ? p.skillMastery[skill] : p.partMastery[part]) };
    const asked = [];
    PR.progress.log(p, 'train', `بدأ تدريبًا موجّهًا: ${title}`);
    for (let i = 0; i < 5; i++) {
      const q = E.pickQuestion(pool, state.level, asked); if (!q) break;
      asked.push(q.id);
      ctx.stage.innerHTML = '<div id="q-box"></div>';
      const resp = await PR.QuestionCard($('#q-box'), q, { path, zone: 'train', label: `تدريب ${ar(i + 1)} من ٥`, onDecision: (t) => decision(ctx, t) });
      record(ctx, resp);
      const ad = E.adaptDifficulty(state, resp, path === 'remediation' ? 'practice' : path); state = ad.state;
      if (ad.event === 'level-up') PR.toast('⬆️ رفعنا مستوى التحدي!');
      if (ad.event === 'level-down') PR.toast('🤝 خففنا الصعوبة قليلًا.');
    }
    PR.progress.completeActivity(p, 'train-' + (skill || part || 'mix'), { score: Math.round(ctx.credits.reduce((a, b) => a + b, 0) / (ctx.credits.length || 1) * 100) });
    p.drops += 2; p.recommendations = E.recommendations(p);
    const avgCr = ctx.credits.reduce((a, b) => a + b, 0) / (ctx.credits.length || 1);
    const repaired = avgCr >= 0.6 && PR.village ? PR.village.repairTent(p) : null;
    if (repaired) { PR.progress.save(p); await PR.village.celebrate(p, repaired); }
    const re = E.reevaluatePath(p);
    if (re.changed) PR.progress.setPath(p, re.path, re.reasons, 'training');
    PR.progress.save(p); PR.ui.refreshStats();
    const skills = [...new Set(ctx.responses.map((r) => r.skill))];
    ctx.stage.innerHTML = `<div class="card summary reveal"><h2>🎯 أنهيت التدريب!</h2>${skills.map((s) => PR.ui.masteryBar(D.SKILLS[s].name, p.skillMastery[s], { icon: D.SKILLS[s].icon, delta: (p.skillMastery[s] ?? 0) - (ctx.before[s] ?? 0) })).join('')}
      ${re.changed ? `<p class="note">🧭 تغيّر مسارك إلى «${D.PATHS[re.path].name}».</p>` : ''}<div class="row-end"><a class="btn" href="dashboard.html">📊 لوحتي</a><a class="btn btn-primary" href="map.html">🗺️ الخريطة</a></div></div>`;
    PR.sfx.play('win'); PR.fx.confetti(20); PR.ui.reward({ drops: 2 });
  }

  PR.pages.zone = function () {
    const p = PR.progress.require({ diagnostic: true });
    if (!p) return;
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'train') return runTraining(p, params);
    const zone = D.ZONES.find((z) => z.id === params.get('z') && z.kind === 'part');
    if (!zone) { location.href = 'map.html'; return; }
    if (!PR.progress.isUnlocked(p, zone.id)) { location.href = 'map.html?locked=' + zone.id; return; }
    runZone(p, zone);
  };

  PR.activities = { orderActivity, rootMaze, waterJourney, leafFactory, flowerCycle };
})();
