/* home.js — الصفحة الرئيسية */
(function () {
  'use strict';
  const PR = window.PR;
  PR.pages.home = function () {
    const { $ } = PR.util;
    // لولو تبدأ ذابلة وتطلب المساعدة، وتظهر سطور القصة واحدًا تلو الآخر مثل بداية لعبة
    $('#hero-lulu').innerHTML = PR.lulu.html('مرحبًا يا عالم النبات الصغير! 🌱', 'help', { health: 40, cls: 'hero' });
    const lines = document.querySelectorAll('.story-lines li');
    lines.forEach((li, i) => setTimeout(() => li.classList.add('on'), PR.settings.reduceMotion ? 0 : 350 + i * 650));
    setTimeout(() => { $('#hero-lulu').innerHTML = PR.lulu.html('أنا أشعر بالعطش... هل تساعدني؟ 💧', 'help', { health: 35, cls: 'hero' }); }, PR.settings.reduceMotion ? 0 : 3200);
    if (PR.audio) PR.audio.narrate('welcome');
    $('#hero-nabti').innerHTML = PR.art.nabti('happy');
    const p = PR.progress.current();
    const start = $('#start-btn');
    if (p && p.diagnosticResults) {
      start.href = 'map.html'; start.textContent = '🚀 تابع مهمة الإنقاذ';
      $('#continue-note').textContent = `مرحبًا بعودتك يا ${p.name}! تقدّمك محفوظ (${PR.util.pct(p.progress)}).`;
    } else if (p) {
      start.href = 'diagnostic.html';
      $('#continue-note').textContent = `${p.name}، مهمة اكتشاف المستوى بانتظارك.`;
    }
    $('#access-btn').onclick = () => PR.ui.openA11y();
    $('#how-btn').onclick = () => PR.modal(`<h2>📖 كيف ألعب؟</h2>
      <ol class="how-list">
        <li><b>🧠 اكتشف مستواك:</b> أجب عن ٨ أسئلة قصيرة. لا بأس إن أخطأت، فهي لمعرفتك فقط.</li>
        <li><b>🧭 احصل على مسارك:</b> يختار نَبْتي لك مسارًا يناسبك: 🟢 مستكشف متقدم، أو 🟡 مستكشف متوسط، أو 🔵 مستكشف يحتاج إلى دعم.</li>
        <li><b>🗺️ تنقّل في خريطة المغامرة:</b> تُفتح المحطات واحدة بعد أخرى، وتحصل على ختم في «جواز سفر عالم النبات».</li>
        <li><b>💬 ساعد لولو:</b> في كل محطة تخبرك لولو بمشكلتها، فتجيب وتشاهد ما يحدث لها.</li>
        <li><b>💡 اطلب المساعدة:</b> زر «أحتاج إلى مساعدة» يعطيك تلميحًا، ولن يعطيك نَبْتي الإجابة مباشرة.</li>
        <li><b>🔬 جرّب في مختبر العالم الصغير:</b> 🔮 توقّع، ثم 🧪 جرّب، ثم 👀 شاهد، ثم 💡 فسّر.</li>
        <li><b>🚨 أنقذ لولو:</b> اجمع الأدلة، وحدّد المشكلة والجزء والحل.</li>
        <li><b>🏆 اجمع:</b> ⭐ النجوم، و🌱 البذور، و💧 القطرات، و🏅 الشارات، واحصل على شهادتك.</li>
      </ol>
      <p class="muted">⌨️ كل الأنشطة تعمل بلوحة المفاتيح أيضًا: Tab للتنقل، وEnter للاختيار.</p>
      <div class="row-end"><button class="btn btn-primary" data-close="ok">فهمت! 🚀</button></div>`, { label: 'كيف ألعب' });
    // على الهاتف لا تُفتح فقاعة نَبْتي تلقائيًا حتى لا تغطي زر البداية
    if (window.innerWidth > 700) setTimeout(() => PR.nabti.say('مرحبًا يا عالم النبات الصغير! أنا نَبْتي، وسأساعدك في إنقاذ لولو.', 'happy'), 600);
  };
})();
