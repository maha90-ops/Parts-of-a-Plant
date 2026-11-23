/* map.js — خريطة الرحلة التفاعلية: المناطق تُفتح تدريجيًا حسب التقدم */
(function () {
  'use strict';
  const PR = window.PR;
  const D = PR.data, E = PR.engine;

  /* خلفية الخريطة: صورة الريف الفلسطيني (زيتون، شقائق النعمان، قرية حجرية) */
  function landscape() {
    return `<img class="map-photo" src="assets/map/garden.webp" srcset="assets/map/garden-sm.webp 900w, assets/map/garden.webp 1600w" sizes="(max-width: 980px) 100vw, 900px" alt="" width="1600" height="893" decoding="async">`;
  }

  PR.pages.map = function () {
    const { $, $$, esc, ar, pct } = PR.util;
    const p = PR.progress.require({ diagnostic: true });
    if (!p) return;
    $('#map-art').innerHTML = landscape();
    $('#map-path').innerHTML = PR.ui.pathBadge(p.currentPath);
    const params = new URLSearchParams(location.search);
    const justDone = params.get('done');

    // ---- المسار بين المناطق ----
    const Z = D.ZONES;
    const START = { x: 50, y: 86 };
    let route = `<path d="M${START.x} ${START.y} Q${(START.x + Z[0].x) / 2 + 4} ${(START.y + Z[0].y) / 2} ${Z[0].x} ${Z[0].y}" class="route route-done" vector-effect="non-scaling-stroke"/>`;
    for (let i = 0; i < Z.length - 1; i++) {
      const a = Z[i], b = Z[i + 1];
      const done = p.zones[a.id].status === 'done';
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 8;
      route += `<path d="M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}" class="route ${done ? 'route-done' : ''}" vector-effect="non-scaling-stroke"/>`;
    }
    $('#map-route').innerHTML = route;

    // ---- العُقد ----
    const startNode = `<li class="node node-start" style="--x:${START.x}%;--y:${START.y}%"><span class="node-btn" aria-label="البداية: انطلقتَ في الرحلة"><span class="node-ic" aria-hidden="true">🌱</span></span><div class="node-lbl"><b>البداية</b><small class="st-ok">انطلقتَ ✓</small></div></li>`;
    $('#map-nodes').innerHTML = startNode + Z.map((z, i) => {
      const st = p.zones[z.id];
      const label = st.status === 'done' ? '✅ تم الإنجاز' : st.status === 'open' ? '▶ ابدأ هنا' : '🔒 مغلقة';
      const sym = st.status === 'done' ? '✓' : st.status === 'open' ? '▶' : '🔒';
      const stars = st.status === 'done' ? '⭐'.repeat(st.stars) + '☆'.repeat(3 - st.stars) : '';
      return `<li class="node node-${st.status}${justDone === z.id ? ' just-done' : ''}" style="--x:${z.x}%;--y:${z.y}%">
        <a class="node-btn" href="${st.status === 'locked' ? '#' : z.href}" data-zone="${z.id}" ${st.status === 'locked' ? 'aria-disabled="true"' : ''} aria-label="المنطقة ${ar(i + 1)}: ${z.title} — ${label}">
          <span class="node-ic" aria-hidden="true">${z.icon}</span>
          <span class="node-st" aria-hidden="true">${sym}</span>
        </a>
        <div class="node-lbl"><b>${ar(i + 1)}. ${z.title}</b><small>${z.learn}</small><small class="st-t">${label}</small>${stars ? `<span class="stars" aria-label="${ar(st.stars)} نجوم">${stars}</span>` : ''}</div>
      </li>`;
    }).join('');
    $$('.node-btn[aria-disabled="true"]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const i = Z.findIndex((z) => z.id === a.dataset.zone);
      PR.sfx.play('wrong');
      PR.toast(`🔒 أكمل «${Z[i - 1].title}» أولًا لفتح هذه المنطقة.`);
    }));

    // ---- لولو والصحة ----
    const h = PR.progress.luluHealth(p);
    const prevH = justDone ? Math.max(22, h - 13) : h;
    const doneN = D.ZONES.filter((z) => p.zones[z.id].status === 'done').length;
    const luluLine = (hv) => doneN === D.ZONES.length ? ['أحسنت! لقد أنقذتني! 🌱💚', 'excited'] : hv < 40 ? ['أنا أشعر بالعطش... هل تساعدني؟ 💧', 'help'] : hv < 75 ? ['أشعر بتحسّن! لنكمل الرحلة معًا 🌱', 'happy'] : ['أنا أقوى الآن! بقي القليل! 💚', 'excited'];
    const drawLulu = (hv) => { const [t, m] = luluLine(hv); $('#map-lulu').innerHTML = PR.lulu.html(t, m, { health: hv, cls: 'stacked' }); $('#health-fill').style.width = hv + '%'; $('#health-t').textContent = `${pct(hv)} — ${hv >= 90 ? 'لولو بصحة ممتازة! 🌺' : hv >= 60 ? 'لولو تتحسن!' : 'لولو ما زالت ذابلة…'}`; };
    drawLulu(prevH);
    if (justDone) setTimeout(() => { drawLulu(h); PR.fx.confetti(20); }, 700);

    // ---- المهمة التالية ----
    const nz = PR.progress.nextZone(p);
    $('#next-card').innerHTML = nz
      ? `<p class="eyebrow">🎯 المهمة التالية</p><h3>${nz.icon} ${nz.title}</h3><p class="muted">تعلّم: ${nz.learn}</p><a class="btn btn-primary" href="${nz.href}">ابدأ الآن ←</a>`
      : `<p class="eyebrow">🏆 أنهيت الرحلة!</p><h3>أنقذتَ لولو</h3><div class="row"><a class="btn btn-primary" href="report.html">📄 تقرير التعلم</a><a class="btn" href="certificate.html">🏆 الشهادة</a></div>`;

    // ---- شريط التقدّم + جواز السفر ----
    const pctDone = Math.round((doneN / D.ZONES.length) * 100);
    $('#journey-progress').innerHTML = `<div class="jp-text"><b>أنجزتَ ${ar(doneN)} من ${ar(D.ZONES.length)} محطات</b><span>${pct(pctDone)}</span></div>
      <div class="jp-bar" role="progressbar" aria-label="نسبة التقدّم في الرحلة" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pctDone}"><i style="width:${pctDone}%"></i>
      ${D.ZONES.map((z, i) => `<span class="jp-dot ${p.zones[z.id].status}" style="--i:${i}" title="${z.title}">${p.zones[z.id].status === 'done' ? '✓' : z.icon}</span>`).join('')}</div>`;
    $('#passport-card').innerHTML = PR.passport.html(p);

    // ---- قرية لولو + بازل قبة الصخرة ----
    $('#village-card').innerHTML = PR.village.panel(p);
    PR.village.mountPanel($('#village-card'), p);
    $('#puzzle-card').innerHTML = PR.puzzle.panel(p);

    // ---- التوصية ----
    const recs = E.recommendations(p);
    p.recommendations = recs; PR.progress.save(p);
    const r = recs[0];
    $('#rec-card').innerHTML = `<p class="eyebrow">🤖 اقتراح نَبْتي</p><p>${esc(r.text)}</p><a class="btn sm" href="${r.href}">🌱 ${esc(r.title)}</a>
      <p class="muted small" style="margin-top:8px">⭐ ${ar(p.stars)} نجمة · 🏅 ${ar(p.badges.length)} شارات · التقدّم ${pct(p.progress)}</p>`;

    const msg = justDone ? `أحسنت! صحة لولو تتحسن. ${nz ? `المحطة التالية: ${nz.title}.` : ''}` : nz ? `اختر «${nz.title}» لنكمل إنقاذ لولو. المناطق تُفتح واحدة تلو الأخرى.` : 'مبارك! أنقذت لولو. شاهد تقريرك وشهادتك.';
    PR.nabti.say(msg, justDone ? 'cheer' : 'happy');
  };
})();
