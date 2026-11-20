/* اختبارات محرك التكيف — التشغيل: node tests/engine.test.js */
const assert = require('assert');
const E = require('../js/adaptive-engine.js');
const D = require('../js/data.js');
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('✓', name); };

const ans = (correct, attempts, hints, level, skill, extra) => Object.assign({ correct, attempts, hints, level, skill, timeMs: 15000, errors: correct && attempts === 1 ? [] : ['misconception'] }, extra);
const make = (spec) => D.DIAGNOSTIC.map((q, i) => ans(...spec[i], q.level, q.skill, { part: q.part }));

t('الاستحقاق: صحيح من أول محاولة بلا تلميح = ١', () => assert.strictEqual(E.responseCredit(ans(true, 1, 0, 2)), 1));
t('الاستحقاق: التلميحات والمحاولات تخفّض الاستحقاق', () => {
  assert.ok(E.responseCredit(ans(true, 1, 2, 2)) < E.responseCredit(ans(true, 1, 0, 2)));
  assert.ok(E.responseCredit(ans(true, 3, 0, 2)) < E.responseCredit(ans(true, 2, 0, 2)));
  assert.strictEqual(E.responseCredit(ans(false, 2, 0, 2)), 0);
});
t('الإتقان يرتفع مع الصحيح وينخفض مع الخطأ', () => {
  assert.ok(E.updateMastery(50, 1, 2) > 50);
  assert.ok(E.updateMastery(50, 0, 2) < 50);
  assert.ok(E.updateMastery(50, 0, 2, { guess: true }) > E.updateMastery(50, 0, 2));
});

const strong = make(Array(8).fill([true, 1, 0]));
const weak = make([[true, 1, 0], [false, 2, 1], [false, 2, 2], [false, 2, 2], [true, 2, 1], [false, 2, 2], [false, 2, 1], [true, 2, 2]]);
t('طالب متمكن ← المسار المتقدم', () => assert.strictEqual(E.analyzeDiagnostic(strong).path, 'challenge'));
t('طالب ضعيف ← المسار العلاجي', () => assert.strictEqual(E.analyzeDiagnostic(weak).path, 'remediation'));

// ٧٠٪ بلا تلميحات مقابل ٧٠٪ بخمسة تلميحات (المثال في المتطلبات)
const s70 = [[true, 1, 0], [true, 1, 0], [true, 1, 0], [false, 2, 0], [true, 1, 0], [true, 1, 0], [false, 2, 0], [true, 1, 0]];
const s70h = s70.map((x, i) => (x[0] && i < 5 ? [true, 1, 1] : x));
const A = E.analyzeDiagnostic(make(s70)), B = E.analyzeDiagnostic(make(s70h));
t('نفس الدرجة الخام لكن التلميحات تخفّض الإتقان المعدّل', () => { assert.strictEqual(A.raw, B.raw); assert.ok(B.adjusted < A.adjusted, `${B.adjusted} < ${A.adjusted}`); });
t('النتيجة المرتفعة مع تلميحات كثيرة لا تمنح المسار المتقدم', () => {
  const r = E.decidePath({ mastery: 85, raw: 100, hintRate: 0.6, retryRate: 0, timeRatio: 1, misconceptionRate: 0, guessRate: 0 }, {});
  assert.strictEqual(r.path, 'practice'); assert.ok(r.reasons.length >= 2);
});
t('التحليل ينتج سردًا ونقاط ضعف', () => { assert.ok(B.narrative.length > 20); const W = E.analyzeDiagnostic(weak); assert.ok(W.weaknesses.length > 0); });

t('سلّم الدعم: تلميح ← تلميح أوضح ← شرح مصغّر', () => {
  assert.deepStrictEqual([1, 2, 3, 4].map((n) => E.ladderAction('practice', n)), ['hint1', 'hint2', 'minilesson', 'eliminate']);
  assert.strictEqual(E.ladderAction('challenge', 1), 'nudge');
});
t('رفع الصعوبة بعد إجابتين ممتازتين وخفضها بعد الفشل', () => {
  let s = { level: 2 };
  s = E.adaptDifficulty(s, ans(true, 1, 0, 2), 'practice').state;
  const up = E.adaptDifficulty(s, ans(true, 1, 0, 2), 'practice');
  assert.strictEqual(up.event, 'level-up'); assert.strictEqual(up.state.level, 3);
  const down = E.adaptDifficulty(up.state, ans(false, 3, 2, 3), 'practice');
  assert.strictEqual(down.event, 'level-down');
});
t('المسار يتغير خطوة واحدة فقط عند إعادة التقييم', () => {
  const p = { currentPath: 'remediation', skillMastery: Object.fromEntries(D.SKILL_ORDER.map((s) => [s, 95])), responses: Array(6).fill(ans(true, 1, 0, 2)) };
  const r = E.reevaluatePath(p);
  assert.strictEqual(r.path, 'practice'); assert.strictEqual(r.direction, 'up');
});
t('علم الضعف root_function_matching يُسجَّل', () => {
  const p = { skillMastery: { match: 60 }, partMastery: { root: 60 }, weakFlags: {} };
  E.applyResponse(p, ans(true, 3, 1, 1, 'match', { part: 'root' }));
  assert.ok(p.weakFlags.root_function_matching >= 1);
});
t('التوصيات: الربط الضعيف ← طابق وأنقذ عند فتح المختبر', () => {
  const p = { skillMastery: Object.fromEntries(D.SKILL_ORDER.map((s) => [s, s === 'match' ? 30 : 90])), partMastery: { root: 80, stem: 80, leaf: 80, flower: 80 }, zones: { lab: { status: 'open' } } };
  const r = E.recommendations(p)[0];
  assert.strictEqual(r.skill, 'match'); assert.ok(r.href.includes('station=match'));
});
t('تقييم الإجابة المفتوحة بالكلمات المفتاحية (مع تطبيع العربية)', () => {
  const rub = D.ZONE_CONTENT.roots.open.rubric;
  assert.ok(E.scoreOpen('ستذبل النبتة لأن الجذور لا تمتص الماء', rub).score >= 0.99);
  assert.ok(E.scoreOpen('لا أعرف', rub).score === 0);
});
t('كل أسئلة البنك سليمة (إجابة صحيحة واحدة)', () => {
  D.BANK.concat(D.DIAGNOSTIC.filter((q) => q.options), D.POSTTEST.filter((q) => q.options), D.WHATIF).forEach((q) => {
    assert.strictEqual(q.options.filter((o) => o.c).length, 1, q.id);
    if (q.followup) assert.strictEqual(q.followup.options.filter((o) => o.c).length, 1, q.id + ' followup');
  });
});
t('الأرقام العربية الشرقية', () => assert.strictEqual(D.util.pct(58), '٥٨٪'));
console.log(`\n${pass} اختبارًا نجح ✔`);
