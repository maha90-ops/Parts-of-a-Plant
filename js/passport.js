/* =========================================================================
   passport.js — «جواز سفر عالم النبات»
   ختم لكل محطة تُنجَز (الجذر، الساق، الأوراق، الزهرة، المختبر، إنقاذ لولو).
   عند اكتمال الأختام الستة يظهر اللقب: 🏆 «عالم نبات صغير».
   ========================================================================= */
(function (root) {
  'use strict';
  const PR = root.PR = root.PR || {};
  const D = PR.data;
  const ar = D.util.ar;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const STAMPS = [
    { key: 'roots', i: '🌱', t: 'الجذر' },
    { key: 'stem', i: '🌿', t: 'الساق' },
    { key: 'leaves', i: '🍃', t: 'الأوراق' },
    { key: 'flower', i: '🌸', t: 'الزهرة' },
    { key: 'lab', i: '🔬', t: 'المختبر' },
    { key: 'rescue', i: '🚨', t: 'إنقاذ لولو' },
  ];
  const isDone = (p, k) => !!(p.zones && p.zones[k] && p.zones[k].status === 'done');
  function count(p) { return STAMPS.filter((s) => isDone(p, s.key)).length; }

  function html(p, opts) {
    opts = opts || {};
    const n = count(p), all = n === STAMPS.length;
    const date = (k) => { const z = p.zones && p.zones[k]; return z && z.completedAt ? new Date(z.completedAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : ''; };
    return `<div class="passport ${all ? 'complete' : ''}" aria-label="جواز سفر عالم النبات: ${ar(n)} من ${ar(STAMPS.length)} أختام">
      <div class="pp-cover"><div class="pp-emblem" aria-hidden="true">🌱</div><div><p class="pp-kicker">جواز سفر</p><h3 class="pp-title">عالم النبات</h3>
        <p class="pp-owner">${esc(p.name)}${p.grade ? ` · ${esc(p.grade)}` : ''}</p></div></div>
      <ol class="pp-grid">${STAMPS.map((s) => {
        const done = isDone(p, s.key);
        return `<li class="pp-slot ${done ? 'stamped' : ''} ${opts.fresh === s.key ? 'fresh' : ''}">
          <span class="pp-stamp" aria-hidden="true"><span class="pp-i">${s.i}</span>${done ? '<span class="pp-ok">✓ تم</span>' : ''}</span>
          <b>${s.t}</b><small>${done ? `✅ تم الإنجاز ${date(s.key) ? '· ' + date(s.key) : ''}` : 'لم يُختم بعد'}</small></li>`;
      }).join('')}</ol>
      <div class="pp-foot">${all ? '<span class="pp-title-won">🏆 عالم نبات صغير</span>' : `<span>🗂️ الأختام: <b>${ar(n)} / ${ar(STAMPS.length)}</b></span><span class="pp-bar"><i style="width:${(n / STAMPS.length) * 100}%"></i></span>`}</div>
    </div>`;
  }

  /** نافذة الختم الجديد بعد إنهاء محطة */
  function stamp(p, key) {
    const s = STAMPS.find((x) => x.key === key); if (!s) return Promise.resolve();
    const all = count(p) === STAMPS.length;
    PR.sfx.play('badge');
    return PR.modal(`<div class="center"><p class="eyebrow">🗂️ ختم جديد!</p><h2>${s.i} ختم محطة «${s.t}»</h2>
      ${html(p, { fresh: key })}
      ${all ? '<p class="vmsg olive">🏆 اكتملت الأختام الستة! أصبحت «عالم نبات صغيرًا».</p>' : ''}
      <div class="row-end" style="justify-content:center"><button class="btn btn-primary" data-close="ok">رائع! تابع ←</button></div></div>`, { label: 'ختم جديد في جواز السفر', cls: 'wide' });
  }

  PR.passport = { STAMPS, html, stamp, count };
})(typeof self !== 'undefined' ? self : this);
