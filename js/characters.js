/* =========================================================================
   characters.js — رسوم SVG برمجية: لولو (نبتة شقائق النعمان)، نَبْتي، الزهرة
   كل الرسوم متجهية (بلا صور خارجية) وتتغير حالتها حسب البيانات:
   صحة النبتة، حالة الجذر/الساق/الأوراق، الماء، الضوء...
   ========================================================================= */
(function (root) {
  'use strict';
  const PR = root.PR = root.PR || {};
  let uid = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function hex(c) { c = c.replace('#', ''); return [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16)); }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b); t = clamp(t, 0, 1);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  function bz(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  }
  const f = (n) => Math.round(n * 10) / 10;

  /* -------------------- وجه لولو -------------------- */
  function face(h, x, y, s) {
    s = s || 1;
    let eyes, mouth, extra = '';
    if (h >= 0.65) {
      eyes = `<ellipse cx="-6" cy="-3" rx="3.4" ry="4.2" fill="#fff"/><ellipse cx="6" cy="-3" rx="3.4" ry="4.2" fill="#fff"/><circle cx="-5.4" cy="-2.4" r="2" fill="#111"/><circle cx="6.6" cy="-2.4" r="2" fill="#111"/><circle cx="-4.6" cy="-3.6" r=".8" fill="#fff"/><circle cx="7.4" cy="-3.6" r=".8" fill="#fff"/>`;
      mouth = '<path d="M-6 5 Q0 11 6 5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    } else if (h >= 0.4) {
      eyes = `<ellipse cx="-6" cy="-2" rx="3.2" ry="3.4" fill="#fff"/><ellipse cx="6" cy="-2" rx="3.2" ry="3.4" fill="#fff"/><circle cx="-6" cy="-1.4" r="1.8" fill="#111"/><circle cx="6" cy="-1.4" r="1.8" fill="#111"/>`;
      mouth = '<path d="M-5 7 Q0 6 5 7" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    } else {
      eyes = `<ellipse cx="-6" cy="-1" rx="3.2" ry="2.6" fill="#fff"/><ellipse cx="6" cy="-1" rx="3.2" ry="2.6" fill="#fff"/><circle cx="-6" cy="0" r="1.6" fill="#111"/><circle cx="6" cy="0" r="1.6" fill="#111"/><path d="M-10 -4 L-2 -2.5 M10 -4 L2 -2.5" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>`;
      mouth = '<path d="M-6 9 Q0 4 6 9" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
      extra = '<path d="M10 2 q2 4 0 6 q-2 -2 0 -6z" fill="#7cc8ff"/>';
    }
    return `<g class="lulu-face" transform="translate(${f(x)} ${f(y)}) scale(${s})">${eyes}${mouth}<circle cx="-11" cy="5" r="2.6" fill="#ff8a9a" opacity=".55"/><circle cx="11" cy="5" r="2.6" fill="#ff8a9a" opacity=".55"/>${extra}</g>`;
  }

  /* -------------------- النبتة (لولو) -------------------- */
  /**
   * opts: mode 'soil'|'pot', health 0..100, root 'healthy'|'weak'|'damaged', stem 'healthy'|'weak'|'broken',
   * leaves 'healthy'|'damaged'|'yellow', flower bool, water 0..2, light 0..2, scene bool, face bool,
   * hotspots bool, highlight part, flow bool (حركة الماء), labels bool, title
   */
  function plant(o) {
    o = Object.assign({ mode: 'soil', health: 100, root: 'healthy', stem: 'healthy', leaves: 'healthy', flower: true, water: 1, light: 2, scene: false, face: true, hotspots: false, highlight: null, flow: false, labels: false }, o || {});
    const id = 'pl' + (++uid);
    const h = clamp(o.health, 0, 100) / 100, w = 1 - h;
    const pot = o.mode === 'pot';
    const G = pot ? 388 : 330;
    const B = [200, G];
    let H, C1, C2;
    if (o.stem === 'broken') { H = [292, G - 140]; C1 = [200, G - 105]; C2 = [214, G - 150]; }
    else { H = [200 + w * 70, G - 200 + w * 62]; C1 = [200, G - 90]; C2 = [H[0] - w * 12, H[1] + 64]; }
    const stemW = o.stem === 'weak' ? 7 : o.stem === 'broken' ? 10 : 13;
    const stemCol = mix('#2f8f46', '#a39a3a', w * 0.75);
    const hs = (part, label) => o.hotspots ? ` role="button" tabindex="0" aria-label="${label}"` : '';
    const cls = (part) => `part part-${part}${o.highlight === part ? ' is-hl' : ''}`;
    const out = [];
    out.push(`<svg class="plant-svg${o.highlight ? ' has-hl' : ''}${o.hotspots ? ' has-hotspots' : ''}" viewBox="0 0 400 520" role="img" aria-label="${o.title || 'رسم النبتة لولو'}" xmlns="http://www.w3.org/2000/svg">`);
    out.push(`<defs>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.light === 0 ? '#2b3550' : '#cfeef0'}"/><stop offset="1" stop-color="${o.light === 0 ? '#4a4f62' : '#fbf3dc'}"/></linearGradient>
      <linearGradient id="${id}-soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${['#c49a68', '#93613a', '#6e4527'][o.water]}"/><stop offset="1" stop-color="${['#9c7246', '#6a4126', '#45291a'][o.water]}"/></linearGradient>
      <linearGradient id="${id}-stem" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${mix(stemCol, '#ffffff', .25)}"/><stop offset=".5" stop-color="${stemCol}"/><stop offset="1" stop-color="${mix(stemCol, '#000000', .3)}"/></linearGradient>
      <radialGradient id="${id}-petal" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="${mix('#7a0a1c', '#5a3a3a', w * .6)}"/><stop offset=".35" stop-color="${mix('#d0122f', '#9a6a5a', w * .7)}"/><stop offset="1" stop-color="${mix('#ff4d63', '#c49a8a', w * .7)}"/></radialGradient>
      <linearGradient id="${id}-pot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9784a"/><stop offset=".55" stop-color="#bf5a30"/><stop offset="1" stop-color="#8f3f1f"/></linearGradient>
      <mask id="${id}-bite" maskUnits="userSpaceOnUse" x="-20" y="-60" width="140" height="120"><rect x="-20" y="-60" width="140" height="120" fill="#fff"/><circle cx="70" cy="-20" r="11" fill="#000"/><circle cx="84" cy="-12" r="7" fill="#000"/><circle cx="40" cy="10" r="6" fill="#000"/></mask>
      <filter id="${id}-sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#2a1a0a" flood-opacity=".25"/></filter>
    </defs>`);

    // ---- المشهد: سماء وشمس ----
    if (o.scene) {
      out.push(`<rect width="400" height="${G}" fill="url(#${id}-sky)"/>`);
      if (o.light > 0) {
        const op = o.light === 2 ? 1 : 0.45;
        out.push(`<g class="sun" opacity="${op}" transform="translate(62 62)"><g stroke="#f7b733" stroke-width="4" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="0" y1="-40" x2="0" y2="-50" transform="rotate(${a})"/>`).join('')}</g><circle r="30" fill="#ffd23f"/><circle r="22" fill="#ffe27a"/></g>`);
        if (o.light === 1) out.push('<g fill="#fff" opacity=".9"><ellipse cx="96" cy="78" rx="38" ry="16"/><ellipse cx="74" cy="70" rx="22" ry="16"/><ellipse cx="116" cy="70" rx="20" ry="13"/></g>');
      } else {
        out.push('<g transform="translate(330 60)"><circle r="20" fill="#e8e6d8"/><circle cx="8" cy="-5" r="18" fill="#2b3550"/></g><g fill="#fff" opacity=".7"><circle cx="60" cy="40" r="1.6"/><circle cx="120" cy="90" r="1.2"/><circle cx="250" cy="30" r="1.4"/><circle cx="300" cy="120" r="1"/></g>');
      }
      // تلال وأشجار زيتون بعيدة
      if (!pot) out.push(`<path d="M0 ${G - 40} Q80 ${G - 80} 160 ${G - 46} T320 ${G - 52} T400 ${G - 40} V${G} H0Z" fill="${o.light === 0 ? '#3d4a3a' : '#b9d39a'}" opacity=".7"/><g fill="${o.light === 0 ? '#2f3a2c' : '#7f9a52'}" opacity=".8"><circle cx="40" cy="${G - 62}" r="11"/><rect x="38.5" y="${G - 54}" width="3" height="12" fill="#6b4a2a"/><circle cx="352" cy="${G - 64}" r="13"/><rect x="350.5" y="${G - 54}" width="3" height="12" fill="#6b4a2a"/></g>`);
    }

    // ---- التربة أو الأصيص ----
    if (pot) {
      out.push(`<ellipse cx="200" cy="508" rx="96" ry="9" fill="#2a1a0a" opacity=".18"/>`);
      out.push(`<path d="M126 392 L274 392 L258 504 L142 504 Z" fill="url(#${id}-pot)"/>`);
      out.push(`<rect x="114" y="374" width="172" height="24" rx="8" fill="#c96537"/><rect x="114" y="374" width="172" height="7" rx="4" fill="#e08a5c" opacity=".8"/>`);
      out.push(`<ellipse cx="200" cy="378" rx="80" ry="7" fill="${['#9c7246', '#5e3b22', '#3d2414'][o.water]}"/>`);
      // شريط تطريز على الأصيص
      let band = '';
      for (let x = 146; x <= 254; x += 12) {
        const c = ((x - 146) / 12) % 3 === 1 ? '#1b1b18' : '#fbf6ec';
        band += `<rect x="${x - 3.5}" y="${438 - 3.5}" width="7" height="7" transform="rotate(45 ${x} 438)" fill="${c}"/>`;
      }
      out.push(`<g opacity=".95"><path d="M140 424 H260 M142 452 H258" stroke="#fbf6ec" stroke-width="2" stroke-dasharray="3 3"/>${band}</g>`);
    } else {
      out.push(`<rect x="0" y="${G}" width="400" height="${520 - G}" fill="url(#${id}-soil)"/>`);
      out.push(`<path d="M0 ${G} Q100 ${G - 6} 200 ${G} T400 ${G}" stroke="#5e8f3a" stroke-width="7" fill="none"/>`);
      // حصى
      out.push(`<g fill="#000" opacity=".12"><ellipse cx="70" cy="${G + 60}" rx="14" ry="8"/><ellipse cx="330" cy="${G + 110}" rx="18" ry="9"/><ellipse cx="300" cy="${G + 40}" rx="8" ry="5"/><ellipse cx="110" cy="${G + 150}" rx="10" ry="6"/></g>`);
      if (o.water === 0) out.push(`<g stroke="#6e4a2a" stroke-width="2" fill="none" opacity=".7"><path d="M60 ${G + 8} l12 14 l-6 12 l10 10"/><path d="M300 ${G + 6} l-10 16 l8 10"/><path d="M150 ${G + 10} l8 12 l-4 10"/></g>`);
      if (o.water === 2) out.push(`<g fill="#5ab8ff" opacity=".75">${[[60, 60], [120, 110], [280, 70], [330, 150], [90, 170], [250, 160], [160, 60]].map(([x, y]) => `<path d="M${x} ${G + y} q4 6 0 9 q-4 -3 0 -9z"/>`).join('')}</g>`);
    }

    // ---- الجذور ----
    if (!pot || o.xray) {
      const rs = o.root;
      const rc = rs === 'damaged' ? '#7d5b3a' : rs === 'weak' ? '#c9ab78' : '#e6c690';
      const k = rs === 'damaged' ? 0.5 : rs === 'weak' ? 0.65 : 1;
      const mw = rs === 'healthy' ? 8 : 5;
      const dash = rs === 'damaged' ? ' stroke-dasharray="14 7"' : '';
      const R0 = [200, G], R1 = [196, G + 50 * k], R2 = [206, G + 95 * k], R3 = [200, G + 140 * k];
      const branches = [[0.25, -1, 70], [0.35, 1, 80], [0.55, -1, 60], [0.65, 1, 58], [0.82, -1, 36], [0.86, 1, 34]];
      let rp = `<path d="M${R0} C${R1} ${R2} ${R3}" stroke="${rc}" stroke-width="${mw}" fill="none" stroke-linecap="round"${dash}/>`;
      branches.forEach(([t, dir, len], i) => {
        if (rs === 'weak' && i % 2) return;
        const p = bz(t, R0, R1, R2, R3);
        const L = len * k;
        const e = [p[0] + dir * L, p[1] + L * 0.55];
        const c = [p[0] + dir * L * 0.5, p[1] + L * 0.05];
        rp += `<path d="M${f(p[0])} ${f(p[1])} Q${f(c[0])} ${f(c[1])} ${f(e[0])} ${f(e[1])}" stroke="${rc}" stroke-width="${mw * 0.5}" fill="none" stroke-linecap="round"${dash}/>`;
        if (rs === 'healthy') {
          for (let j = 1; j <= 3; j++) {
            const q = [p[0] + dir * L * j / 3.4, p[1] + L * 0.55 * (j / 3.4) * (j / 3.4) + L * 0.05];
            rp += `<path d="M${f(q[0])} ${f(q[1])} l${dir * 6} ${7}" stroke="${rc}" stroke-width="1.3" opacity=".8"/>`;
          }
        }
      });
      if (rs === 'damaged') rp += `<g fill="#2b1a0e"><circle cx="190" cy="${G + 40}" r="4"/><circle cx="214" cy="${G + 58}" r="3"/><circle cx="170" cy="${G + 52}" r="3"/></g>`;
      const hit = o.hotspots ? `<path class="hit" d="M200 ${G + 4} V${G + 150}" stroke="transparent" stroke-width="90"/>` : '';
      out.push(`<g class="${cls('root')}" data-part="root"${hs('root', 'الجذر')}>${hit}${rp}</g>`);
    }

    // ---- الساق ----
    const stemPath = `M${B} C${C1.map(f)} ${C2.map(f)} ${H.map(f)}`;
    let stem = `<path d="${stemPath}" stroke="url(#${id}-stem)" stroke-width="${stemW}" fill="none" stroke-linecap="round"/>`;
    if (o.stem === 'broken') {
      const cp = bz(0.42, B, C1, C2, H);
      stem += `<path d="M${f(cp[0] - 10)} ${f(cp[1] - 3)} l5 4 l-3 3 l6 3 l-2 3 l6 2" stroke="#4a2e12" stroke-width="2.4" fill="none"/><path d="M${f(cp[0] - 9)} ${f(cp[1] + 4)} h18" stroke="#fbf6ec" stroke-width="1.5" opacity=".7"/>`;
    }
    if (o.stem === 'weak') stem += `<path d="${stemPath}" stroke="#d8cf8a" stroke-width="2" stroke-dasharray="3 8" fill="none" opacity=".7"/>`;
    const stemHit = o.hotspots ? `<path class="hit" d="${stemPath}" stroke="transparent" stroke-width="40" fill="none"/>` : '';
    out.push(`<g class="${cls('stem')}" data-part="stem"${hs('stem', 'الساق')}>${stemHit}${stem}</g>`);

    // ---- الأوراق ----
    const leafCol = o.leaves === 'yellow' ? ['#e0cf5a', '#a8912e'] : ['#5cc46f', '#1f7a3a'];
    const lc1 = mix(leafCol[0], '#c9b057', w * 0.8), lc2 = mix(leafCol[1], '#8a7429', w * 0.8);
    out.push(`<defs><linearGradient id="${id}-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lc1}"/><stop offset="1" stop-color="${lc2}"/></linearGradient></defs>`);
    const leafSpots = [[0.3, 1, 74], [0.48, -1, 70], [0.64, 1, 62], [0.8, -1, 54]];
    let leaves = '';
    leafSpots.forEach(([t, side, L], i) => {
      const p = bz(t, B, C1, C2, H);
      const ang = -32 + w * 78 + (o.stem === 'broken' && t > 0.42 ? 25 : 0);
      const sc = L / 100;
      const dmg = o.leaves === 'damaged' && i !== 3;
      leaves += `<g transform="translate(${f(p[0])} ${f(p[1])}) scale(${side * sc} ${sc}) rotate(${f(ang)})">
        <path d="M0 0 C25 -32 75 -30 100 0 C75 26 25 28 0 0Z" fill="url(#${id}-leaf)"${dmg ? ` mask="url(#${id}-bite)"` : ''}/>
        <path d="M3 0 Q50 -4 92 0" stroke="${mix(lc2, '#ffffff', .35)}" stroke-width="2" fill="none" opacity=".8"/>
        <path d="M30 -1 l12 -12 M50 -2 l14 -13 M30 0 l12 10 M52 0 l13 10" stroke="${mix(lc2, '#ffffff', .3)}" stroke-width="1.2" opacity=".6"/>
        ${dmg ? '<g fill="#6b4a1e" opacity=".85"><circle cx="28" cy="-6" r="5"/><circle cx="55" cy="6" r="4"/><circle cx="45" cy="-12" r="3"/></g>' : ''}
        <path d="M8 -4 C30 -20 60 -20 80 -8" stroke="#fff" stroke-width="2" fill="none" opacity=".25"/>
      </g>`;
    });
    out.push(`<g class="${cls('leaf')}" data-part="leaf"${hs('leaf', 'الأوراق')}>${leaves}</g>`);

    // ---- الزهرة / الرأس ----
    const tilt = w * 38 + (o.stem === 'broken' ? 50 : 0);
    let head = '';
    if (o.flower) {
      const sy = 1 - w * 0.22;
      head += `<g filter="url(#${id}-sh)">`;
      for (let k = 0; k < 6; k++) head += `<ellipse cx="0" cy="-27" rx="18" ry="${f(29 * sy)}" fill="url(#${id}-petal)" transform="rotate(${k * 60 + 30})"/>`;
      for (let k = 0; k < 6; k++) head += `<path d="M0 -10 Q-4 -30 0 -48" stroke="#fff" stroke-width="1.2" opacity=".18" fill="none" transform="rotate(${k * 60 + 30})"/>`;
      head += '</g>';
      for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2; head += `<circle cx="${f(Math.cos(a) * 21)}" cy="${f(Math.sin(a) * 21)}" r="2.2" fill="#1b1b18"/>`; }
      head += '<circle r="17" fill="#1b1b18"/><circle r="17" fill="none" stroke="#3a2a4a" stroke-width="2"/>';
    } else {
      head += `<path d="M-14 6 Q-20 -6 -8 -10 M14 6 Q20 -6 8 -10" stroke="#2f8f46" stroke-width="5" fill="none"/><circle r="17" fill="${mix('#3fae5a', '#9c9a3a', w)}"/><circle cx="-5" cy="-6" r="6" fill="#fff" opacity=".18"/>`;
    }
    if (o.face) head += face(h, 0, 0, 1);
    const headHit = o.hotspots ? '<circle class="hit" r="50" fill="transparent"/>' : '';
    out.push(`<g class="${cls('flower')}" data-part="flower"${hs('flower', 'الزهرة')} transform="translate(${f(H[0])} ${f(H[1])}) rotate(${f(tilt)})">${headHit}${head}</g>`);

    // ---- حركة الماء ----
    // الماء يصعد من الجذر عبر الساق ثم يتفرّع إلى كل ورقة (عبر عِرقها الأوسط) وإلى الزهرة
    if (o.flow) {
      const still = PR.settings && PR.settings.reduceMotion;
      const breakT = 0.42;
      const reaches = (t) => o.root !== 'damaged' && o.water > 0 && !(o.stem === 'broken' && t > breakT);
      const base = [];
      if (!pot) base.push([200, G + 130 * (o.root === 'damaged' ? 0.3 : 1)]);
      base.push(B);
      const stemTo = (tEnd) => { const a = []; for (let t = 0.05; t < tEnd; t += 0.05) a.push(bz(t, B, C1, C2, H)); a.push(bz(tEnd, B, C1, C2, H)); return a; };
      const toD = (pts) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L');
      const routes = [];
      // مسار الساق (يتوقف عند الشق إن كانت مكسورة)
      const stemEnd = o.root === 'damaged' ? 0 : o.stem === 'broken' ? breakT - 0.02 : 0.95;
      const trunk = base.concat(stemEnd > 0 ? stemTo(stemEnd) : []);
      out.push(`<path d="${toD(trunk)}" fill="none" stroke="#5ab8ff" stroke-width="3" stroke-dasharray="2 10" opacity=".55"/>`);
      if (reaches(0.95)) routes.push({ pts: base.concat(stemTo(0.95)), n: 2 });
      // فروع الأوراق
      leafSpots.forEach(([t, side, L]) => {
        const p0 = bz(t, B, C1, C2, H);
        const a = (-32 + w * 78 + (o.stem === 'broken' && t > breakT ? 25 : 0)) * Math.PI / 180;
        const sc = L / 100;
        const at = (x) => [p0[0] + side * sc * (x * Math.cos(a)), p0[1] + sc * (x * Math.sin(a))];
        const vein = [0, 20, 40, 60, 80, 90].map(at);
        if (!reaches(t)) return;
        // العِرق الأوسط يتلوّن بالأزرق حين يصل الماء إلى الورقة
        out.push(`<path d="${toD(vein)}" fill="none" stroke="#3aa0ff" stroke-width="3.6" stroke-linecap="round" opacity=".9" stroke-dasharray="${still ? 'none' : '6 6'}">${still ? '' : '<animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.8s" repeatCount="indefinite"/>'}</path>`);
        routes.push({ pts: base.concat(stemTo(t), vein.slice(1)), n: 1 });
      });
      if (!still) {
        let k = 0;
        routes.forEach((r) => {
          const d = toD(r.pts);
          for (let j = 0; j < r.n; j++, k++) out.push(`<circle r="4.6" fill="#3aa0ff" stroke="#fff" stroke-width="1.5"><animateMotion dur="3.2s" begin="-${((k * 0.55) % 3.2).toFixed(2)}s" repeatCount="indefinite" path="${d}"/></circle>`);
        });
        if (!routes.length && o.water > 0) out.push(`<circle r="4.6" fill="#3aa0ff" stroke="#fff" stroke-width="1.5"><animateMotion dur="2.4s" repeatCount="indefinite" path="${toD(trunk)}"/></circle>`);
      }
    }

    // ---- بطاقات أسماء (عند الطلب) ----
    if (o.labels) {
      const lp = bz(0.48, B, C1, C2, H);
      const tag = (x, y, t) => `<g class="tag" transform="translate(${f(x)} ${f(y)})"><rect x="-38" y="-14" width="76" height="28" rx="14" fill="#fbf6ec" stroke="#1b1b18" stroke-width="1.5"/><text y="6" text-anchor="middle" font-size="15" font-weight="700" fill="#1b1b18">${t}</text></g>`;
      out.push(tag(H[0] + 78, H[1] - 30, 'الزهرة'), tag(lp[0] - 100, lp[1] - 4, 'الأوراق'), tag(240, G - 60, 'الساق'));
      if (!pot) out.push(tag(290, G + 80, 'الجذر'));
    }
    out.push('</svg>');
    return out.join('');
  }

  /* -------------------- نَبْتي: المساعد الذكي -------------------- */
  function nabti(mood) {
    mood = mood || 'happy';
    let eyes = '', mouth = '';
    const eyeC = '#8ff0b5';
    if (mood === 'happy') { eyes = `<path d="M40 60 q7 -9 14 0 M66 60 q7 -9 14 0" stroke="${eyeC}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`; mouth = `<path d="M52 70 q8 6 16 0" stroke="${eyeC}" stroke-width="3" fill="none" stroke-linecap="round"/>`; }
    else if (mood === 'think') { eyes = `<circle cx="47" cy="57" r="5.5" fill="${eyeC}"/><path d="M66 58 h14" stroke="${eyeC}" stroke-width="4.5" stroke-linecap="round"/><path d="M40 47 l12 -3" stroke="${eyeC}" stroke-width="2.5" stroke-linecap="round"/>`; mouth = `<path d="M54 71 h12" stroke="${eyeC}" stroke-width="3" stroke-linecap="round"/>`; }
    else if (mood === 'concern') { eyes = `<circle cx="47" cy="59" r="5" fill="${eyeC}"/><circle cx="73" cy="59" r="5" fill="${eyeC}"/><path d="M40 50 l12 3 M80 50 l-12 3" stroke="${eyeC}" stroke-width="2.5" stroke-linecap="round"/>`; mouth = `<path d="M52 73 q8 -5 16 0" stroke="${eyeC}" stroke-width="3" fill="none" stroke-linecap="round"/>`; }
    else { // cheer
      const star = (x, y) => `<path d="M${x} ${y - 8} L${x + 2.4} ${y - 2.4} L${x + 8} ${y} L${x + 2.4} ${y + 2.4} L${x} ${y + 8} L${x - 2.4} ${y + 2.4} L${x - 8} ${y} L${x - 2.4} ${y - 2.4}Z" fill="#ffd23f"/>`;
      eyes = star(47, 58) + star(73, 58); mouth = `<path d="M50 68 q10 10 20 0 z" fill="${eyeC}"/>`;
    }
    return `<svg class="nabti-svg nabti-${mood}" viewBox="0 0 120 150" role="img" aria-label="نَبْتي المساعد الذكي" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="nb-head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e9dcc2"/></linearGradient>
      <linearGradient id="nb-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17914c"/><stop offset="1" stop-color="#0b5a30"/></linearGradient></defs>
      <ellipse cx="60" cy="144" rx="30" ry="5" fill="#000" opacity=".15"/>
      <g class="nb-antenna"><path d="M60 30 V14" stroke="#0b5a30" stroke-width="3.5" stroke-linecap="round"/><path d="M60 16 C50 4 40 8 38 12 C46 18 54 18 60 16Z" fill="#3fae5a"/><path d="M60 14 C68 2 80 4 82 8 C76 16 66 17 60 14Z" fill="#5cc46f"/></g>
      <rect x="16" y="28" width="88" height="62" rx="24" fill="url(#nb-head)" stroke="#1b1b18" stroke-width="2.5"/>
      <rect x="27" y="40" width="66" height="40" rx="15" fill="#0b3a24"/>
      <rect x="31" y="43" width="58" height="8" rx="4" fill="#fff" opacity=".08"/>
      <g class="nb-face">${eyes}${mouth}</g>
      <circle cx="16" cy="58" r="6" fill="#c8102e" stroke="#1b1b18" stroke-width="2"/><circle cx="104" cy="58" r="6" fill="#c8102e" stroke="#1b1b18" stroke-width="2"/>
      <rect x="34" y="93" width="52" height="44" rx="16" fill="url(#nb-body)" stroke="#1b1b18" stroke-width="2.5"/>
      <g transform="translate(60 115)"><rect x="-8" y="-8" width="16" height="16" transform="rotate(45)" fill="#fbf6ec"/><rect x="-4.5" y="-4.5" width="9" height="9" transform="rotate(45)" fill="#c8102e"/><rect x="-1.6" y="-1.6" width="3.2" height="3.2" transform="rotate(45)" fill="#1b1b18"/></g>
      <path class="nb-arm-l" d="M34 104 q-14 4 -16 18" stroke="#1b1b18" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path class="nb-arm-r" d="M86 104 q14 -2 18 -16" stroke="#1b1b18" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="104" cy="86" r="5" fill="#fbf6ec" stroke="#1b1b18" stroke-width="2"/>
    </svg>`;
  }

  /* -------------------- زهرة شقائق النعمان مكبّرة (للاستكشاف) -------------------- */
  function flowerParts(o) {
    o = o || {};
    const hs = (label) => o.hotspots ? ` role="button" tabindex="0" aria-label="${label}"` : '';
    let petals = '';
    for (let k = 0; k < 6; k++) petals += `<ellipse cx="0" cy="-78" rx="50" ry="82" fill="url(#fp-petal)" transform="rotate(${k * 60})"/>`;
    let stamens = '';
    for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; const r1 = 40, r2 = 62 + (k % 2) * 8; stamens += `<line x1="${f(Math.cos(a) * r1)}" y1="${f(Math.sin(a) * r1)}" x2="${f(Math.cos(a) * r2)}" y2="${f(Math.sin(a) * r2)}" stroke="#2a1a2e" stroke-width="2.5"/><circle cx="${f(Math.cos(a) * r2)}" cy="${f(Math.sin(a) * r2)}" r="5" fill="#3a2a40"/><circle cx="${f(Math.cos(a) * r2 - 1)}" cy="${f(Math.sin(a) * r2 - 1)}" r="1.8" fill="#e9d66b"/>`; }
    return `<svg class="flower-svg" viewBox="-200 -200 400 400" role="img" aria-label="زهرة شقائق النعمان مكبّرة" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="fp-petal" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#5a0614"/><stop offset=".3" stop-color="#c8102e"/><stop offset="1" stop-color="#ff5a6e"/></radialGradient></defs>
      <g class="fpart" data-fpart="petals"${hs('البتلات')}>${petals}</g>
      <g class="fpart" data-fpart="stamens"${hs('الأسدية وحبوب اللقاح')}><circle r="75" fill="transparent"/>${stamens}</g>
      <g class="fpart" data-fpart="pistil"${hs('المدقة')}><circle r="36" fill="#1b1b18"/><circle r="26" fill="#2c3a2a"/><g fill="#4b6a45">${Array.from({ length: 12 }, (_, k) => { const a = k / 12 * Math.PI * 2; return `<circle cx="${f(Math.cos(a) * 14)}" cy="${f(Math.sin(a) * 14)}" r="4"/>`; }).join('')}<circle r="6"/></g></g>
    </svg>`;
  }

  PR.art = { plant, nabti, flowerParts, mix };
})(typeof self !== 'undefined' ? self : this);
