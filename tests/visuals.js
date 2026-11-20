/* =========================================================================
   visuals.js — يتأكد أن كل الرسوم (النبتة، الزهرة، القرية، البازل…) ظاهرة بحجم حقيقي
   في كل شاشات الرحلة، على الحاسوب والجوال (يكشف الرسوم التي تنكمش إلى صفر).
   التشغيل: python3 -m http.server 8766  ثم  BASE=http://localhost:8766/ node tests/visuals.js
   ========================================================================= */
const { chromium } = require('playwright');
const { botStep } = require('./e2e.js');
const B = process.env.BASE || 'http://localhost:8766/';

async function run(viewport, label) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('plantRescue.settings', JSON.stringify({ reduceMotion: true, sfx: false })));
  await p.goto(B + 'student.html'); await p.fill('#nm', 'اختبار'); await p.click('button[type=submit]');
  const problems = new Map(); let n = 0, idle = 0;
  while (n++ < 3000) {
    const bad = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('main svg.plant-svg, main svg.flower-svg, main svg.vscene, main svg.pz-svg, .modal svg.vscene').forEach((s) => {
        const host = s.parentElement; if (!host || host.closest('[hidden]')) return;
        const r = s.getBoundingClientRect();
        if (r.width < 40 || r.height < 40) out.push(`${s.getAttribute('class')} في ${host.className || host.id || host.tagName} (${Math.round(r.width)}×${Math.round(r.height)})`);
      });
      // عناصر عليها hidden لكنها ظاهرة فعليًا (مثل زر «التالي» قبل إكمال السؤال)
      document.querySelectorAll('[hidden]').forEach((el) => { if (el.getClientRects().length) out.push(`عنصر مخفي ظاهر: ${el.className || el.id || el.tagName} «${(el.textContent || '').trim().slice(0, 20)}»`); });
      return out.map((x) => location.pathname.split('/').pop() + location.search + ': ' + x);
    }).catch(() => []);
    bad.forEach((x) => problems.set(x, 1));
    let r; try { r = await p.evaluate(botStep, { prof: 'mid', n }); } catch (e) { r = 'wait'; }
    if (typeof r === 'string' && r.startsWith('NAV:')) { if (r.includes('certificate')) break; await p.goto(B + r.slice(4)); idle = 0; continue; }
    if (r === 'idle' || r === 'wait') { if (++idle > 80) break; } else idle = 0;
    await p.waitForTimeout(r === 'idle' || r === 'wait' ? 100 : 30);
  }
  for (const pg of ['index.html', 'map.html', 'dashboard.html', 'certificate.html']) {
    await p.goto(B + pg); await p.waitForTimeout(500);
    (await p.evaluate(() => [...document.querySelectorAll('main svg.plant-svg, main svg.vscene, main svg.pz-svg, main svg.nabti-svg')].filter((s) => { const r = s.getBoundingClientRect(); return r.width < 40; }).map((s) => location.pathname + ': ' + s.getAttribute('class')))).forEach((x) => problems.set(x, 1));
  }
  await b.close();
  console.log(problems.size ? `✗ ${label}:\n  ` + [...problems.keys()].join('\n  ') : `✓ ${label}: كل الرسوم ظاهرة بحجم سليم`);
  return problems.size === 0;
}
(async () => {
  const a = await run({ width: 1440, height: 900 }, 'الحاسوب');
  const m = await run({ width: 390, height: 844 }, 'الجوال');
  process.exit(a && m ? 0 : 1);
})();
