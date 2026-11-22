/* =========================================================================
   question-card.js — بطاقة السؤال التكيفية (مكوّن مشترك)
   تنفّذ: نظام التلميحات (٣ مستويات) + سلّم الدعم من المحرك
   (تلميح ← تلميح أوضح ← شرح مصغّر ← نشاط علاجي ← إعادة المحاولة)
   وتسجّل: المحاولات، والوقت، والتلميحات، ونوع كل خطأ.
   ========================================================================= */
(function (root) {
  'use strict';
  const PR = root.PR;
  const D = PR.data, E = PR.engine;
  const { $, $$, esc, shuffle, ar } = PR.util;
  const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

  function hintsFor(q) {
    if (q.hints && q.hints.length) return q.hints;
    return (D.PARTS[q.part] && D.PARTS[q.part].hints) || ['فكّر في وظيفة كل جزء من أجزاء النبات.'];
  }

  function wrongFeedback(opt) {
    const et = D.ERROR_TYPES[opt.e] || D.ERROR_TYPES.misconception;
    let t = et.fb;
    if (opt.e === 'function-confusion' && opt.p && D.PARTS[opt.p]) t += ` (هذه من وظائف ${D.PARTS[opt.p].name}).`;
    if (opt.e === 'part-confusion' && opt.p && D.PARTS[opt.p]) t += ` ${D.PARTS[opt.p].name} له وظيفة مختلفة.`;
    return t;
  }

  /**
   * @returns Promise<response>
   * opts: path, ladder(bool), maxAttempts, maxHints, label, zone, activity, onDecision(text), revealModel
   */
  function QuestionCard(container, q, opts) {
    opts = Object.assign({ path: 'practice', ladder: true, maxAttempts: Infinity, label: '' }, opts || {});
    // تحدّي البازل: في المحطة النشطة يظهر سطر «ماذا سيحدث» ورسالة النتيجة، وتطير القطعة لحظة الإجابة
    if (!opts.stakes && opts.zone && PR.puzzle && PR.puzzle.isActive(opts.zone)) opts = Object.assign({}, PR.puzzle.cardOpts(opts.zone), opts);
    const policy = E.hintPolicy(opts.path);
    const maxHints = opts.maxHints != null ? opts.maxHints : policy.max;
    const hints = hintsFor(q);
    const t0 = performance.now();
    let lastT = t0;
    const st = { attempts: 0, wrong: 0, hints: 0, autoHints: 0, errors: [], errorsDetail: [], stage: 1, done: false, miniShown: false };
    const isTwo = q.type === 'twostep' && q.followup;
    const sk = D.SKILLS[q.skill] || { short: '', icon: '' };
    const lvlDots = '●'.repeat(q.level || 1) + '○'.repeat(3 - (q.level || 1));

    return new Promise((resolve) => {
      container.innerHTML = `<article class="qcard card" aria-labelledby="qp-${q.id}">
        <div class="q-head">
          ${opts.label ? `<span class="q-num">${esc(opts.label)}</span>` : ''}
          ${(() => { const T = (D.THINK_LEVELS || {})[q.skill]; return T ? `<span class="think-tag lv${T.n}" title="مستوى التفكير">🧠 المستوى ${ar(T.n)}: ${T.t}</span>` : ''; })()}
          ${(D.THINK_LEVELS || {})[q.skill] ? '' : `<span class="skill-tag" title="المهارة المقيسة">${sk.icon} ${esc(sk.short)}</span>`}
          <span class="lvl-tag" title="مستوى الصعوبة" aria-label="مستوى الصعوبة ${ar(q.level || 1)} من ٣">${lvlDots}</span>
          <span class="grow"></span>${PR.ui.speakBtn(q.prompt, 'استمع إلى السؤال')}
        </div>
        <h3 class="q-prompt" id="qp-${q.id}">${esc(q.prompt)}</h3>
        ${opts.stakes ? `<p class="q-stakes">${opts.stakes}</p>` : ''}
        <div class="q-visual"></div>
        <div class="q-options" role="group" aria-label="الخيارات"></div>
        <div class="q-stage2" hidden></div>
        <div class="q-feedback" role="status" aria-live="polite"></div>
        <div class="q-mini" hidden></div>
        <div class="q-support">
          <button class="btn btn-hint" type="button">💡 أحتاج إلى مساعدة <span class="hint-count">(${ar(0)}/${ar(maxHints)})</span></button>
          <ol class="hint-list" aria-label="التلميحات"></ol>
        </div>
        <div class="q-actions"><button class="btn btn-primary q-next" type="button" hidden>التالي ←</button></div>
      </article>`;
      const card = $('.qcard', container);
      card._q = q; // يُستخدم في الاختبارات الآلية
      const optBox = $('.q-options', card), fbBox = $('.q-feedback', card), hintBtn = $('.btn-hint', card), hintList = $('.hint-list', card), nextBtn = $('.q-next', card);
      if (maxHints <= 0) $('.q-support', card).hidden = true;

      // ---- العرض البصري ----
      const vis = $('.q-visual', card);
      if (q.type === 'hotspot') {
        vis.innerHTML = PR.art.plant({ hotspots: true, health: 85, title: 'اختر الجزء المطلوب من النبتة' });
        vis.classList.add('hotspot-wrap');
        optBox.hidden = true;
        $$('.part', vis).forEach((g) => g.addEventListener('click', () => onHotspot(g)));
      } else if (q.visual) {
        vis.innerHTML = PR.art.plant(Object.assign({ health: 85, title: 'صورة توضيحية' }, q.visual));
        vis.classList.add('small');
      } else vis.remove();

      // ---- الخيارات ----
      function renderOptions(box, options, stage) {
        box.innerHTML = '';
        shuffle(options).forEach((o, i) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'opt';
          b.innerHTML = `<span class="opt-l" aria-hidden="true">${LETTERS[i]}</span><span class="opt-t">${esc(o.t)}</span><span class="opt-mark" aria-hidden="true"></span>`;
          b.setAttribute('aria-label', `${LETTERS[i]}: ${o.t}`);
          b._opt = o;
          b.onclick = () => choose(b, o, stage);
          box.appendChild(b);
        });
      }
      if (q.type !== 'hotspot') renderOptions(optBox, q.options, 1);

      // ---- التلميحات ----
      function revealHint(auto) {
        if (st.hints >= Math.min(maxHints, hints.length)) return false;
        const i = st.hints;
        st.hints++; if (auto) st.autoHints++;
        const li = document.createElement('li');
        li.className = 'hint pop';
        li.innerHTML = `<b>تلميح ${ar(i + 1)}:</b> ${esc(hints[i])} ${PR.ui.speakBtn(hints[i], 'استمع إلى التلميح')}`;
        hintList.appendChild(li);
        $('.hint-count', card).textContent = `(${ar(st.hints)}/${ar(maxHints)})`;
        if (st.hints >= Math.min(maxHints, hints.length)) hintBtn.disabled = true;
        PR.sfx.play('hint');
        PR.nabti.say(hints[i], 'think');
        return true;
      }
      hintBtn.onclick = () => { lastT = performance.now(); if (!revealHint(false)) PR.toast('استخدمت كل التلميحات المتاحة.'); };

      // ---- معالجة الإجابة ----
      function feedback(html, cls) { fbBox.className = 'q-feedback ' + (cls || ''); fbBox.innerHTML = html; }

      function onCorrect(btn, stage) {
        st.attempts++;
        if (btn) { btn.classList.add('correct'); $('.opt-mark', btn).textContent = '✓'; }
        PR.sfx.play('correct');
        if (isTwo && stage === 1) {
          lockAll(optBox);
          feedback('✓ توقّع صحيح! الآن فسّر: لماذا؟', 'good');
          const s2 = $('.q-stage2', card);
          s2.hidden = false;
          s2.innerHTML = `<h4 class="q-prompt2">🔎 ${esc(q.followup.prompt)}</h4><div class="q-options q-options2" role="group" aria-label="خيارات التفسير"></div>`;
          st.stage = 2;
          renderOptions($('.q-options2', s2), q.followup.options, 2);
          $('.q-options2 .opt', s2).focus();
          return;
        }
        finish(true);
      }

      function onWrong(btn, opt, stage) {
        st.attempts++; st.wrong++;
        const now = performance.now();
        const et = E.classifyError(now - lastT, opt);
        st.errors.push(et);
        st.errorsDetail.push({ errorType: et, chosen: opt.t || opt.label, chosenPart: opt.p || null, stage });
        if (btn) { btn.classList.add('wrong'); btn.disabled = true; $('.opt-mark', btn).textContent = '✗'; PR.fx.shake(btn); }
        PR.sfx.play('wrong');
        // تغذية راجعة تعليمية وإيجابية: الأولى «فكّر مرة أخرى»، الثانية «تذكّر»، ثم شرح مصغّر
        const P = D.PARTS[q.part] || null;
        const about = opt.p && D.PARTS[opt.p] && opt.p !== q.part ? ` (${esc(opt.t || '').replace(/^[^؀-ۿ]+/, '')} ليس الجزء المطلوب هنا.)` : '';
        let msg;
        if (et === 'guess') msg = '⏳ خذ وقتك… اقرأ السؤال مرة أخرى بهدوء، ثم اختر.';
        else if (st.wrong === 1) msg = `💡 فكّر مرة أخرى… ${esc(hints[0])}${about}`;
        else if (st.wrong === 2) msg = `🌱 تذكّر: ${esc(P ? P.mini.tip : (hints[1] || hints[0]))}`;
        else msg = `🌱 اقتربت! ${esc(wrongFeedback(opt))}`;
        feedback(msg, 'try');
        if (PR.lulu) PR.lulu.react('wrong');

        if (!opts.ladder) {
          if (st.attempts >= opts.maxAttempts) {
            feedback('لا بأس! 🌱 سنتعلّم هذا معًا خلال الرحلة.', 'neutral');
            finish(false);
          } else {
            feedback(msg + ' <b>لديك محاولة أخرى.</b>', 'try');
            PR.nabti.say('حاول مرة أخرى، يمكنك طلب تلميح إن احتجت.', 'think');
          }
          return;
        }
        const action = E.ladderAction(opts.path, st.wrong);
        if (opts.onDecision && action !== 'none') opts.onDecision(`سؤال ${q.id}: خطأ رقم ${st.wrong} ← ${({ nudge: 'تشجيع على التفكير', hint1: 'تلميح بسيط', hint2: 'تلميح أوضح', minilesson: 'شرح مصغّر ثم نشاط علاجي', eliminate: 'حذف الخيارات الخاطئة' })[action] || action}`);
        if (action === 'nudge') PR.nabti.say('فكّر مرة أخرى كالعلماء… ما وظيفة كل جزء؟', 'think');
        else if (action === 'hint1' || action === 'hint2') {
          if (!revealHint(true)) PR.nabti.say('راجع التلميحات بالأسفل ثم حاول مجددًا.', 'think');
        } else if (action === 'minilesson' && !st.miniShown) miniLesson(stage);
        else PR.nabti.say('أنت قريب! استبعد الخيارات الخاطئة وفكّر في الباقي.', 'think');
        lastT = performance.now();
      }

      function choose(btn, opt, stage) {
        if (st.done) return;
        if (opt.c) onCorrect(btn, stage); else onWrong(btn, opt, stage);
        lastT = performance.now();
      }

      function onHotspot(g) {
        if (st.done) return;
        const part = g.dataset.part;
        if (part === q.target) {
          g.classList.add('picked-ok');
          feedback(`✓ صحيح! هذا هو ${esc(D.PARTS[part].name)}.`, 'good');
          onCorrect(null, 1);
        } else {
          g.classList.add('picked-bad');
          setTimeout(() => g.classList.remove('picked-bad'), 900);
          onWrong(null, { t: D.PARTS[part].name, e: 'location-confusion', p: part }, 1);
          if (!st.done) feedback(`✗ هذا ${esc(D.PARTS[part].name)}. ${esc(D.ERROR_TYPES['location-confusion'].fb)}`, 'bad');
        }
      }

      // ---- الشرح المصغّر + النشاط العلاجي + إعادة المحاولة ----
      function miniLesson(stage) {
        st.miniShown = true;
        const part = D.PARTS[q.part] || D.PARTS.root;
        const box = $('.q-mini', card);
        box.hidden = false;
        lockAll(card);
        PR.nabti.say('لنتوقف لحظة ونراجع الفكرة معًا بشرح قصير.', 'concern');
        box.innerHTML = `<div class="mini card-inner"><p class="eyebrow">📖 شرح مصغّر</p><h4>${part.icon} ${esc(part.name)}</h4>
          <ul class="mini-lines">${part.mini.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul><p class="tip">💡 ${esc(part.mini.tip)}</p>
          <div class="row-end">${PR.ui.speakBtn(part.mini.lines.join(' ') + ' ' + part.mini.tip, 'استمع إلى الشرح')}<button class="btn btn-primary mini-go" type="button">فهمت، لنتدرّب 🎮</button></div></div>`;
        $('.mini-go', box).focus();
        $('.mini-go', box).onclick = () => remedial(box, stage);
      }
      function remedial(box, stage) {
        const part = D.PARTS[q.part] || D.PARTS.root;
        const rq = part.remedial[0] || { prompt: `أين يوجد ${part.name}؟`, options: [{ t: part.location, c: 1 }, { t: 'في الهواء فوق النبات', e: 'location-confusion' }] };
        box.innerHTML = `<div class="mini card-inner"><p class="eyebrow">🎮 نشاط علاجي سريع</p><h4>${esc(rq.prompt)}</h4><div class="q-options two"></div><p class="mini-fb" role="status"></p></div>`;
        const ob = $('.q-options', box);
        rq.options.forEach((o) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'opt big'; b._opt = o; b.innerHTML = `<span class="opt-t">${esc(o.t)}</span><span class="opt-mark" aria-hidden="true"></span>`;
          b.onclick = () => {
            if (o.c) {
              b.classList.add('correct'); $('.opt-mark', b).textContent = '✓'; PR.sfx.play('correct');
              $('.mini-fb', box).textContent = '✓ ممتاز! الآن عُد إلى السؤال الأصلي وحاول مجددًا 🔁';
              if (opts.onDecision) opts.onDecision(`نشاط علاجي سريع عن ${part.name}: نجح ← إعادة المحاولة`);
              setTimeout(() => { box.hidden = true; retry(stage); }, 900);
            } else {
              b.classList.add('wrong'); b.disabled = true; $('.opt-mark', b).textContent = '✗'; PR.sfx.play('wrong');
              $('.mini-fb', box).textContent = '✗ ' + part.hints[2];
              st.errors.push('part-confusion');
            }
          };
          ob.appendChild(b);
        });
        $('.opt', ob).focus();
      }
      function retry(stage) {
        feedback('🔁 إعادة المحاولة: اقرأ السؤال مرة أخرى بهدوء.', 'neutral');
        if (q.type === 'hotspot') { unlock(card); return; }
        const box = stage === 2 ? $('.q-options2', card) : optBox;
        renderOptions(box, stage === 2 ? q.followup.options : q.options, stage);
        unlock(card);
        const first = $('.opt', box); if (first) first.focus();
      }
      function lockAll(scope) { $$('.opt', scope).forEach((b) => { b.disabled = true; }); if (scope === card) card.classList.add('locked'); }
      function unlock(scope) { $$('.opt', scope).forEach((b) => { if (!b.classList.contains('wrong') && !b.classList.contains('correct')) b.disabled = false; }); card.classList.remove('locked'); }

      // ---- الإنهاء ----
      function finish(correct) {
        st.done = true;
        lockAll(card);
        hintBtn.disabled = true;
        const timeMs = Math.round(performance.now() - t0);
        const resp = {
          qid: q.id, skill: q.skill, part: q.part, level: q.level || 1, type: q.type || 'mcq',
          correct, attempts: Math.max(1, st.attempts - (isTwo ? 1 : 0)), hints: st.hints, autoHints: st.autoHints,
          timeMs, errors: st.errors, errorsDetail: st.errorsDetail, zone: opts.zone || q.zone || null, activity: opts.activity || null,
        };
        resp.firstTry = correct && st.wrong === 0;
        if (correct) {
          const credit = E.responseCredit(resp);
          const praise = credit >= 0.85 ? '🎉 أحسنت!' : credit >= 0.55 ? '🎉 أحسنت!' : '💪 وصلت إلى الإجابة الصحيحة!';
          feedback(`✓ ${praise} ${esc(q.explain || (D.PARTS[q.part] ? D.PARTS[q.part].name + ': ' + D.PARTS[q.part].func + '.' : ''))}`, 'good');
          if (PR.lulu) PR.lulu.react('correct');
          PR.nabti.say(credit >= 0.85 ? 'رائع! تفكيرك علمي ودقيق.' : 'أحسنت لأنك لم تستسلم! المحاولة جزء من التعلم.', 'cheer');
          PR.fx.pop(card);
        }
        // مراجعة الإجابة الصحيحة عند انتهاء المحاولات (في مركز الإنقاذ)
        if (!correct && opts.revealOnFail) {
          $$('.opt', card).filter((b) => b._opt && b._opt.c && !b.closest('.q-mini')).forEach((b) => { b.classList.add('reveal-ok'); $('.opt-mark', b).textContent = '✓'; });
        }
        // نتيجة الإجابة في التحدّي (مثل: أُزيلت خيمة وبُني بيت) تحلّ محل التغذية العامة
        if (opts.consequence) { const c = opts.consequence(resp); if (c) feedback(c.html, c.cls); }
        const fact = q.fact || opts.fact || (D.FACTS && D.FACTS[q.id]);
        if (fact) fbBox.insertAdjacentHTML('afterend', `<p class="fact"><b>معلومة من بلادنا:</b> ${esc(fact)}</p>`);
        if (opts.onFinish) { try { opts.onFinish(resp); } catch (e) { console.error(e); } }
        nextBtn.hidden = false;
        nextBtn.textContent = opts.nextLabel || 'التالي ←';
        nextBtn.focus();
        nextBtn.onclick = () => { nextBtn.hidden = true; resolve(resp); };
      }
    });
  }

  PR.QuestionCard = QuestionCard;
})(typeof self !== 'undefined' ? self : this);
