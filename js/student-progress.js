/* =========================================================================
   student-progress.js — ملف الطالب وحفظ التقدم
   طبقة تخزين قابلة للاستبدال (StorageAdapter): النسخة الأولى LocalStorage،
   ويمكن لاحقًا استبدالها بـ RemoteAdapter يتصل بواجهة API دون تغيير بقية الكود.
   ========================================================================= */
(function (root) {
  'use strict';
  const PR = root.PR = root.PR || {};
  const D = PR.data, E = PR.engine;
  const KEY = 'plantRescue.v1';

  /* ---------- محوّل التخزين ---------- */
  const LocalStorageAdapter = {
    read() {
      try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
    },
    write(db) {
      try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch (e) { return false; }
    },
  };
  /* مثال لمحوّل مستقبلي:
     const RemoteAdapter = {
       async read()  { return (await fetch('/api/students')).json(); },
       async write(db){ await fetch('/api/students', {method:'PUT', body: JSON.stringify(db)}); }
     };  */
  let memoryDB = null; // احتياط عند تعطّل التخزين (وضع التصفح الخاص)

  function loadDB() {
    const db = LocalStorageAdapter.read() || memoryDB || { version: 1, currentId: null, students: {} };
    db.students = db.students || {};
    return db;
  }
  function saveDB(db) { memoryDB = db; LocalStorageAdapter.write(db); }

  /* ---------- بنية ملف الطالب ---------- */
  function newProfile(name, grade) {
    const now = new Date().toISOString();
    const zones = {};
    D.ZONES.forEach((z, i) => { zones[z.id] = { status: i === 0 ? 'open' : 'locked', stars: 0, attempts: 0, completedAt: null }; });
    return {
      studentId: 'st_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: String(name || '').trim().slice(0, 40) || 'عالم صغير',
      grade: grade || '',
      createdAt: now, updatedAt: now,
      diagnosticResults: null,
      skillMastery: Object.fromEntries(D.SKILL_ORDER.map((s) => [s, null])),
      partMastery: Object.fromEntries(D.MAIN_PARTS.map((p) => [p, 50])),
      currentPath: null,
      currentLevel: 1,
      activitiesCompleted: [],
      responses: [],
      mistakes: [],
      hintsUsed: 0,
      hintsLog: [],
      weakFlags: {},
      points: 0, seeds: 0, drops: 0, stars: 0,
      badges: [],
      zones,
      labStations: { exp: false, match: false, sim: false },
      puzzles: {},        // تحدّي البازل: لوحة لكل محطة
      puzzleActive: null,
      rescueVillage: null, // تحدّي الخيمة والزيتون في مركز الإنقاذ
      progress: 0,
      pathHistory: [],
      decisions: [],
      recommendations: [],
      rescue: null,
      postTest: null,
      certificate: null,
    };
  }

  const P = {
    KEY,
    all() { return Object.values(loadDB().students); },
    get(id) { return loadDB().students[id] || null; },
    current() { const db = loadDB(); return db.currentId ? db.students[db.currentId] || null : null; },
    setCurrent(id) { const db = loadDB(); db.currentId = id; saveDB(db); },
    create(name, grade) {
      const db = loadDB(); const p = newProfile(name, grade);
      db.students[p.studentId] = p; db.currentId = p.studentId; saveDB(db); return p;
    },
    save(profile) {
      const db = loadDB(); profile.updatedAt = new Date().toISOString();
      profile.progress = P.computeProgress(profile);
      db.students[profile.studentId] = profile; saveDB(db); return profile;
    },
    remove(id) { const db = loadDB(); delete db.students[id]; if (db.currentId === id) db.currentId = null; saveDB(db); },
    clearAll() { saveDB({ version: 1, currentId: null, students: {} }); },
    exportJSON() { return JSON.stringify(loadDB(), null, 2); },

    /** يعيد ملف الطالب الحالي أو يحوّل إلى صفحة التسجيل/التشخيص */
    require(opts) {
      const p = P.current();
      if (!p) { location.href = 'student.html'; return null; }
      if (opts && opts.diagnostic && !p.diagnosticResults) { location.href = 'diagnostic.html'; return null; }
      // ترحيل الملفات القديمة: البازل يبدأ فارغًا من الآن، والقرية تُحتسب للمناطق المنجزة سابقًا
      let changed = false;
      if (!p.puzzles) { p.puzzles = {}; p.puzzleActive = null; changed = true; }
      if (changed) P.save(p);
      return p;
    },

    computeProgress(p) {
      const done = D.ZONES.filter((z) => p.zones[z.id] && p.zones[z.id].status === 'done').length;
      return Math.round(((p.diagnosticResults ? 1 : 0) + done) / (D.ZONES.length + 1) * 100);
    },

    log(p, type, text, data) {
      p.decisions.push({ at: new Date().toISOString(), type, text, data: data || null });
      if (p.decisions.length > 200) p.decisions = p.decisions.slice(-200);
    },

    /** تسجيل استجابة: تحديث الإتقان + الأخطاء + التلميحات + المكافآت */
    recordResponse(p, r) {
      const res = E.applyResponse(p, r);
      const entry = Object.assign({ at: new Date().toISOString(), credit: Math.round(res.credit * 100) / 100 }, r);
      p.responses.push(entry);
      (r.errorsDetail || []).forEach((m) => p.mistakes.push(Object.assign({ at: entry.at, qid: r.qid, skill: r.skill, part: r.part, zone: r.zone || null, activity: r.activity || null }, m)));
      if (r.hints) {
        p.hintsUsed += r.hints;
        p.hintsLog.push({ at: entry.at, qid: r.qid, skill: r.skill, count: r.hints, auto: r.autoHints || 0 });
      }
      const rw = E.rewardFor(r);
      p.points += rw.points; p.seeds += rw.seeds;
      p.currentLevel = E.levelFor(p.points).index;
      // بازل قبة الصخرة: قطعة جديدة مع كل إجابة صحيحة
      const pz = PR.puzzle ? PR.puzzle.add(p, r) : null;
      if (pz && typeof document !== 'undefined') PR.puzzle.notify(p, pz);
      return Object.assign(res, { reward: rw });
    },

    addBadge(p, id) {
      if (!D.BADGES[id] || p.badges.includes(id)) return false;
      p.badges.push(id); P.log(p, 'badge', `حصل على شارة «${D.BADGES[id].name}»`); return true;
    },

    setPath(p, path, reasons, source) {
      const prev = p.currentPath;
      p.currentPath = path;
      p.pathHistory.push({ at: new Date().toISOString(), path, from: prev, source, reasons });
      P.log(p, 'path', prev ? `تغيّر المسار من «${(D.PATHS[prev].kid || D.PATHS[prev].name)}» إلى «${(D.PATHS[path].kid || D.PATHS[path].name)}»` : `تحدد المسار: «${(D.PATHS[path].kid || D.PATHS[path].name)}»`, { reasons });
    },

    isUnlocked(p, zoneId) { return p.zones[zoneId] && p.zones[zoneId].status !== 'locked'; },

    completeZone(p, zoneId, result) {
      const z = p.zones[zoneId];
      z.attempts += 1;
      const first = z.status !== 'done';
      z.status = 'done'; z.stars = Math.max(z.stars, result.stars || 1); z.completedAt = new Date().toISOString();
      const idx = D.ZONES.findIndex((x) => x.id === zoneId);
      const next = D.ZONES[idx + 1];
      if (next && p.zones[next.id].status === 'locked') p.zones[next.id].status = 'open';
      p.activitiesCompleted.push({ id: zoneId, at: z.completedAt, stars: result.stars, score: result.score, path: p.currentPath });
      p.stars = Object.values(p.zones).reduce((s, x) => s + (x.stars || 0), 0);
      p.drops += first ? 5 : 1;
      p.points += first ? 30 : 5;
      p.currentLevel = E.levelFor(p.points).index;
      return { first, next };
    },

    completeActivity(p, id, extra) {
      p.activitiesCompleted.push(Object.assign({ id, at: new Date().toISOString(), path: p.currentPath }, extra || {}));
    },

    luluHealth(p) {
      const done = D.ZONES.filter((z) => p.zones[z.id].status === 'done').length;
      return Math.min(100, 22 + done * 13);
    },
    nextZone(p) { return D.ZONES.find((z) => p.zones[z.id].status === 'open') || null; },
  };

  PR.progress = P;
  PR.newProfile = newProfile;
})(typeof self !== 'undefined' ? self : this);
