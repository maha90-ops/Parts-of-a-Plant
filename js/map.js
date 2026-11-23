/* map.js — خريطة الرحلة التفاعلية: المناطق تُفتح تدريجيًا حسب التقدم */
(function () {
  'use strict';
  const PR = window.PR;
  const D = PR.data, E = PR.engine;

  /* خلفية الخريطة: صورة الحديقة + لمسات فلسطينية (زيتون، شقائق النعمان، قرية حجرية) */
  function landscape() {
    const olive = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#msoft)">
      <ellipse cy="64" rx="46" ry="9" fill="#3d4a22" opacity=".25"/>
      <path d="M-8 64 C-6 40 -16 30 -4 12 M6 64 C8 44 16 34 4 14" stroke="#6e5236" stroke-width="11" fill="none" stroke-linecap="round"/>
      <path d="M-4 14 C-2 30 4 40 6 62" stroke="#8a6a46" stroke-width="5" fill="none" opacity=".6"/>
      <circle cx="-30" cy="-6" r="28" fill="url(#oleaf)"/><circle cx="28" cy="-8" r="30" fill="url(#oleaf)"/>
      <circle cx="0" cy="-30" r="34" fill="url(#oleaf)"/><circle cx="-12" cy="6" r="22" fill="url(#oleaf)"/><circle cx="16" cy="8" r="20" fill="url(#oleaf)"/>
      <g fill="#36402a"><ellipse cx="-22" cy="-10" rx="4" ry="5.5"/><ellipse cx="14" cy="-26" rx="4" ry="5.5"/><ellipse cx="30" cy="2" rx="4" ry="5.5"/><ellipse cx="-4" cy="4" rx="4" ry="5.5"/></g></g>`;
    const anem = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s || 1})" filter="url(#msoft)">
      <path d="M0 4 C2 20 -2 30 0 42" stroke="#5d8a3a" stroke-width="4" fill="none"/>
      <g fill="url(#apetal)">${[0, 72, 144, 216, 288].map((r) => `<ellipse rx="10" ry="15" cy="-12" transform="rotate(${r})"/>`).join('')}</g>
      <circle r="7" fill="#1d1a17"/><circle r="2.5" cx="-2" cy="-2" fill="#4a4340"/></g>`;
    const house = (x, y, s, dome) => `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#msoft)">
      <rect x="-34" y="-40" width="68" height="44" rx="4" fill="url(#stone)"/>
      ${dome ? '<path d="M-20 -40 a20 18 0 0 1 40 0z" fill="#e3d2ad"/>' : '<rect x="-36" y="-44" width="72" height="7" rx="3" fill="#d9c49b"/>'}
      <path d="M-8 4 V-16 a8 8 0 0 1 16 0 V4z" fill="#6b4a2a"/><rect x="-26" y="-28" width="10" height="12" rx="5" fill="#3f6d8a"/><rect x="16" y="-28" width="10" height="12" rx="5" fill="#3f6d8a"/></g>`;
    return `<img class="map-photo" src="assets/map/garden.webp" srcset="assets/map/garden-sm.webp 900w, assets/map/garden.webp 1600w" sizes="(max-width: 980px) 100vw, 900px" alt="" width="1600" height="893" decoding="async">
    <svg viewBox="0 0 2000 1116" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="msoft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#2e2414" flood-opacity=".35"/></filter>
        <radialGradient id="oleaf" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#c3cf9c"/><stop offset=".55" stop-color="#8fa265"/><stop offset="1" stop-color="#5f7340"/></radialGradient>
        <radialGradient id="apetal" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#ff5a5f"/><stop offset=".6" stop-color="#d4142f"/><stop offset="1" stop-color="#9c0c22"/></radialGradient>
        <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4e7cb"/><stop offset="1" stop-color="#d6c19a"/></linearGradient>
      </defs>
      <!-- قرية حجرية على تلة مركز الإنقاذ -->
      ${house(960, 215, 1.4, true)}${house(1070, 200, 1.15)}${house(1290, 215, 1.3, true)}
      <!-- أشجار زيتون -->
      ${olive(1390, 150, 1.05)}${olive(890, 180, .9)}${olive(130, 380, 1.15)}${olive(1880, 430, 1.1)}${olive(1060, 900, .8)}
      <!-- شقائق النعمان -->
      ${[[250, 520, 1], [290, 545, .8], [215, 560, .85], [700, 1010, .9], [745, 1035, .75], [1130, 640, .8], [1170, 660, .65], [1740, 560, .8], [1780, 585, .7], [560, 430, .7], [1500, 330, .7]].map(([x, y, s]) => anem(x, y, s)).join('')}
    </svg>`;
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
    const START = { x: 66, y: 86 };
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
