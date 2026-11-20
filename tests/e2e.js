/* =========================================================================
   e2e.js — اختبار شامل لجميع المسارات في متصفح حقيقي (Playwright)
   يلعب «طالب آلي» الرحلة كاملة بثلاثة أنماط أداء: strong / mid / weak
   التشغيل:  python3 -m http.server 8765  (من مجلد المشروع) ثم  node tests/e2e.js
   ========================================================================= */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765/';

/* خطوة واحدة يقررها الطالب الآلي داخل الصفحة */
function botStep({ prof, n }) {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const vis = (el) => el && !el.disabled && !el.hidden && el.getClientRects().length > 0;
  const click = (el, label) => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return label; };
  const modal = $('.modal-overlay');
  if (modal) { const b = $$('[data-close]', modal).find((x) => x.dataset.close === 'yes') || $$('[data-close]', modal)[0] || $('.modal-x', modal); return click(b, 'modal'); }
  const nx = $$('.q-next').find(vis); if (nx) return click(nx, 'q-next');
  const mg = $('.mini-go'); if (vis(mg)) return click(mg, 'mini-go');
  const mini = $$('.q-mini').find((m) => !m.hidden && m.querySelector('.opt'));
  if (mini) { const o = $$('.opt', mini).find((b) => b._opt && b._opt.c && !b.disabled && !b.classList.contains('correct')); if (o) return click(o, 'remedial-ok'); return 'wait'; }
  const card = $$('.qcard').find((c) => !c.classList.contains('locked') && c.getClientRects().length);
  if (card) {
    const q = card._q;
    const budget = prof === 'strong' ? 0 : prof === 'mid' ? (n % 3 === 0 ? 1 : 0) : 3;
    card._w = card._w || 0;
    const hb = $('.btn-hint', card);
    if (prof !== 'strong' && vis(hb) && !card._hinted && (prof === 'weak' || n % 4 === 0)) { card._hinted = 1; return click(hb, 'hint'); }
    if (q.type === 'hotspot') {
      const parts = $$('.q-visual .part', card);
      if (card._w < Math.min(budget, 1)) { card._w++; return click(parts.find((g) => g.dataset.part !== q.target), 'hotspot-wrong'); }
      return click(parts.find((g) => g.dataset.part === q.target), 'hotspot');
    }
    const opts = $$('.opt', card).filter((b) => !b.disabled && b._opt && !b.closest('.q-mini'));
    if (!opts.length) return 'wait';
    const right = opts.find((b) => b._opt.c), wr = opts.find((b) => !b._opt.c);
    if (card._w < budget && wr) { card._w++; return click(wr, 'wrong'); }
    return click(right, 'right');
  }
  const ids = ['next', 'to-map', 'micro-next', 'ex-next', 'br-next', 'wj-go', 'wj-cut', 'wj-fix', 'wj-next', 'fl-next', 'maze-next', 'fac-next', 'go-rem', 'rm-go', 'skip-r', 'nx-st', 'sim-done', 'al-go', 'inv-next', 'heal-go', 'post-go', 'tr-go'];
  for (const id of ids) { const e = document.getElementById(id); if (vis(e)) return click(e, id); }
  // ---- أنشطة ----
  const hl = $('.micro .part.is-hl'); if (hl && !hl.classList.contains('picked-ok')) return click(hl, 'micro-part');
  if ($('.explore')) { const t = { roots: 'root', stem: 'stem', leaves: 'leaf', flower: 'flower' }[new URLSearchParams(location.search).get('z')]; return click($(`.ex-plant .part[data-part="${t}"]`), 'explore'); }
  const pred = $$('.wj-side .opt[data-ok="1"]').find((o) => !o.classList.contains('correct')); if (pred && vis(pred)) return click(pred, 'predict');
  const ord = $$('.order').find((o) => o._ids && $$('.ocard:not(:disabled)', o).length);
  if (ord) { const idx = $$('.slot', ord).findIndex((s) => !s.classList.contains('filled')); return click($(`.ocard[data-id="${ord._ids[idx]}"]`, ord), 'order'); }
  if ($('.maze') && !$('#maze-next')) { const hc = $('.maze .cell.hinted'); if (hc) return click(hc, 'maze-cell'); return click($('[data-d="hint"]'), 'maze-hint'); }
  const sc = $('.scard');
  if (sc) { const bin = { light: 'in', water: 'in', co2: 'in', food: 'out', o2: 'out', rock: 'none' }[sc.dataset.id]; click(sc, 'sel'); return click($(`.sbin[data-bin="${bin}"]`), 'sort'); }
  if ($('.factory')) {
    if ($('#fac-val').textContent.includes('١٠٠')) window._fr = 1;
    const seg = (k, v) => $(`.seg-b[data-k="${k}"][data-v="${v}"]`);
    if (window._fr) return click(seg('co2', 0), 'fac-stop');
    for (const [k, v] of [['light', 2], ['water', 2], ['co2', 1]]) if (!seg(k, v).classList.contains('on')) return click(seg(k, v), 'fac-' + k);
    return 'wait';
  }
  const fp = $$('.fpart').find((g) => !$(`.fl-list li[data-k="${g.dataset.fpart}"]`).classList.contains('done')); if (fp) return click(fp, 'fpart');
  const ANS = 'ستذبل النبتة وتضعف لأن الجذر لا يمتص الماء والأملاح والساق لا تنقل الماء، ويقل الغذاء الذي تصنعه الأوراق بضوء الشمس، ولا تتكون بذور وثمار جديدة للتكاثر من الزهرة.';
  for (const [ta, go] of [['open-ans', 'open-go'], ['wo-a', 'wo-go']]) { const t = document.getElementById(ta), g = document.getElementById(go); if (vis(g)) { if (t && !t.value) t.value = ANS; return click(g, go); } }
  const chip = $('.mchip');
  if (chip) {
    const p = chip.dataset.part; window._mw = window._mw || {};
    if (prof === 'weak' && p === 'root' && (window._mw[p] || 0) < 1) { window._mw[p] = 1; click(chip, 'sel'); return click($$('.mslot:not(.filled)').find((s) => s.dataset.part !== p), 'match-wrong'); }
    click(chip, 'sel'); return click($(`.mslot:not(.filled)[data-part="${p}"]`), 'match');
  }
  if ($('.sim')) {
    const done = (c) => $(`.challenges li[data-c="${c}"]`).classList.contains('done');
    const seg = (k, v) => $(`.sim .seg-b[data-k="${k}"][data-v="${v}"]`);
    const want = !done('c1') ? [['water', 2], ['light', 2]] : !done('c2') ? [['root', 'damaged'], ['water', 2]] : [['root', 'healthy'], ['water', 2], ['light', 0]];
    for (const [k, v] of want) if (!seg(k, v).classList.contains('on')) return click(seg(k, v), 'sim-' + k);
    return 'wait';
  }
  const clue = $('.clue-b:not(.used)'); if (clue) return click(clue, 'clue');
  const evg = document.getElementById('ev-go');
  if (vis(evg)) { const ch = $$('.ev input:checked'); if (evg.textContent.includes('تأكيد') && ch.length < 2) { const i = $$('.ev input:not(:checked)')[0]; i.checked = true; return 'evidence'; } return click(evg, 'ev-go'); }
  // ---- التنقل ----
  const sumLink = $('.summary a.btn-red, .summary a.btn-primary'); if (sumLink) return 'NAV:' + sumLink.getAttribute('href');
  const nextZone = $('#next-card a.btn-primary'); if (nextZone && location.pathname.endsWith('map.html')) return 'NAV:' + nextZone.getAttribute('href');
  return 'idle';
}

