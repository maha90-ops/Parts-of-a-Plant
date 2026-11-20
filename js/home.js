/* home.js — الصفحة الرئيسية */
(function () {
  'use strict';
  const PR = window.PR;
  PR.pages.home = function () {
    const { $ } = PR.util;
    $('#hero-lulu').innerHTML = PR.art.plant({ mode: 'pot', health: 48, water: 0, title: 'لولو النبتة بحالة ذبول بسيطة' });
    $('#hero-nabti').innerHTML = PR.art.nabti('happy');
    const p = PR.progress.current();
    const start = $('#start-btn');
    if (p && p.diagnosticResults) {
      start.href = 'map.html'; start.textContent = '🚀 تابع المهمة';
      $('#continue-note').textContent = `مرحبًا بعودتك يا ${p.name}! تقدّمك محفوظ (${PR.util.pct(p.progress)}).`;
    } else if (p) {
      start.href = 'diagnostic.html';
      $('#continue-note').textContent = `${p.name}، مهمة اكتشاف المستوى بانتظارك.`;
    }
    $('#access-btn').onclick = () => PR.ui.openA11y();
    $('#how-btn').onclick = () => PR.modal(`<h2>📖 كيف ألعب؟</h2>
      <ol class="how-list">
        <li><b>🧠 اكتشف مستواك:</b> أجب عن ٨ أسئلة قصيرة. لا بأس إن أخطأت، فهي لمعرفتك فقط.</li>
        <li><b>🧭 احصل على مسارك:</b> يختار نَبْتي لك مسارًا يناسبك (متقدم، أو متوسط، أو علاجي).</li>
        <li><b>🗺️ تنقّل في الخريطة:</b> تُفتح المناطق واحدة بعد أخرى كلما تقدّمت.</li>
        <li><b>💡 اطلب المساعدة:</b> زر «أحتاج إلى مساعدة» يعطيك تلميحًا، ولن يعطيك نَبْتي الإجابة مباشرة.</li>
        <li><b>🔬 جرّب في المختبر:</b> غيّر الماء والضوء وحالة الأجزاء، ولاحظ ما يحدث للولو.</li>
        <li><b>🚨 أنقذ لولو:</b> اجمع الأدلة، وحدّد المشكلة والجزء والحل.</li>
        <li><b>🏆 اجمع:</b> ⭐ النجوم، و🌱 البذور، و💧 القطرات، و🏅 الشارات، واحصل على شهادتك.</li>
      </ol>
      <p class="muted">⌨️ كل الأنشطة تعمل بلوحة المفاتيح أيضًا: Tab للتنقل، وEnter للاختيار.</p>
      <div class="row-end"><button class="btn btn-primary" data-close="ok">فهمت! 🚀</button></div>`, { label: 'كيف ألعب' });
    setTimeout(() => PR.nabti.say('مرحبًا أيها العالم الصغير! لولو النبتة تحتاج إلى مساعدتك. هل أنت مستعد؟', 'happy'), 600);
  };
})();
