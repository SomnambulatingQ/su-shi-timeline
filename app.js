/* =========================================================
   苏轼人生经历 · 时间轴对话课
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var DATA = window.FX_DATA || {};
  var MILESTONES = DATA.milestones || [];
  var ANSWERS = DATA.answers || [];
  var LIFE = DATA.lifeSummary || { title: '', points: [] };
  var STORE_KEY = 'su-shi-timeline-v1';

  var POINTS = [{ x: 16, y: 48 }, { x: 40, y: 28 }, { x: 64, y: 58 }, { x: 88, y: 38 }];

  var state = {
    completed: [],
    current: null,
    muted: false,
    busy: false,
    dur: 0
  };

  var el = {
    nodes: $('#nodes'),
    pill: $('#pill'),
    summary: $('#summary'),
    summaryTitle: $('#summaryTitle'),
    summaryPoints: $('#summaryPoints'),
    storyModal: $('#storyModal'),
    storyClose: $('#storyClose'),
    storyEyebrow: $('#storyEyebrow'),
    storyTitle: $('#storyTitle'),
    storyMeta: $('#storyMeta'),
    storyText: $('#storyText'),
    storyValue: $('#storyValue'),
    storyNext: $('#storyNext'),
    storyPlay: $('#storyPlay'),
    storyBar: $('#storyBar'),
    storyFill: $('#storyFill'),
    storyTime: $('#storyTime'),
    chatModal: $('#chatModal'),
    chatClose: $('#chatClose'),
    chatLog: $('#chatLog'),
    chatForm: $('#chatForm'),
    chatInput: $('#chatInput'),
    quick: $('#quickPrompts'),
    mute: $('#btnMute'),
    muteLabel: $('#muteLabel'),
    btnChat: $('#btnChat'),
    btnReset: $('#btnReset')
  };

  var audio = document.getElementById('fxAudio') || new Audio();
  audio.preload = 'auto';

  /* ---------- 进度 ---------- */

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var ids = raw ? JSON.parse(raw) : [];
      var valid = new Set(MILESTONES.map(function (m) { return m.id; }));
      state.completed = (ids || []).filter(function (id) { return valid.has(id); });
    } catch (e) { state.completed = []; }
  }

  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.completed)); } catch (e) { /* ignore */ }
  }

  /* ---------- 时间轴渲染 ---------- */

  function iconLock() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  }
  function iconSpark() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/></svg>';
  }

  function renderNodes() {
    el.nodes.innerHTML = '';
    var nextIndex = state.completed.length;

    MILESTONES.forEach(function (m, i) {
      var p = POINTS[i] || POINTS[POINTS.length - 1];
      var done = state.completed.indexOf(m.id) !== -1;
      var unlocked = i <= nextIndex;
      var glowing = i === nextIndex && !done;

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'node' + (glowing ? ' glowing' : '') + (done ? ' done' : '') + (unlocked ? '' : ' locked') + (i === MILESTONES.length - 1 ? ' reverse' : '');
      b.style.left = p.x + '%';
      b.style.top = p.y + '%';
      b.setAttribute('aria-label', unlocked ? ('打开第' + (i + 1) + '站：' + m.year + ' ' + m.place) : '完成前一站后解锁');

      var dot = document.createElement('span');
      dot.className = 'node-dot';
      dot.innerHTML = unlocked ? (glowing ? iconSpark() : String(i + 1)) : iconLock();

      var label = document.createElement('span');
      label.className = 'node-label';
      label.innerHTML = '<strong>' + m.year + ' · ' + m.place + '</strong><small>' + m.work + '</small>';

      b.appendChild(dot);
      b.appendChild(label);
      b.addEventListener('click', function () {
        if (!unlocked) { return; }
        openStory(m);
      });
      el.nodes.appendChild(b);
    });

    el.pill.textContent = '已探索 ' + state.completed.length + ' / ' + MILESTONES.length;
  }

  function renderSummary() {
    var all = state.completed.length === MILESTONES.length;
    el.summary.hidden = !all;
    if (!all) { return; }
    el.summaryTitle.textContent = LIFE.title;
    el.summaryPoints.innerHTML = '';
    (LIFE.points || []).forEach(function (text) {
      var row = document.createElement('div');
      row.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg><span>' + text + '</span>';
      el.summaryPoints.appendChild(row);
    });
  }

  function refresh() {
    renderNodes();
    renderSummary();
  }

  /* ---------- 声音 ---------- */

  function fmt(sec) {
    if (!isFinite(sec)) { return '0:00'; }
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function play(src) {
    if (!src) { return; }
    audio.src = (window.AUDIO_DATA && window.AUDIO_DATA[src]) || ('audio/' + src);
    audio.muted = state.muted;
    var p = audio.play();
    if (p && p.catch) { p.catch(function () {}); }
  }

  function stopAudio() {
    try { audio.pause(); audio.currentTime = 0; } catch (e) { /* ignore */ }
  }

  function syncStoryPlayer() {
    var d = (isFinite(audio.duration) && audio.duration > 0) ? audio.duration : (state.dur || 0);
    var t = audio.currentTime || 0;
    var pct = d ? (t / d) * 100 : 0;
    el.storyFill.style.width = pct + '%';
    el.storyTime.textContent = fmt(t) + ' / ' + fmt(d);
    el.storyBar.setAttribute('aria-valuenow', String(Math.round(pct)));
    el.storyPlay.classList.toggle('playing', !audio.paused && !!audio.src);
  }

  audio.addEventListener('timeupdate', syncStoryPlayer);
  audio.addEventListener('loadedmetadata', syncStoryPlayer);
  audio.addEventListener('ended', syncStoryPlayer);
  audio.addEventListener('pause', syncStoryPlayer);
  audio.addEventListener('play', syncStoryPlayer);

  el.storyPlay.addEventListener('click', function () {
    if (!audio.src) { return; }
    if (audio.paused) { audio.play().catch(function () {}); } else { audio.pause(); }
  });

  el.storyBar.addEventListener('click', function (ev) {
    if (!audio.duration) { return; }
    var rect = el.storyBar.getBoundingClientRect();
    var ratio = Math.min(Math.max((ev.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * audio.duration;
    syncStoryPlayer();
  });

  el.mute.addEventListener('click', function () {
    state.muted = !state.muted;
    audio.muted = state.muted;
    el.mute.setAttribute('aria-pressed', state.muted ? 'true' : 'false');
    el.muteLabel.textContent = state.muted ? '已静音' : '声音开';
  });

  /* ---------- 叙事弹窗 ---------- */

  function openStory(m) {
    state.current = m;
    el.storyEyebrow.textContent = '苏轼人生叙事 · ' + m.year + ' · ' + m.age;
    el.storyTitle.textContent = m.title;
    el.storyMeta.innerHTML =
      '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>' +
      m.place + ' · ' + m.region + '</span>' +
      '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h7v15H4zM13 5h7v15h-7z"/></svg>' + m.work + '</span>';
    el.storyText.textContent = '“' + m.summary + '”';
    el.storyValue.textContent = m.value;

    el.storyModal.hidden = false;
    document.body.style.overflow = 'hidden';

    stopAudio();
    state.dur = m.duration || 0;
    audio.src = (window.AUDIO_DATA && window.AUDIO_DATA[m.audio]) || ('audio/' + m.audio);
    audio.load();
    syncStoryPlayer();
    el.storyPlay.classList.remove('playing');
  }

  function closeStory() {
    el.storyModal.hidden = true;
    document.body.style.overflow = '';
    stopAudio();
    state.current = null;
  }

  el.storyClose.addEventListener('click', closeStory);
  el.storyModal.addEventListener('click', function (ev) {
    if (ev.target === el.storyModal) { closeStory(); }
  });

  el.storyNext.addEventListener('click', function () {
    var m = state.current;
    if (!m) { return; }
    if (state.completed.indexOf(m.id) === -1) {
      state.completed.push(m.id);
      saveProgress();
    }
    closeStory();
    refresh();
    if (state.completed.length === MILESTONES.length) {
      window.setTimeout(function () {
        el.summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  });

  /* ---------- 对话 ---------- */

  var chatStarted = false;

  function addChat(role, text) {
    var wrap = document.createElement('div');
    wrap.className = 'message ' + role;
    var av = document.createElement('div');
    av.className = 'message-avatar';
    av.textContent = role === 'assistant' ? '苏' : '我';
    var p = document.createElement('p');
    p.textContent = text;
    wrap.appendChild(av);
    wrap.appendChild(p);
    el.chatLog.appendChild(wrap);
    el.chatLog.scrollTop = el.chatLog.scrollHeight;
    return p;
  }

  function typeInto(node, text) {
    var i = 0;
    node.textContent = '';
    node.classList.add('typing');
    var timer = window.setInterval(function () {
      i += 2;
      node.textContent = text.slice(0, i);
      el.chatLog.scrollTop = el.chatLog.scrollHeight;
      if (i >= text.length) {
        window.clearInterval(timer);
        node.textContent = text;
        node.classList.remove('typing');
        state.busy = false;
        $('#chatForm button').disabled = false;
      }
    }, 26);
  }

  function match(text) {
    var q = String(text || '').toLowerCase();
    var best = null;
    var score = 0;
    ANSWERS.forEach(function (a) {
      if (!a.keywords || !a.keywords.length) { return; }
      var s = 0;
      a.keywords.forEach(function (k) {
        if (k && q.indexOf(k.toLowerCase()) !== -1) { s += k.length; }
      });
      if (s > score) { score = s; best = a; }
    });
    return best || ANSWERS[ANSWERS.length - 1];
  }

  function ask(text) {
    if (state.busy) { return; }
    var clean = String(text || '').trim();
    if (!clean) { return; }
    state.busy = true;
    $('#chatForm button').disabled = true;

    addChat('user', clean);
    var a = match(clean);

    window.setTimeout(function () {
      var node = addChat('assistant', '');
      typeInto(node, a.a);
      play(a.audio);
    }, 420);
  }

  function openChat() {
    el.chatModal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (!chatStarted) {
      chatStarted = true;
      addChat('assistant', '同学，欢迎来问我。你可以问作品，也可以问人生路上的风雨。');
    }
  }

  function closeChat() {
    el.chatModal.hidden = true;
    document.body.style.overflow = '';
    stopAudio();
  }

  el.btnChat.addEventListener('click', openChat);
  el.chatClose.addEventListener('click', closeChat);
  el.chatModal.addEventListener('click', function (ev) {
    if (ev.target === el.chatModal) { closeChat(); }
  });

  el.chatForm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var v = el.chatInput.value;
    el.chatInput.value = '';
    ask(v);
  });

  (DATA.quickPrompts || []).forEach(function (prompt) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = prompt;
    b.addEventListener('click', function () { ask(prompt); });
    el.quick.appendChild(b);
  });

  /* ---------- 重置 ---------- */

  el.btnReset.addEventListener('click', function () {
    if (!window.confirm('确定要重新开始这段苏轼人生旅程吗？')) { return; }
    state.completed = [];
    saveProgress();
    closeStory();
    closeChat();
    refresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- 键盘 ---------- */

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') { return; }
    if (!el.storyModal.hidden) { closeStory(); }
    if (!el.chatModal.hidden) { closeChat(); }
  });

  /* ---------- 启动 ---------- */

  loadProgress();
  refresh();
})();
