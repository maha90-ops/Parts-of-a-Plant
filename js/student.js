/* student.js — تسجيل الطالب + التعريف القصصي بالمهمة */
(function () {
  'use strict';
  const PR = window.PR;
  PR.pages.student = function () {
    const { $, $$, esc, ar } = PR.util;
    const rootEl = $('#student-root');
    const existing = PR.progress.all().filter((s) => !s.demo).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    function renderForm() {
      rootEl.innerHTML = `<div class="join-grid">
        <section class="card join-card reveal">
          <p class="eyebrow">الخطوة الأولى</p>
          <h1 class="h-md">🔬 سجّل بطاقة عالم النبات الصغير</h1>
          <form id="join" novalidate>
            <div class="field"><label for="nm">ما اسمك؟</label><input class="input" id="nm" name="nm" autocomplete="given-name" maxlength="40" required placeholder="اكتب اسمك هنا"></div>
            <div class="field"><label for="gr">صفّك</label><select class="input" id="gr"><option>الثالث الأساسي</option><option selected>الرابع الأساسي</option><option>الخامس الأساسي</option><option>السادس الأساسي</option></select></div>
            <p class="form-err" id="err" role="alert"></p>
            <button class="btn btn-red lg" type="submit">🚀 انطلق في المهمة</button>
          </form>
        </section>
        <aside class="card join-side">
          <div class="join-lulu">${PR.art.plant({ mode: 'pot', health: 45, water: 0 })}</div>
          ${existing.length ? `<h2 class="h-sm">أو تابع رحلتك 👋</h2><ul class="who-list">${existing.slice(0, 6).map((s) => `<li><button class="btn who" data-id="${s.studentId}">👤 ${esc(s.name)} <small class="muted">${ar(s.progress || 0)}٪</small></button></li>`).join('')}</ul>` : '<p class="muted center">بياناتك تُحفظ على هذا الجهاز تلقائيًا.</p>'}
        </aside>
      </div>`;
      $('#nm').focus();
      $('#join').onsubmit = (e) => {
        e.preventDefault();
        const name = $('#nm').value.trim();
        if (name.length < 2) { $('#err').textContent = '⚠️ اكتب اسمك (حرفان على الأقل).'; $('#nm').focus(); return; }
        const p = PR.progress.create(name, $('#gr').value);
        PR.progress.log(p, 'start', 'بدأ الطالب الرحلة'); PR.progress.save(p);
        PR.ui.refreshStats();
        story(p, 0);
      };
      $$('.who', rootEl).forEach((b) => b.onclick = () => {
        PR.progress.setCurrent(b.dataset.id);
        const p = PR.progress.current();
        location.href = p.diagnosticResults ? 'map.html' : 'diagnostic.html';
      });
    }

    const SLIDES = [
      (p) => ({ art: PR.art.plant({ mode: 'pot', health: 32, water: 0 }), nabti: 'concern', eyebrow: 'الفصل الأول', title: 'لولو بدأت تذبل…',
        text: `مرحبًا أيها العالم الصغير ${p.name}! لولو النبتة تحتاج إلى مساعدتك. هناك مشكلة في أحد أجزاء النبات، ومهمتك أن تكتشف وظيفة كل جزء وتستخدم معرفتك لإنقاذها.` }),
      (p) => ({ art: idCard(p), nabti: 'cheer', eyebrow: 'الفصل الثاني', title: 'أنت الآن: عالم النبات الصغير 🔬',
        text: 'هذه بطاقتك العلمية. ستجمع ⭐ النجوم و🌱 البذور و💧 القطرات، وتربح الشارات في كل منطقة.' }),
      () => ({ art: `<div class="diag-intro">${['🔎 التعرف', '🏷️ التسمية', '⚙️ الوظائف', '🔗 الربط', '💬 التفسير', '🧩 الاستنتاج', '🛠️ التطبيق', '🚑 حل المشكلات'].map((s) => `<span class="chip">${s}</span>`).join('')}</div>`, nabti: 'think', eyebrow: 'الفصل الثالث', title: '🧠 مهمة اكتشاف المستوى',
        text: 'قبل أن نبدأ، سأتعرّف على ما تعرفه. أجب عن ٨ أسئلة قصيرة. يمكنك طلب تلميح، وسأسجّل ذلك لأختار لك المسار المناسب. لا تقلق من الخطأ!' }),
    ];
    function idCard(p) {
      return `<div class="id-card"><div class="id-top"><span>🇵🇸 مختبر لولو النباتي</span><span>بطاقة عالِم</span></div>
        <div class="id-body"><div class="id-avatar">🔬</div><div><p class="id-name">${esc(p.name)}</p><p>عالم النبات الصغير</p><p class="muted small">${esc(p.grade)} · ${new Date().toLocaleDateString('ar-EG')}</p></div></div>
        <div class="tatreez-strip"></div></div>`;
    }
    function story(p, i) {
      const s = SLIDES[i](p);
      rootEl.innerHTML = `<section class="story card reveal" aria-live="polite">
        <div class="story-art">${s.art}</div>
        <div class="story-text"><p class="eyebrow">${s.eyebrow} · ${ar(i + 1)}/${ar(SLIDES.length)}</p><h1 class="h-md">${esc(s.title)}</h1>
          <div class="story-bubble"><div class="sb-nabti">${PR.art.nabti(s.nabti)}</div><p>${esc(s.text)}</p></div>
          <div class="row-end">${PR.ui.speakBtn(s.text)}${i > 0 ? '<button class="btn" id="back">→ السابق</button>' : ''}<button class="btn btn-primary lg" id="next">${i < SLIDES.length - 1 ? 'التالي ←' : '🧠 ابدأ مهمة اكتشاف المستوى'}</button></div>
          <div class="dots" aria-hidden="true">${SLIDES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        </div></section>`;
      PR.nabti.say(s.text, s.nabti);
      $('#next').focus();
      $('#next').onclick = () => { if (i < SLIDES.length - 1) story(p, i + 1); else location.href = 'diagnostic.html'; };
      const back = $('#back'); if (back) back.onclick = () => story(p, i - 1);
    }

    const cur = PR.progress.current();
    if (new URLSearchParams(location.search).get('intro') === '1' && cur) story(cur, 0);
    else renderForm();
  };
})();
