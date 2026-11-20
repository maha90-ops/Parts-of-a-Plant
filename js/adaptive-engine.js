/* =========================================================================
   adaptive-engine.js — محرك التكيف (مستقل عن الواجهة، قابل للاختبار في Node)
   ----------------------------------------------------------------------
   القرار لا يعتمد على الدرجة وحدها، بل على:
   الإجابة (صحيحة/خاطئة) + نوع الخطأ + عدد المحاولات + الوقت + التلميحات
   + مستوى الصعوبة + المهارة المقيسة.
   - responseCredit(): يحوّل الاستجابة إلى «درجة استحقاق» بين ٠ و١.
   - updateMastery(): تحديث بايزي مبسّط (Bayesian Knowledge Tracing) مخفَّف.
   - analyzeDiagnostic() / decidePath(): التشخيص واختيار المسار مع ذكر الأسباب.
   - ladderAction(): سلّم الدعم أثناء النشاط (تلميح ← تلميح أوضح ← شرح مصغر ← نشاط علاجي ← إعادة).
   - adaptDifficulty(): رفع/خفض الصعوبة. reevaluatePath(): تغيير المسار أثناء الرحلة.
   - recommendations(): نشاط علاجي / إثرائي مقترح.
   ========================================================================= */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const D = isNode ? require('./data.js') : root.PR.data;
  const E = factory(D);
  if (isNode) module.exports = E; else root.PR.engine = E;
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';
  const ar = D.util.ar, pct = D.util.pct;
  const SK = D.SKILL_ORDER;

  const CONFIG = {
    thresholds: { challenge: 80, practice: 60 },
    expectedTimeMs: { 1: 20000, 2: 30000, 3: 45000 },
    carelessMs: 2500,
    attemptPenalty: 0.3,   // لكل محاولة إضافية
    hintPenalty: 0.15,     // لكل تلميح
    slowPenalty: 0.1,      // إذا تجاوز الوقت ٢٫٥ ضعف المتوقع
    minCredit: 0.1,
    levelWeight: { 1: 1, 2: 1.25, 3: 1.5 },
    bkt: { 1: { guess: 0.3, slip: 0.05, learn: 0.12 }, 2: { guess: 0.25, slip: 0.1, learn: 0.15 }, 3: { guess: 0.15, slip: 0.15, learn: 0.18 } },
    damping: 0.6,
    guessDamping: 0.3,     // الخطأ المتسرع يؤثر أقل (قد لا يعكس الفهم)
    ladder: {
      remediation: ['hint1', 'hint2', 'minilesson'],
      practice: ['hint1', 'hint2', 'minilesson'],
      challenge: ['nudge', 'hint1', 'minilesson'],
    },
    hintPolicy: {
      remediation: { max: 3, proactive: true, label: 'دعم كامل: تلميحات تظهر تلقائيًا عند الخطأ' },
      practice: { max: 3, proactive: true, label: 'تلميحات عند الحاجة' },
      challenge: { max: 2, proactive: false, label: 'تلميحات محدودة — فكّر بنفسك أولًا' },
    },
    questionPlan: {
      remediation: { count: 3, start: 1, min: 1, max: 2 },
      practice: { count: 3, start: 2, min: 1, max: 3 },
      challenge: { count: 4, start: 2, min: 2, max: 3 },
    },
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);
  const round = Math.round;
  const joinAr = (list) => list.length <= 1 ? (list[0] || '') : list.slice(0, -1).join('، ') + ' و' + list[list.length - 1];

  /* ---------- ١) درجة الاستحقاق لاستجابة واحدة ---------- */
  function responseCredit(r) {
    if (!r || !r.correct) return 0;
    const lvl = r.level || 2;
    let c = 1 - CONFIG.attemptPenalty * Math.max(0, (r.attempts || 1) - 1) - CONFIG.hintPenalty * (r.hints || 0);
    if (r.timeMs && r.timeMs > CONFIG.expectedTimeMs[lvl] * 2.5) c -= CONFIG.slowPenalty;
    return clamp(c, CONFIG.minCredit, 1);
  }

  function classifyError(timeMs, option) {
    if (timeMs != null && timeMs < CONFIG.carelessMs) return 'guess';
    return (option && option.e) || 'misconception';
  }

  /* ---------- ٢) تحديث الإتقان (BKT مخفّف) ---------- */
  function updateMastery(masteryPct, credit, level, opts) {
    const P = CONFIG.bkt[level || 2];
    const pL = clamp((masteryPct == null ? 50 : masteryPct) / 100, 0.02, 0.98);
    const pc = (pL * (1 - P.slip)) / (pL * (1 - P.slip) + (1 - pL) * P.guess);
    const pw = (pL * P.slip) / (pL * P.slip + (1 - pL) * (1 - P.guess));
    const post = credit * pc + (1 - credit) * pw;
    const learned = post + (1 - post) * P.learn * (0.5 + 0.5 * credit);
    const damp = opts && opts.guess ? CONFIG.guessDamping : CONFIG.damping;
    return clamp(round(pL * 100 + damp * (learned * 100 - pL * 100)), 0, 100);
  }

  /** يطبّق استجابة على ملف الطالب (يعدّله) ويعيد ملخص التغيير */
  function applyResponse(profile, r) {
    const credit = responseCredit(r);
    const guess = (r.errors || []).length > 0 && (r.errors || []).every((e) => e === 'guess');
    const before = profile.skillMastery[r.skill] ?? 50;
    const after = updateMastery(before, credit, r.level, { guess });
    profile.skillMastery[r.skill] = after;
    if (r.part && profile.partMastery && r.part in profile.partMastery) {
      profile.partMastery[r.part] = updateMastery(profile.partMastery[r.part], credit, r.level, { guess });
    }
    const flags = [];
    if (credit < 0.6 && r.part) {
      const flag = `${r.part}_${D.SKILLS[r.skill].code}`;
      flags.push(flag);
      profile.weakFlags = profile.weakFlags || {};
      profile.weakFlags[flag] = (profile.weakFlags[flag] || 0) + 1;
    }
    return { credit, before, after, delta: after - before, flags };
  }

  function overallMastery(profile) {
    const vals = SK.map((s) => profile.skillMastery[s]).filter((v) => v != null);
    return round(avg(vals));
  }

  /* ---------- ٣) تحليل الاختبار التشخيصي ---------- */
  function analyzeDiagnostic(answers) {
    const bySkill = {};
    answers.forEach((a) => { (bySkill[a.skill] = bySkill[a.skill] || []).push(responseCredit(a)); });
    const skillScores = {};
    SK.forEach((s) => { skillScores[s] = bySkill[s] ? round(avg(bySkill[s]) * 100) : null; });

    const n = answers.length || 1;
    const firstTry = answers.filter((a) => a.correct && a.attempts === 1).length;
    const eventually = answers.filter((a) => a.correct).length;
    const raw = round((eventually / n) * 100);
    let wSum = 0, wTot = 0;
    answers.forEach((a) => { const w = CONFIG.levelWeight[a.level || 2]; wSum += responseCredit(a) * w; wTot += w; });
    const adjusted = round((wSum / (wTot || 1)) * 100);

    const hints = answers.reduce((s, a) => s + (a.hints || 0), 0);
    const retries = answers.filter((a) => (a.attempts || 1) > 1).length;
    const allErrors = answers.flatMap((a) => a.errors || []);
    const errorCounts = {};
    allErrors.forEach((e) => { errorCounts[e] = (errorCounts[e] || 0) + 1; });
    const timeRatio = avg(answers.map((a) => (a.timeMs || 0) / CONFIG.expectedTimeMs[a.level || 2]));
    const metrics = {
      mastery: adjusted, raw, firstTryRate: firstTry / n, hintRate: hints / n, retryRate: retries / n,
      timeRatio, misconceptionRate: (errorCounts['misconception'] || 0) / n,
      confusionRate: ((errorCounts['function-confusion'] || 0) + (errorCounts['part-confusion'] || 0)) / n,
      guessRate: (errorCounts['guess'] || 0) / n, hints, retries, errorCounts,
    };
    const decision = decidePath(metrics, skillScores);
    const ordered = SK.filter((s) => skillScores[s] != null);
    const strengths = ordered.filter((s) => skillScores[s] >= 75).sort((a, b) => skillScores[b] - skillScores[a]);
    const weaknesses = ordered.filter((s) => skillScores[s] < 60).sort((a, b) => skillScores[a] - skillScores[b]);
    const initialMastery = {};
    SK.forEach((s) => { initialMastery[s] = skillScores[s] == null ? adjusted : round(0.7 * skillScores[s] + 0.3 * adjusted); });
    // إتقان الأجزاء الأولي من الأسئلة المرتبطة بكل جزء
    const partMastery = {};
    D.MAIN_PARTS.forEach((p) => {
      const rel = answers.filter((a) => a.part === p);
      partMastery[p] = rel.length ? round(0.6 * avg(rel.map(responseCredit)) * 100 + 0.4 * adjusted) : adjusted;
    });
    const narrative = buildNarrative(skillScores, strengths, weaknesses, metrics);
    return { skillScores, raw, adjusted, metrics, path: decision.path, reasons: decision.reasons, strengths, weaknesses, initialMastery, partMastery, narrative };
  }

  function buildNarrative(scores, strengths, weaknesses, m) {
    const nm = (s) => D.SKILLS[s].name;
    let text = '';
    if (strengths.length && weaknesses.length) text = `أظهرت النتائج إتقانًا جيدًا في ${joinAr(strengths.slice(0, 3).map(nm))}، مع الحاجة إلى دعم في ${joinAr(weaknesses.slice(0, 3).map(nm))}.`;
    else if (strengths.length) text = `أظهرت النتائج إتقانًا جيدًا في معظم المهارات، وأبرزها ${joinAr(strengths.slice(0, 3).map(nm))}.`;
    else if (weaknesses.length) text = `تحتاج المهارات الأساسية إلى بناء تدريجي، وخاصة ${joinAr(weaknesses.slice(0, 3).map(nm))}.`;
    else text = 'أظهرت النتائج مستوى متوسطًا ومتوازنًا في المهارات.';
    if (m.hints > 0 && m.raw - m.mastery >= 5) text += ` استُخدم ${ar(m.hints)} من التلميحات، لذلك عُدّل مستوى الإتقان من ${pct(m.raw)} إلى ${pct(m.mastery)}.`;
    if (m.confusionRate >= 0.25) text += ' تكرر الخلط بين أجزاء النبات ووظائفها.';
    return text;
  }

  /* ---------- ٤) اختيار المسار (مع أسباب قابلة للتفسير) ---------- */
  function decidePath(m, skillScores) {
    const T = CONFIG.thresholds;
    const reasons = [];
    let path = m.mastery >= T.challenge ? 'challenge' : m.mastery >= T.practice ? 'practice' : 'remediation';
    reasons.push(`الإتقان المعدّل ${pct(m.mastery)} (الدرجة الخام ${pct(m.raw)}).`);
    if (path === 'challenge' && (m.hintRate > 0.3 || m.retryRate > 0.3)) {
      path = 'practice'; reasons.push('النتيجة مرتفعة، لكنها اعتمدت على التلميحات أو المحاولات المتكررة؛ لذلك نحتاج إلى تثبيت المفاهيم أولًا.');
    }
    if (path === 'practice' && (m.hintRate > 0.6 || m.misconceptionRate > 0.4)) {
      path = 'remediation'; reasons.push('كثرة التلميحات أو المفاهيم الخاطئة تشير إلى حاجة إلى دعم بخطوات صغيرة.');
    }
    if (path === 'practice' && m.hintRate === 0 && m.retryRate === 0 && m.mastery >= 72 && m.timeRatio <= 1) {
      path = 'challenge'; reasons.push('الإجابات مستقلة تمامًا (بلا تلميحات أو محاولات إضافية) وبسرعة مناسبة؛ لذلك نرفع التحدي.');
    }
    if (skillScores) {
      const core = Math.min(skillScores.function ?? 100, skillScores.match ?? 100);
      if (path === 'challenge' && core < 50) { path = 'practice'; reasons.push('مهارة أساسية (الوظائف أو الربط) ما زالت ضعيفة.'); }
    }
    if (path === 'remediation' && m.guessRate >= 0.375) reasons.push('بعض الإجابات كانت متسرعة جدًا؛ سنشجّع التمهّل والتفكير.');
    return { path, reasons };
  }

  /* ---------- ٥) سلّم الدعم أثناء النشاط ---------- */
  function ladderAction(path, wrongCount) {
    const L = CONFIG.ladder[path] || CONFIG.ladder.practice;
    if (wrongCount <= 0) return 'none';
    if (wrongCount <= L.length) return L[wrongCount - 1];
    return 'eliminate';
  }
  function hintPolicy(path) { return CONFIG.hintPolicy[path] || CONFIG.hintPolicy.practice; }

  /* ---------- ٦) تكييف الصعوبة ---------- */
  function adaptDifficulty(state, resp, path) {
    const plan = CONFIG.questionPlan[path] || CONFIG.questionPlan.practice;
    const s = Object.assign({ level: plan.start, streak: 0, wrongStreak: 0 }, state);
    const credit = responseCredit(resp);
    let event = null;
    if (credit >= 0.85) {
      s.streak += 1; s.wrongStreak = 0;
      if (s.streak >= 2 && s.level < plan.max) { s.level += 1; s.streak = 0; event = 'level-up'; }
    } else if (credit < 0.5) {
      s.wrongStreak += 1; s.streak = 0;
      if (s.level > plan.min) { s.level -= 1; event = 'level-down'; }
    } else { s.streak = 0; }
    return { state: s, event };
  }

  function startLevel(path, partMastery) {
    const plan = CONFIG.questionPlan[path] || CONFIG.questionPlan.practice;
    let lvl = plan.start;
    if (partMastery != null) {
      if (partMastery >= 80) lvl += 1;
      else if (partMastery < 45) lvl -= 1;
    }
    return clamp(lvl, plan.min, plan.max);
  }

  function pickQuestion(pool, level, askedIds) {
    const fresh = pool.filter((q) => !askedIds.includes(q.id));
    if (!fresh.length) return null;
    for (const d of [0, -1, 1, -2, 2]) {
      const c = fresh.filter((q) => q.level === level + d);
      if (c.length) return c[Math.floor(Math.random() * c.length)];
    }
    return fresh[0];
  }

  /** هل يستحق الطالب نشاطًا إثرائيًا؟ (إتقان متكرر) */
  function shouldEnrich(responses, path) {
    const last = responses.slice(-3);
    return path !== 'remediation' && last.length === 3 && last.every((r) => responseCredit(r) >= 0.85 && (r.level || 1) >= 2);
  }

  /* ---------- ٧) خطوات المنطقة حسب المسار ---------- */
  function stepsFor(path) {
    if (path === 'remediation') return ['micro', 'activity', 'questions', 'summary'];
    if (path === 'challenge') return ['explore', 'activity', 'questions', 'reasoning', 'summary'];
    return ['explore', 'brief', 'activity', 'questions', 'summary'];
  }
  function activityLevel(path) { return path === 'remediation' ? 1 : path === 'challenge' ? 3 : 2; }
  function questionPlan(path) { return CONFIG.questionPlan[path] || CONFIG.questionPlan.practice; }

  /* ---------- ٨) إعادة تقييم المسار أثناء الرحلة ---------- */
  function reevaluatePath(profile) {
    const m = overallMastery(profile);
    const recent = (profile.responses || []).slice(-8);
    const hintRate = recent.length ? avg(recent.map((r) => r.hints || 0)) : 0;
    const firstTry = recent.length ? recent.filter((r) => r.correct && r.attempts === 1).length / recent.length : 0;
    const order = ['remediation', 'practice', 'challenge'];
    const cur = order.indexOf(profile.currentPath);
    let target = m >= CONFIG.thresholds.challenge ? 2 : m >= CONFIG.thresholds.practice ? 1 : 0;
    const reasons = [`الإتقان العام الحالي ${pct(m)}.`];
    if (target === 2 && hintRate > 0.5) { target = 1; reasons.push('ما زال الاعتماد على التلميحات مرتفعًا.'); }
    if (recent.length >= 4 && firstTry >= 0.8 && target <= cur) { target = Math.min(2, cur + 1); reasons.push(`أجبت عن ${pct(firstTry * 100)} من الأسئلة الأخيرة من المحاولة الأولى.`); }
    if (recent.length >= 4 && firstTry < 0.35 && target >= cur) { target = Math.max(0, cur - 1); reasons.push('الأسئلة الأخيرة احتاجت إلى محاولات كثيرة.'); }
    // تغيير تدريجي: خطوة واحدة فقط في كل مرة
    const next = target > cur ? cur + 1 : target < cur ? cur - 1 : cur;
    return { path: order[next], changed: next !== cur, direction: next > cur ? 'up' : next < cur ? 'down' : 'same', mastery: m, reasons };
  }

  /* ---------- ٩) التوصيات ---------- */
  function weakestSkills(profile, limit) {
    return SK.map((s) => ({ s, v: profile.skillMastery[s] ?? 0 })).sort((a, b) => a.v - b.v).slice(0, limit || 3);
  }
  function weakParts(profile) {
    return D.MAIN_PARTS.map((p) => ({ p, v: (profile.partMastery || {})[p] ?? 50 })).sort((a, b) => a.v - b.v);
  }
  function recommendations(profile) {
    const recs = [];
    const labOpen = profile.zones && profile.zones.lab && profile.zones.lab.status !== 'locked';
    const weak = weakestSkills(profile, 3).filter((x) => x.v < 70);
    const wp = weakParts(profile)[0];
    weak.forEach(({ s, v }) => {
      let href = `zone.html?mode=train&skill=${s}`, title = `تدريب موجّه: ${D.SKILLS[s].name}`;
      if (s === 'match' && labOpen) { href = 'plant-lab.html?station=match'; title = 'النشاط العلاجي: طابق وأنقذ'; }
      else if ((s === 'infer' || s === 'explain') && labOpen) { href = 'plant-lab.html?station=whatif'; title = 'نشاط: ماذا يحدث لو؟'; }
      recs.push({ type: 'remedial', skill: s, value: v, title, href,
        text: s === 'match' ? 'تحتاج إلى تدريب إضافي على ربط أجزاء النبات بوظائفها.' : `تحتاج إلى تدريب إضافي على ${D.SKILLS[s].name}.` });
    });
    if (wp && wp.v < 60) recs.push({ type: 'remedial', part: wp.p, value: wp.v, title: `مراجعة: ${D.PARTS[wp.p].name}`, href: `zone.html?mode=train&part=${wp.p}`, text: `راجع وظيفة ${D.PARTS[wp.p].name} (${pct(wp.v)}).` });
    if (!weak.length) recs.push({ type: 'enrich', title: 'تحدٍّ إثرائي: حل المشكلات', href: 'zone.html?mode=train&skill=solve&level=3', text: 'مستواك ممتاز! جرّب مشكلات أصعب.' });
    return recs;
  }

  /* ---------- ١٠) تقييم الإجابات المفتوحة (كلمات مفتاحية) ---------- */
  function normalizeAr(s) {
    return String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();
  }
  function scoreOpen(text, rubric) {
    const t = normalizeAr(text);
    const hits = rubric.map((r) => r.any.some((k) => t.includes(normalizeAr(k))));
    return { score: hits.filter(Boolean).length / rubric.length, hits };
  }

  /* ---------- ١١) المستوى والمكافآت ---------- */
  function levelFor(points) {
    let cur = D.LEVELS[0], next = null;
    D.LEVELS.forEach((l, i) => { if (points >= l.min) { cur = l; next = D.LEVELS[i + 1] || null; } });
    const progress = next ? (points - cur.min) / (next.min - cur.min) : 1;
    return { ...cur, index: D.LEVELS.indexOf(cur) + 1, next, progress: clamp(progress, 0, 1) };
  }
  function rewardFor(resp) {
    const credit = responseCredit(resp);
    if (!resp.correct) return { points: 0, seeds: 0 };
    return { points: round(10 * (resp.level || 1) * credit) + 2, seeds: credit >= 0.85 ? 1 : 0 };
  }
  function starsFor(credits) {
    const a = avg(credits);
    return a >= 0.85 ? 3 : a >= 0.6 ? 2 : 1;
  }
  function masteryLabel(v) {
    return v >= 85 ? 'متقن' : v >= 70 ? 'جيد' : v >= 50 ? 'قيد البناء' : 'يحتاج دعمًا';
  }

  return {
    CONFIG, responseCredit, classifyError, updateMastery, applyResponse, overallMastery,
    analyzeDiagnostic, decidePath, ladderAction, hintPolicy, adaptDifficulty, startLevel, pickQuestion,
    shouldEnrich, stepsFor, activityLevel, questionPlan, reevaluatePath, weakestSkills, weakParts,
    recommendations, normalizeAr, scoreOpen, levelFor, rewardFor, starsFor, masteryLabel, joinAr,
  };
});