async function run(prof) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts|ERR_|net::/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('plantRescue.settings', JSON.stringify({ reduceMotion: true, sfx: false })); } catch (e) { /* */ } });
  await page.goto(BASE + 'student.html');
  await page.fill('#nm', { strong: 'لين', mid: 'يوسف', weak: 'أحمد' }[prof]);
  await page.click('button[type=submit]');
  let n = 0, idle = 0; const trace = [];
  const visits = new Set();
  while (n < 3000) {
    n++;
    let r;
    try { r = await page.evaluate(botStep, { prof, n }); } catch (e) { r = 'nav-wait'; }
    trace.push(r);
    visits.add(new URL(page.url()).pathname.split('/').pop() + (new URL(page.url()).searchParams.get('z') || ''));
    if (typeof r === 'string' && r.startsWith('NAV:')) {
      const href = r.slice(4);
      if (href.includes('certificate')) { await page.goto(BASE + href); break; }
      await page.goto(BASE + href); idle = 0; continue;
    }
    if (r === 'idle' || r === 'wait' || r === 'nav-wait') { idle++; if (idle > 80) { console.log('STUCK', prof, page.url(), trace.slice(-15)); await page.screenshot({ path: `tests/stuck-${prof}.png`, fullPage: true }); break; } }
    else idle = 0;
    await page.waitForTimeout(r === 'wait' || r === 'idle' ? 120 : 40);
  }
  await page.waitForTimeout(400); if (!(await page.$(".cert-name"))) { console.log("TRACE", trace.slice(-25).join(" ")); await page.screenshot({ path: `tests/stuck-${prof}.png` }); }
  const res = await page.evaluate(() => {
    const p = PR.progress.current();
    return { url: location.pathname, cert: !!document.querySelector('.cert-name'), path: p.currentPath, pathHistory: p.pathHistory.map((h) => h.path), diag: p.diagnosticResults.adjusted, post: p.postTest && p.postTest.adjusted,
      overall: PR.engine.overallMastery(p), hints: p.hintsUsed, mistakes: p.mistakes.length, badges: p.badges.length, zones: Object.values(p.zones).filter((z) => z.status === 'done').length,
      pz: PR.puzzle.pieces(p), village: PR.village.counts(p), flags: Object.keys(p.weakFlags).slice(0, 5), decisions: p.decisions.length, responses: p.responses.length };
  });
  // صفحات إضافية
  for (const pg of ['dashboard.html', 'report.html', 'teacher.html', 'index.html', 'map.html']) {
    await page.goto(BASE + pg); await page.waitForTimeout(300);
    const bad = await page.evaluate(() => document.querySelector('main').innerText.trim().length < 40);
    if (bad) errors.push('empty page ' + pg);
  }
  await page.goto(BASE + 'teacher.html'); await page.waitForTimeout(200);
  await page.click('.tbl button[data-id]'); await page.waitForTimeout(200);
  const modalOk = await page.$('.modal'); if (!modalOk) errors.push('teacher modal did not open');
  await browser.close();
  return { prof, steps: n, visits: [...visits].length, errors, ...res };
}

module.exports = { botStep, BASE };
if (require.main === module) (async () => {
  let failed = false;
  for (const prof of (process.argv[2] ? [process.argv[2]] : ['strong', 'mid', 'weak'])) {
    const r = await run(prof);
    const ok = r.cert && r.zones === 6 && !r.errors.length;
    if (!ok) failed = true;
    console.log(ok ? '✓' : '✗', JSON.stringify(r));
  }
  process.exit(failed ? 1 : 0);
})();
