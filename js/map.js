/* map.js — خريطة الرحلة التفاعلية: المناطق تُفتح تدريجيًا حسب التقدم */
(function () {
  'use strict';
  const PR = window.PR;
  const D = PR.data, E = PR.engine;

  function landscape() {
    const tree = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="0" width="6" height="22" rx="2" fill="#6b4a2a"/><circle cy="-6" r="17" fill="#71913f"/><circle cx="-12" cy="2" r="11" fill="#7f9f4a"/><circle cx="12" cy="2" r="11" fill="#5f7f35"/><g fill="#2f3a20"><circle cx="-5" cy="-8" r="1.6"/><circle cx="6" cy="-2" r="1.6"/><circle cx="-10" cy="4" r="1.4"/></g></g>`;
    const house = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-16" y="-20" width="32" height="22" fill="#e9dcc0" stroke="#b9a37c"/><path d="M-10 -20 a10 9 0 0 1 20 0z" fill="#d8c8a6" stroke="#b9a37c"/><rect x="-4" y="-10" width="8" height="12" fill="#6b4a2a"/></g>`;
    const anem = (x, y) => `<g transform="translate(${x} ${y})"><circle r="4.5" fill="#c8102e"/><circle r="1.6" fill="#1b1b18"/></g>`;
    return `<svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="msky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e6c4"/><stop offset=".45" stop-color="#eef0d6"/><stop offset="1" stop-color="#cfe0a8"/></linearGradient></defs>
      <rect width="1000" height="620" fill="url(#msky)"/>
      <path d="M0 170 Q180 110 360 150 T720 130 T1000 150 V620 H0Z" fill="#dfe6b8"/>
      <path d="M0 260 Q220 200 460 250 T1000 230 V620 H0Z" fill="#cbdb9c"/>
      <path d="M0 380 Q260 320 520 370 T1000 350 V620 H0Z" fill="#b9d08a"/>
      <path d="M0 500 Q260 450 520 495 T1000 480 V620 H0Z" fill="#a7c47a"/>
      <g fill="none" stroke="#9c8358" stroke-width="2" opacity=".35"><path d="M0 285 Q230 225 470 275 T1000 255"/><path d="M0 405 Q260 345 520 395 T1000 375"/><path d="M0 525 Q260 475 520 520 T1000 505"/></g>
      <g transform="translate(880 520)"><ellipse rx="70" ry="22" fill="#6aa6d6" opacity=".7"/><ellipse rx="50" ry="12" fill="#9fd0f5" opacity=".7"/></g>
      ${tree(120, 250, 1.1)}${tree(250, 420, 1)}${tree(560, 300, .9)}${tree(930, 290, 1.1)}${tree(780, 430, .9)}${tree(470, 520, 1)}${tree(60, 470, 1.2)}
      ${house(690, 108)}${house(735, 118)}${house(650, 125)}
      ${[[150, 330], [170, 345], [130, 352], [200, 320], [90, 300], [320, 540], [600, 560], [640, 545]].map(([x, y]) => anem(x, y)).join('')}
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
    let route = '';
    for (let i = 0; i < Z.length - 1; i++) {
      const a = Z[i], b = Z[i + 1];
      const done = p.zones[a.id].status === 'done';
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 8;
      route += `<path d="M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}" class="route ${done ? 'route-done' : ''}" vector-effect="non-scaling-stroke"/>`;
    }
    $('#map-route').innerHTML = route;

    // ---- العُقد ----
    $('#map-nodes').innerHTML = Z.map((z, i) => {
      const st = p.zones[z.id];
      const label = st.status === 'done' ? 'مكتملة' : st.status === 'open' ? 'مفتوحة' : 'مغلقة';
      const sym = st.status === 'done' ? '✓' : st.status === 'open' ? '▶' : '🔒';
      const stars = st.status === 'done' ? '⭐'.repeat(st.stars) + '☆'.repeat(3 - st.stars) : '';
      return `<li class="node node-${st.status}${justDone === z.id ? ' just-done' : ''}" style="--x:${z.x}%;--y:${z.y}%">
        <a class="node-btn" href="${st.status === 'locked' ? '#' : z.href}" data-zone="${z.id}" ${st.status === 'locked' ? 'aria-disabled="true"' : ''} aria-label="المنطقة ${ar(i + 1)}: ${z.title} — ${label}">
          <span class="node-ic" aria-hidden="true">${z.icon}</span>
          <span class="node-st" aria-hidden="true">${sym}</span>
        </a>
        <div class="node-lbl"><b>${ar(i + 1)}. ${z.title}</b><small>${z.learn}</small>${stars ? `<span class="stars" aria-label="${ar(st.stars)} نجوم">${stars}</span>` : `<small class="st-t">${label}</small>`}</div>
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
    const drawLulu = (hv) => { $('#map-lulu').innerHTML = PR.art.plant({ mode: 'pot', health: hv, water: hv > 60 ? 2 : hv > 40 ? 1 : 0, title: `لولو بصحة ${hv}٪` }); $('#health-fill').style.width = hv + '%'; $('#health-t').textContent = `${pct(hv)} — ${hv >= 90 ? 'لولو بصحة ممتازة! 🌺' : hv >= 60 ? 'لولو تتحسن!' : 'لولو ما زالت ذابلة…'}`; };
    drawLulu(prevH);
    if (justDone) setTimeout(() => { drawLulu(h); PR.fx.confetti(20); }, 700);

    // ---- المهمة التالية ----
    const nz = PR.progress.nextZone(p);
    $('#next-card').innerHTML = nz
      ? `<p class="eyebrow">🎯 المهمة التالية</p><h3>${nz.icon} ${nz.title}</h3><p class="muted">تعلّم: ${nz.learn}</p><a class="btn btn-primary" href="${nz.href}">ابدأ الآن ←</a>`
      : `<p class="eyebrow">🏆 أنهيت الرحلة!</p><h3>أنقذتَ لولو</h3><div class="row"><a class="btn btn-primary" href="report.html">📄 تقرير التعلم</a><a class="btn" href="certificate.html">🏆 الشهادة</a></div>`;

    // ---- قرية لولو + بازل قبة الصخرة ----
    $('#village-card').innerHTML = PR.village.panel(p);
    PR.village.mount($('#village-card'), p);
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
