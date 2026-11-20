/* اختبار قابلية النقر: لا يحجب نَبْتي أي زر. التشغيل: python3 -m http.server 8766 ثم node tests/clickable.js */
// يفحص كل زر في الصفحة: هل النقر في منتصفه يصل إليه فعلًا؟ (مع نَبْتي مطويًّا ومفتوحًا)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
  for (const vp of [{ width: 1536, height: 730 }, { width: 390, height: 760 }]) {
    const p = await b.newPage({ viewport: vp });
    await p.goto('http://localhost:8766/index.html?v=' + Date.now()); await p.waitForTimeout(900);
    for (const state of ['collapsed', 'open']) {
      const blocked = await p.evaluate(async (st) => {
        const d = document.querySelector('#nabti-dock'); d.classList.toggle('collapsed', st === 'collapsed');
        const out = [];
        const btns = [...document.querySelectorAll('main button, main a.btn')];
        for (const el of btns) {
          el.scrollIntoView({ block: 'end' }); await new Promise((r) => setTimeout(r, 30));
          const r = el.getBoundingClientRect(); if (!r.width) continue;
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (top && !el.contains(top) && d.contains(top)) out.push(el.textContent.trim().slice(0, 30));
        }
        return out;
      }, state);
      console.log(vp.width, state, 'buttons blocked by Nabti:', blocked.length ? blocked : 'none');
    }
    await p.close(); }
  await b.close(); })();
