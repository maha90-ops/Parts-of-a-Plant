/* =========================================================================
   home.js — الصفحة الرئيسية «مهمة إنقاذ لولو»
   - القصة: السطر الأول فورًا، والباقي خلال أقل من نصف ثانية (بلا صندوق فارغ)
   - لولو تفاعلية: لمس/مرور على الجذر أو الساق أو الأوراق أو الزهرة يُظهر فقاعة قصيرة
   - نَبْتي العائم: مخفي في قسم البداية، ويتغيّر كلامه حسب القسم (IntersectionObserver)
   - التقدّم المحفوظ (localStorage): تلوين المحطات المنجزة وتحسّن صحة لولو
   - فيديو القصة: زر تشغيل مخصّص، وأدوات التحكم تظهر بعد التشغيل فقط
   كل الحركات تحترم «إيقاف الحركات»، وكل الأصوات تحترم «المؤثرات الصوتية».
   ========================================================================= */
(function () {
  'use strict';
  const PR = window.PR;

  /* ما تقوله لولو عن كل جزء من أجزائها (قصير ومشوّق لطفل الصف الثالث) */
  const PART_LINES = {
    root: 'أنا الجذر! أشرب الماء من التربة 💧',
    stem: 'أنا الساق! أوصل الماء إلى أوراقي 🚰',
    leaf: 'أنا الورقة! أصنع الغذاء من ضوء الشمس ☀️',
    flower: 'أنا الزهرة! مني تأتي البذور 🌰',
  };
  /* نصائح نَبْتي حسب القسم الذي يقرؤه الطالب */
  const SECTION_TIPS = {
    'sec-video': ['🎬 شاهد قصة لولو أولًا… مدتها دقيقة واحدة فقط!', 'happy'],
    'sec-adaptive': ['🎒 لا تقلق! سأختار لك طريقًا يناسبك، وأساعدك كلما احتجت.', 'think'],
    'sec-stations': ['🗺️ ست محطات تنتظرك! نبدأ من مدينة الجذور 🌱', 'cheer'],
  };

  PR.pages.home = function () {
    const { $, ar } = PR.util;
    const D = PR.data;
    const reduce = () => PR.settings.reduceMotion || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const p = PR.progress.current();
    const doneIds = p ? D.ZONES.filter((z) => p.zones[z.id] && p.zones[z.id].status === 'done').map((z) => z.id) : [];
    const health = p ? PR.progress.luluHealth(p) : 35;

    /* ---------- ١) القصة: لا صندوق فارغ ---------- */
    const lines = document.querySelectorAll('.story-lines li');
    lines.forEach((li, i) => {
      if (i === 0 || reduce()) li.classList.add('on');
      else setTimeout(() => li.classList.add('on'), i * 140); // آخر سطر يظهر بعد ٠٫٤٢ ثانية
    });

    /* ---------- ٢) لولو التفاعلية في قسم البداية ---------- */
    const mood = doneIds.length === D.ZONES.length ? 'excited' : health >= 75 ? 'happy' : 'help';
    const intro = doneIds.length === D.ZONES.length ? 'أحسنت! لقد أنقذتني! 🌱💚'
      : doneIds.length ? `أشعر بتحسّن! أنجزتَ ${ar(doneIds.length)} من ${ar(D.ZONES.length)} محطات 💚` : 'مرحبًا يا عالم النبات الصغير! 🌱 المسني لتتعرّف عليّ';
    const stage = $('#hero-lulu');
    stage.innerHTML = `<div class="lulu-talk hero interactive" data-mood="${mood}">
        <div class="lt-art">${PR.art.plant({ mode: 'mound', hotspots: true, health, water: health > 60 ? 2 : 0, mood, title: 'لولو: المس أجزاءها لتتعرّف عليها' })}</div>
        <div class="lt-bubble" role="status" aria-live="polite"><b class="lt-name">🌱 لولو</b><p class="lt-text" id="lulu-line">${intro}</p></div></div>`;
    const line = $('#lulu-line'), art = $('.lt-art', stage);
    let resetT = null;
    function speakPart(part) {
      if (!PART_LINES[part]) return;
      line.textContent = PART_LINES[part];
      stage.querySelectorAll('.part').forEach((g) => g.classList.toggle('is-active', g.dataset.part === part));
      if (!reduce()) { art.classList.remove('wiggle'); void art.offsetWidth; art.classList.add('wiggle'); }
      PR.sfx.play('click'); // يحترم مفتاح «المؤثرات الصوتية»
      clearTimeout(resetT);
      resetT = setTimeout(() => { line.textContent = intro; stage.querySelectorAll('.part').forEach((g) => g.classList.remove('is-active')); }, 4500);
    }
    stage.querySelectorAll('.part').forEach((g) => {
      g.addEventListener('click', () => speakPart(g.dataset.part));
      g.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') speakPart(g.dataset.part); });
      g.addEventListener('focus', () => speakPart(g.dataset.part)); // لوحة المفاتيح: Tab يكفي
    });
    $('#hero-nabti').innerHTML = PR.art.nabti('happy');

    /* ---------- ٣) زر البداية حسب التقدّم المحفوظ ---------- */
    const start = $('#start-btn');
    if (p && p.diagnosticResults) {
      start.href = 'map.html'; start.textContent = doneIds.length === D.ZONES.length ? '🏆 شاهد شهادتك وخريطتك' : '🚀 تابع مهمة الإنقاذ';
      $('#continue-note').textContent = `مرحبًا بعودتك يا ${p.name}! تقدّمك محفوظ (${PR.util.pct(p.progress)}).`;
    } else if (p) {
      start.href = 'diagnostic.html';
      $('#continue-note').textContent = `${p.name}، لنبدأ بأسئلة «لنتعارف!» القصيرة.`;
    }

    /* ---------- ٤) المحطات: تلوين المنجز (من localStorage) ---------- */
    const tiles = document.querySelectorAll('#zp-tiles li');
    tiles.forEach((li) => {
      const z = li.dataset.zone, st = p && p.zones[z] ? p.zones[z].status : 'locked';
      li.classList.add('zt-' + (p ? st : 'new'));
      const mark = li.querySelector('.zt-done');
      if (st === 'done') { mark.textContent = '✅ تم الإنجاز'; li.setAttribute('aria-label', `${li.querySelector('b').textContent}: تم الإنجاز`); }
      else if (st === 'open') { mark.textContent = '▶ محطتك التالية'; }
    });
    const prog = $('#zp-progress');
    if (prog) prog.innerHTML = p
      ? `<span class="zp-bar" aria-hidden="true"><i style="width:${Math.round((doneIds.length / D.ZONES.length) * 100)}%"></i></span> أنجزتَ <b>${ar(doneIds.length)}</b> من <b>${ar(D.ZONES.length)}</b> محطات`
      : '🌱 ابدأ المهمة لتُضيء أول محطة!';

    /* ---------- ٥) فيديو القصة: زر تشغيل مخصّص ---------- */
    const video = $('#story-video'), vplay = $('#vplay');
    if (video && vplay) {
      const showOverlay = (on) => { vplay.hidden = !on; video.controls = !on; };
      vplay.onclick = () => { showOverlay(false); video.play().catch(() => showOverlay(true)); video.focus(); };
      video.addEventListener('play', () => showOverlay(false));
      video.addEventListener('ended', () => showOverlay(true));
      showOverlay(true);
    }

    /* ---------- ٦) نَبْتي العائم: مخفي في البداية، وناصح حسب القسم ---------- */
    const hero = $('#sec-hero');
    if ('IntersectionObserver' in window) {
      PR.nabti.setHidden(true);
      new IntersectionObserver((es) => es.forEach((e) => PR.nabti.setHidden(e.isIntersecting)), { threshold: 0.25 }).observe(hero);
      const said = {};
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting || said[e.target.id]) return;
        said[e.target.id] = true;
        const [msg, m] = SECTION_TIPS[e.target.id];
        if (window.innerWidth > 700) PR.nabti.say(msg, m); // على الهاتف لا تُفتح الفقاعة تلقائيًا
      }), { threshold: 0.45 });
      Object.keys(SECTION_TIPS).forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    }

    /* ---------- ٧) كيف ألعب؟ ---------- */
    $('#access-btn').onclick = () => PR.ui.openA11y();
    $('#how-btn').onclick = () => PR.modal(`<h2>📖 كيف ألعب؟</h2>
      <ol class="how-list">
        <li><b>🧠 لنتعارف:</b> أجب عن ٨ أسئلة قصيرة. لا بأس إن أخطأت، فهي لنعرف من أين نبدأ.</li>
        <li><b>🎒 طريقك في المغامرة:</b> يختار لك نَبْتي طريقًا يناسبك: 🟢 مستكشف متقدم، أو 🟡 مستكشف متوسط، أو 🔵 مهمة دعم إضافية.</li>
        <li><b>🗺️ تنقّل في الخريطة:</b> تُفتح المحطات واحدة بعد أخرى، وتحصل على ختم في «جواز سفر عالم النبات».</li>
        <li><b>💬 ساعد لولو:</b> في كل محطة تخبرك لولو بمشكلتها، فتجيب وتشاهد ما يحدث لها.</li>
        <li><b>💡 اطلب المساعدة:</b> زر «أحتاج إلى مساعدة» يعطيك تلميحًا، ولن يعطيك نَبْتي الإجابة مباشرة.</li>
        <li><b>🔬 مختبر العالم الصغير:</b> 🔮 توقّع، ثم 🧪 جرّب، ثم 👀 شاهد، ثم 💡 فسّر.</li>
        <li><b>🚨 أنقذ لولو:</b> اجمع الأدلة، وقرّر خطوة بخطوة، ثم أكمل «تحدي التخرج» 🎓.</li>
      </ol>
      <p class="muted">⌨️ كل الأنشطة تعمل بلوحة المفاتيح أيضًا: Tab للتنقل، وEnter للاختيار.</p>
      <div class="row-end"><button class="btn btn-primary" data-close="ok">فهمت! 🚀</button></div>`, { label: 'كيف ألعب' });

    if (PR.audio) PR.audio.narrate('welcome');
  };
})();
