/* Biliardo Tournament — application
 * Static single-page app. No login, no server: all data lives in localStorage.
 * Hash routes: #/  #/play  #/tournaments  #/tournaments/new  #/t/:id  #/match/:id
 *              #/leaderboard  #/people  #/rules/:cat  #/data
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */
  var KEY = 'biliardo-tournament.v1';

  var CATS = {
    eightball: { id: 'eightball', name: '8-Ball', mode: 'race', unit: 'Racks', one: 'Rack', race: 5, threeFoul: false, ball: '8', color: '#15171a' },
    nineball:  { id: 'nineball',  name: '9-Ball', mode: 'race', unit: 'Racks', one: 'Rack', race: 7, threeFoul: true,  ball: '9', color: '#f5c518', stripe: true },
    tenball:   { id: 'tenball',   name: '10-Ball', mode: 'race', unit: 'Racks', one: 'Rack', race: 7, threeFoul: true, ball: '10', color: '#2f6fe0', stripe: true },
    straight:  { id: 'straight',  name: 'Straight Pool', mode: 'points', unit: 'Points', one: 'Game', race: 1, target: 100, threeFoul: true, ball: '14', color: '#7a2a8f', stripe: true },
    snooker:   { id: 'snooker',   name: 'Snooker', mode: 'frames', unit: 'Frames', one: 'Frame', race: 3, threeFoul: false, ball: '', color: '#c8102e' },
    fivepins:  { id: 'fivepins',  name: 'Italian 5-Pins', mode: 'sets', unit: 'Sets', one: 'Set', race: 2, target: 60, threeFoul: false, ball: '', color: '#e8e2d0' }
  };
  var CAT_ORDER = ['eightball', 'nineball', 'tenball', 'straight', 'snooker', 'fivepins'];
  var CAT_BLURB = {
    eightball: 'Solids vs stripes, then the 8.',
    nineball: 'Rotation 1–9. The 9 wins.',
    tenball: 'Rotation 1–10, every shot called.',
    straight: '14.1 continuous to a target score.',
    snooker: '15 reds, six colours, best of frames.',
    fivepins: 'Italian carom game with pins.'
  };
  var SNOOKER_BALLS = [
    { n: 1, name: 'Red', c: '#c8102e' }, { n: 2, name: 'Yellow', c: '#f5c518' }, { n: 3, name: 'Green', c: '#138a43' },
    { n: 4, name: 'Brown', c: '#7b4a26' }, { n: 5, name: 'Blue', c: '#1f5fd1' }, { n: 6, name: 'Pink', c: '#f28cb1' },
    { n: 7, name: 'Black', c: '#111' }
  ];

  /* ------------------------------------------------------------------ *
   * Utilities
   * ------------------------------------------------------------------ */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function cleanName(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 40); }
  function intIn(v, min, max, def) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) return def;
    return Math.min(max, Math.max(min, n));
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function fmtClock(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
  }
  function fmtTime(ts) {
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    catch (e) { return ''; }
  }
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return ''; }
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function initials(name) {
    var p = cleanName(name).split(' ').filter(Boolean);
    if (!p.length) return '?';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ------------------------------------------------------------------ *
   * Storage
   * ------------------------------------------------------------------ */
  function defaults() { return { version: 1, players: [], referees: [], tournaments: [], matches: [], sessions: [] }; }

  function normalize(d) {
    var o = defaults();
    if (!d || typeof d !== 'object') return o;
    ['players', 'referees', 'tournaments', 'matches', 'sessions'].forEach(function (k) {
      o[k] = Array.isArray(d[k]) ? d[k].filter(function (x) { return x && typeof x === 'object' && typeof x.id === 'string'; }) : [];
    });
    o.players.forEach(function (p) { p.name = cleanName(p.name) || 'Player'; });
    o.referees.forEach(function (r) { r.name = cleanName(r.name) || 'Referee'; });
    o.matches = o.matches.filter(function (m) { return CATS[m.category]; });
    o.matches.forEach(function (m) {
      if (!Array.isArray(m.log)) m.log = [];
      if (!Array.isArray(m.hist)) m.hist = [];
      ['s1', 's2', 'g1', 'g2', 'tp1', 'tp2', 'f1', 'f2', 'cf1', 'cf2'].forEach(function (k) { m[k] = Number(m[k]) || 0; });
      m.raceTo = intIn(m.raceTo, 1, 99, CATS[m.category].race);
      m.target = intIn(m.target, 0, 1000, CATS[m.category].target || 0);
      if (m.breaker !== 2) m.breaker = 1;
      if (['pending', 'live', 'done', 'bye'].indexOf(m.status) < 0) m.status = 'pending';
    });
    o.tournaments = o.tournaments.filter(function (t) { return CATS[t.category] && Array.isArray(t.playerIds); });
    o.tournaments.forEach(function (t) { if (!Array.isArray(t.refereeIds)) t.refereeIds = []; });
    o.sessions = o.sessions.filter(function (x) { return Array.isArray(x.players) && x.players.length >= 2 && x.players.length <= 4; });
    o.sessions.forEach(function (x) {
      if (!CATS[x.category]) x.category = 'eightball';
      if (!Array.isArray(x.games)) x.games = [];
      x.games = x.games.map(Number).filter(function (w) { return w >= 0 && w < x.players.length; });
      x.maxGames = intIn(x.maxGames, 1, 15, 15);
      if (x.status !== 'done') x.status = 'live';
      if (typeof x.winnerIdx !== 'number') x.winnerIdx = -1;
      x.startedAt = Number(x.startedAt) || Date.now();
    });
    return o;
  }

  var storageOk = true;
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? normalize(JSON.parse(raw)) : defaults();
    } catch (e) { storageOk = false; return defaults(); }
  }
  var saveWarned = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); storageOk = true; }
    catch (e) {
      storageOk = false;
      if (!saveWarned) { saveWarned = true; toast('Could not save to this browser. Data will be lost when the tab closes — export a backup.', 'warn'); }
    }
  }

  var db = load();

  /* ------------------------------------------------------------------ *
   * Lookups
   * ------------------------------------------------------------------ */
  function find(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function P(id) { return id ? find(db.players, id) : null; }
  function R(id) { return id ? find(db.referees, id) : null; }
  function T(id) { return id ? find(db.tournaments, id) : null; }
  function M(id) { return id ? find(db.matches, id) : null; }
  function pName(id) { if (!id) return 'TBD'; var p = P(id); return p ? p.name : 'Unknown'; }
  function rName(id) { var r = R(id); return r ? r.name : ''; }
  function tMatches(t) {
    return db.matches.filter(function (m) { return m.tId === t.id; })
      .sort(function (a, b) { return a.round - b.round || a.idx - b.idx; });
  }
  function playerByName(name) {
    var n = cleanName(name).toLowerCase();
    for (var i = 0; i < db.players.length; i++) if (db.players[i].name.toLowerCase() === n) return db.players[i];
    return null;
  }
  function refByName(name) {
    var n = cleanName(name).toLowerCase();
    for (var i = 0; i < db.referees.length; i++) if (db.referees[i].name.toLowerCase() === n) return db.referees[i];
    return null;
  }
  function ensurePlayer(name) {
    var n = cleanName(name); if (!n) return null;
    var p = playerByName(n);
    if (!p) { p = { id: uid(), name: n, createdAt: Date.now() }; db.players.push(p); }
    return p;
  }
  function ensureReferee(name) {
    var n = cleanName(name); if (!n) return null;
    var r = refByName(n);
    if (!r) { r = { id: uid(), name: n, createdAt: Date.now() }; db.referees.push(r); }
    return r;
  }
  function playerInUse(id) {
    return db.matches.some(function (m) { return m.p1 === id || m.p2 === id; }) ||
      db.sessions.some(function (x) { return x.players.indexOf(id) >= 0; }) ||
      db.tournaments.some(function (t) { return t.playerIds.indexOf(id) >= 0; });
  }

  /* ------------------------------------------------------------------ *
   * Matches
   * ------------------------------------------------------------------ */
  function newMatch(o) {
    return {
      id: uid(), tId: o.tId || null, round: o.round || 0, idx: o.idx || 0,
      category: o.category, raceTo: o.raceTo, target: o.target || 0,
      p1: o.p1 || null, p2: o.p2 || null, refId: o.refId || null,
      s1: 0, s2: 0, g1: 0, g2: 0, tp1: 0, tp2: 0, f1: 0, f2: 0, cf1: 0, cf2: 0,
      breaker: o.breaker === 2 ? 2 : 1, breakRule: o.breakRule === 'winner' ? 'winner' : 'alternate',
      status: 'pending', winner: 0, winnerId: null, wo: false,
      log: [], hist: [], createdAt: Date.now(), startedAt: null, endedAt: null
    };
  }
  function cat(m) { return CATS[m.category]; }
  function other(side) { return side === 1 ? 2 : 1; }
  function sideName(m, side) { return pName(m['p' + side]); }
  function raceLabel(m) {
    var c = cat(m);
    if (c.mode === 'points') return 'Target ' + m.target;
    if (c.mode === 'frames') return 'Best of ' + (m.raceTo * 2 - 1);
    if (c.mode === 'sets') return 'Race to ' + m.raceTo + ' sets · ' + m.target + ' pts';
    return 'Race to ' + m.raceTo;
  }

  function addLog(m, side, kind, text) { m.log.push({ t: Date.now(), side: side, kind: kind, text: text }); }

  var SNAP_KEYS = ['s1', 's2', 'g1', 'g2', 'tp1', 'tp2', 'f1', 'f2', 'cf1', 'cf2', 'breaker', 'status', 'winner', 'winnerId', 'endedAt', 'wo'];
  function snapshot(m) {
    var s = { logLen: m.log.length };
    SNAP_KEYS.forEach(function (k) { s[k] = m[k]; });
    return JSON.stringify(s);
  }

  /* gesture to play on the referee after the next render */
  var pendingGesture = null;
  function gesture(type, text) { pendingGesture = { type: type, text: text }; }

  function winGame(m, side, reason) {
    var c = cat(m);
    m['s' + side] += 1;
    m.g1 = 0; m.g2 = 0; m.cf1 = 0; m.cf2 = 0;
    var score = m.s1 + '–' + m.s2;
    if (c.mode !== 'points') addLog(m, side, 'game', c.one + ' to ' + sideName(m, side) + (reason ? ' (' + reason + ')' : '') + ' · ' + score);
    if (m['s' + side] >= m.raceTo) { finish(m, side); return; }
    if (c.mode === 'race' && m.breakRule === 'winner') m.breaker = side;
    else m.breaker = other(m.breaker);
    gesture(side === 1 ? 'left' : 'right', c.one + ' to ' + sideName(m, side));
  }

  function finish(m, side) {
    var c = cat(m);
    m.status = 'done'; m.winner = side; m.winnerId = m['p' + side]; m.endedAt = Date.now();
    var sc = c.mode === 'points' ? (m.tp1 + '–' + m.tp2) : (m.s1 + '–' + m.s2);
    addLog(m, side, 'win', sideName(m, side) + ' wins the match ' + sc + (m.wo ? ' (walkover)' : ''));
    advance(m);
    gesture('win', sideName(m, side) + ' wins!');
    celebrate = true;
  }

  function addPoints(m, side, n, label) {
    var c = cat(m);
    m['g' + side] += n; m['tp' + side] += n;
    if (n > 0) m['cf' + side] = 0;
    addLog(m, side, 'pts', sideName(m, side) + ' ' + (n >= 0 ? '+' : '−') + Math.abs(n) + (label ? ' · ' + label : '') + ' (' + m.g1 + '–' + m.g2 + ')');
    if ((c.mode === 'points' || c.mode === 'sets') && m['g' + side] >= m.target) {
      winGame(m, side);
      return;
    }
    if (n > 0) gesture(side === 1 ? 'left' : 'right', '+' + n + ' ' + sideName(m, side));
  }

  function doAction(m, op, side, n) {
    var c = cat(m);
    var opp = other(side);
    switch (op) {
      case 'rack':
        winGame(m, side);
        break;
      case 'foul':
        m['f' + side] += 1; m['cf' + side] += 1;
        if (c.mode === 'race') {
          addLog(m, side, 'foul', 'Foul by ' + sideName(m, side) + (c.threeFoul ? ' (' + m['cf' + side] + ' in a row)' : ''));
          gesture('foul', 'Foul · ' + sideName(m, side));
          if (c.threeFoul && m['cf' + side] >= 3) {
            addLog(m, side, 'foul', 'Three consecutive fouls — ' + sideName(m, side) + ' loses the rack');
            toast('Three consecutive fouls: rack to ' + sideName(m, opp), 'warn');
            winGame(m, opp, 'three fouls');
          } else if (c.threeFoul && m['cf' + side] === 2) {
            toast('Second consecutive foul — warn ' + sideName(m, side) + '. A third loses the rack.', 'warn');
          }
        } else if (c.mode === 'points') {
          m['g' + side] -= 1; m['tp' + side] -= 1;
          addLog(m, side, 'foul', 'Foul by ' + sideName(m, side) + ' −1 (' + m['cf' + side] + ' in a row)');
          gesture('foul', 'Foul −1 · ' + sideName(m, side));
          if (m['cf' + side] >= 3) {
            m['g' + side] -= 15; m['tp' + side] -= 15; m['cf' + side] = 0;
            addLog(m, side, 'foul', 'Third consecutive foul: extra −15 for ' + sideName(m, side) + '. Re-rack all 15; offender breaks.');
            toast('Three consecutive fouls: −15 extra for ' + sideName(m, side), 'warn');
          } else if (m['cf' + side] === 2) {
            toast('Second consecutive foul — warn ' + sideName(m, side) + '. A third costs an extra −15.', 'warn');
          }
        } else {
          /* frames (snooker) and sets (5-pins): points go to the opponent */
          var pen = n || (c.mode === 'frames' ? 4 : 2);
          m['g' + opp] += pen; m['tp' + opp] += pen;
          addLog(m, side, 'foul', 'Foul by ' + sideName(m, side) + ': +' + pen + ' to ' + sideName(m, opp) + ' (' + m.g1 + '–' + m.g2 + ')');
          gesture('foul', 'Foul · +' + pen + ' ' + sideName(m, opp));
          if (c.mode === 'sets' && m['g' + opp] >= m.target) winGame(m, opp);
        }
        break;
      case 'breakfoul':
        m['f' + side] += 1; m['cf' + side] += 1;
        m['g' + side] -= 2; m['tp' + side] -= 2;
        addLog(m, side, 'foul', 'Break foul by ' + sideName(m, side) + ' −2');
        gesture('foul', 'Break foul −2');
        if (m['cf' + side] >= 3) {
          m['g' + side] -= 15; m['tp' + side] -= 15; m['cf' + side] = 0;
          addLog(m, side, 'foul', 'Third consecutive foul: extra −15 for ' + sideName(m, side));
          toast('Three consecutive fouls: −15 extra for ' + sideName(m, side), 'warn');
        }
        break;
      case 'legal':
        m['cf' + side] = 0;
        addLog(m, side, 'info', 'Legal shot by ' + sideName(m, side) + ' — foul count reset');
        break;
      case 'pts':
        addPoints(m, side, n, c.mode === 'frames' ? (SNOOKER_BALLS[n - 1] ? SNOOKER_BALLS[n - 1].name : '') : (c.mode === 'points' ? (n === 1 ? 'ball' : 'balls') : ''));
        break;
      case 'endframe':
        if (m.g1 === m.g2) { toast('Scores are level — re-spot the black and play on.', 'warn'); return false; }
        winGame(m, m.g1 > m.g2 ? 1 : 2);
        break;
      case 'concede':
        addLog(m, side, 'info', sideName(m, side) + ' concedes the ' + c.one.toLowerCase());
        winGame(m, opp, 'conceded');
        break;
      case 'swapbreak':
        m.breaker = other(m.breaker);
        addLog(m, m.breaker, 'info', sideName(m, m.breaker) + ' to break');
        break;
      case 'walkover':
        m.wo = true;
        addLog(m, side, 'info', 'Walkover awarded to ' + sideName(m, side));
        finish(m, side);
        break;
      default: return false;
    }
    return true;
  }

  function act(m, op, side, n) {
    if (!m || m.status !== 'live') { toast('This match is not live.', 'warn'); return; }
    var snap = snapshot(m);
    var changed = doAction(m, op, side, n);
    if (changed === false) return;
    m.hist.push(snap);
    if (m.hist.length > 300) m.hist.shift();
    save();
    render(true);
  }

  function undo(m) {
    if (!m || !m.hist.length) { toast('Nothing to undo.'); return; }
    var snap = JSON.parse(m.hist[m.hist.length - 1]);
    if (m.status === 'done' && snap.status !== 'done') {
      if (!canUnadvance(m)) { toast('Cannot undo: the next match in the bracket has already started.', 'warn'); return; }
      unadvance(m);
    }
    m.hist.pop();
    SNAP_KEYS.forEach(function (k) { m[k] = snap[k]; });
    m.log.length = Math.min(m.log.length, snap.logLen);
    save();
    toast('Last action undone.');
    render(true);
  }

  /* ------------------------------------------------------------------ *
   * Tournaments
   * ------------------------------------------------------------------ */
  function seedOrder(size) {
    var o = [1];
    while (o.length < size) {
      var n = o.length * 2;
      o = o.reduce(function (acc, x) { acc.push(x, n + 1 - x); return acc; }, []);
    }
    return o;
  }

  function roundName(t, r) {
    if (t.format !== 'elim') return 'Round ' + r;
    var left = t.rounds - r;
    if (left === 0) return 'Final';
    if (left === 1) return 'Semi-finals';
    if (left === 2) return 'Quarter-finals';
    return 'Round of ' + Math.pow(2, left + 1);
  }

  function buildElim(t) {
    var ids = t.playerIds.slice(), n = ids.length, size = 2;
    while (size < n) size *= 2;
    t.rounds = Math.round(Math.log(size) / Math.log(2));
    var order = seedOrder(size);
    var created = [];
    for (var r = 1; r <= t.rounds; r++) {
      var count = size / Math.pow(2, r);
      for (var i = 0; i < count; i++) {
        created.push(newMatch({ tId: t.id, round: r, idx: i, category: t.category, raceTo: t.raceTo, target: t.target, breakRule: t.breakRule }));
      }
    }
    var r1 = created.filter(function (m) { return m.round === 1; });
    r1.forEach(function (m, i) {
      var a = order[2 * i], b = order[2 * i + 1];
      m.p1 = a <= n ? ids[a - 1] : null;
      m.p2 = b <= n ? ids[b - 1] : null;
    });
    Array.prototype.push.apply(db.matches, created);
    r1.forEach(function (m) {
      if (!m.p1 || !m.p2) {
        m.status = 'bye'; m.winner = m.p1 ? 1 : 2; m.winnerId = m.p1 || m.p2; m.endedAt = Date.now();
        advance(m);
      }
    });
  }

  function buildRR(t) {
    var ids = t.playerIds.slice();
    if (ids.length % 2) ids.push(null);
    var n = ids.length, arr = ids.slice();
    t.rounds = n - 1;
    for (var r = 0; r < n - 1; r++) {
      for (var i = 0; i < n / 2; i++) {
        var a = arr[i], b = arr[n - 1 - i];
        if (a && b) {
          var flip = (r + i) % 2 === 1;
          db.matches.push(newMatch({ tId: t.id, round: r + 1, idx: i, category: t.category, raceTo: t.raceTo, target: t.target, breakRule: t.breakRule, p1: flip ? b : a, p2: flip ? a : b }));
        }
      }
      arr = [arr[0], arr[n - 1]].concat(arr.slice(1, n - 1));
    }
  }

  function nextMatch(m) {
    var t = T(m.tId);
    if (!t || t.format !== 'elim' || m.round >= t.rounds) return null;
    var ni = Math.floor(m.idx / 2);
    for (var i = 0; i < db.matches.length; i++) {
      var x = db.matches[i];
      if (x.tId === t.id && x.round === m.round + 1 && x.idx === ni) return x;
    }
    return null;
  }

  function advance(m) {
    var t = T(m.tId); if (!t) return;
    if (t.format === 'elim') {
      if (m.round === t.rounds) {
        t.championId = m.winnerId; t.status = 'done'; t.endedAt = Date.now();
        return;
      }
      var nx = nextMatch(m);
      if (nx) { if (m.idx % 2 === 0) nx.p1 = m.winnerId; else nx.p2 = m.winnerId; }
    } else {
      var all = tMatches(t);
      if (all.length && all.every(function (x) { return x.status === 'done'; })) {
        t.status = 'done'; t.endedAt = Date.now();
        var st = computeStats(all, t.playerIds);
        t.championId = st.length ? st[0].id : null;
      }
    }
  }
  function canUnadvance(m) {
    var t = T(m.tId); if (!t) return true;
    if (t.format !== 'elim' || m.round === t.rounds) return true;
    var nx = nextMatch(m);
    return !nx || nx.status === 'pending';
  }
  function unadvance(m) {
    var t = T(m.tId); if (!t) return;
    t.status = 'active'; t.championId = null; t.endedAt = null;
    if (t.format === 'elim' && m.round < t.rounds) {
      var nx = nextMatch(m);
      if (nx) { if (m.idx % 2 === 0) nx.p1 = null; else nx.p2 = null; }
    }
  }

  function resetMatch(m) {
    if (m.status === 'done') {
      if (!canUnadvance(m)) { toast('Cannot reset: the next match has already started.', 'warn'); return false; }
      unadvance(m);
    }
    var fresh = newMatch(m);
    ['s1', 's2', 'g1', 'g2', 'tp1', 'tp2', 'f1', 'f2', 'cf1', 'cf2', 'winner', 'winnerId', 'wo', 'startedAt', 'endedAt'].forEach(function (k) { m[k] = fresh[k]; });
    m.status = 'pending'; m.log = []; m.hist = []; m.breaker = 1;
    return true;
  }

  function startMatch(m, refId, breaker) {
    m.refId = refId || null;
    m.breaker = breaker === 2 ? 2 : 1;
    m.status = 'live';
    m.startedAt = Date.now();
    addLog(m, 0, 'info', 'Match started' + (m.refId ? ' · referee ' + rName(m.refId) : '') + ' · ' + sideName(m, m.breaker) + ' breaks');
  }

  /* ------------------------------------------------------------------ *
   * Statistics
   * ------------------------------------------------------------------ */
  function computeStats(matches, restrictIds) {
    var map = {}, list = [];
    function get(id) {
      if (!map[id]) { map[id] = { id: id, mp: 0, w: 0, l: 0, gf: 0, ga: 0, pf: 0, pa: 0, form: [] }; list.push(map[id]); }
      return map[id];
    }
    if (restrictIds) restrictIds.forEach(get);
    matches.filter(function (m) { return m.status === 'done' && m.p1 && m.p2; })
      .sort(function (a, b) { return (a.endedAt || 0) - (b.endedAt || 0); })
      .forEach(function (m) {
        if (restrictIds && (restrictIds.indexOf(m.p1) < 0 || restrictIds.indexOf(m.p2) < 0)) return;
        var a = get(m.p1), b = get(m.p2);
        a.mp++; b.mp++;
        a.gf += m.s1; a.ga += m.s2; b.gf += m.s2; b.ga += m.s1;
        a.pf += m.tp1; a.pa += m.tp2; b.pf += m.tp2; b.pa += m.tp1;
        if (m.winner === 1) { a.w++; b.l++; a.form.push('W'); b.form.push('L'); }
        else { b.w++; a.l++; b.form.push('W'); a.form.push('L'); }
      });
    list.forEach(function (s) {
      s.pts = s.w * 3; s.diff = s.gf - s.ga; s.pdiff = s.pf - s.pa;
      s.pct = s.mp ? s.w / s.mp : 0; s.form = s.form.slice(-5);
    });
    return list.sort(function (x, y) {
      return y.pts - x.pts || y.diff - x.diff || y.gf - x.gf || y.pdiff - x.pdiff || pName(x.id).localeCompare(pName(y.id));
    });
  }

  /* ------------------------------------------------------------------ *
   * UI helpers: toasts, dialogs, confetti
   * ------------------------------------------------------------------ */
  function toast(msg, kind) {
    var box = $('#toasts'); if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast-' + kind : '');
    el.setAttribute('role', kind === 'warn' ? 'alert' : 'status');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 3600);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4100);
  }

  var dlg = null;
  function openDialog(opts) {
    /* opts: { title, body (html), ok, okClass, cancel, onOk(formData) -> false keeps open } */
    dlg = dlg || $('#dlg');
    if (!dlg || typeof dlg.showModal !== 'function') {
      if (window.confirm(opts.plain || opts.title)) opts.onOk && opts.onOk(null);
      return;
    }
    if (dlg.open) dlg.close('cancel');
    dlg.innerHTML =
      '<form method="dialog" class="dialog-form" novalidate>' +
        '<h2 class="dialog-title">' + esc(opts.title) + '</h2>' +
        '<div class="dialog-body">' + (opts.body || '') + '</div>' +
        '<div class="dialog-actions">' +
          (opts.cancel === false ? '' : '<button type="button" class="btn btn-ghost" data-dlg="cancel">' + esc(opts.cancel || 'Cancel') + '</button>') +
          '<button type="submit" class="btn ' + (opts.okClass || 'btn-primary') + '" value="ok">' + esc(opts.ok || 'OK') + '</button>' +
        '</div>' +
      '</form>';
    var form = $('form', dlg);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('[required]', form).filter(function (i) { return !i.checkValidity(); });
      if (bad.length) { bad[0].reportValidity(); return; }
      var res = opts.onOk ? opts.onOk(new FormData(form)) : true;
      if (res !== false) dlg.close('ok');
    });
    $('[data-dlg="cancel"]', dlg) && $('[data-dlg="cancel"]', dlg).addEventListener('click', function () { dlg.close('cancel'); });
    dlg.showModal();
    var first = $('input:not([type=hidden]),select,textarea', form) || $('button[type=submit]', form);
    if (first) first.focus();
  }
  function confirmDialog(title, text, ok, danger, onOk) {
    openDialog({ title: title, plain: title + '\n\n' + text, body: '<p>' + esc(text) + '</p>', ok: ok || 'Confirm', okClass: danger ? 'btn-danger' : 'btn-primary', onOk: function () { onOk(); } });
  }
  function promptNumber(title, label, min, max, def, onOk) {
    openDialog({
      title: title,
      body: '<label class="field"><span>' + esc(label) + '</span><input type="number" name="n" inputmode="numeric" min="' + min + '" max="' + max + '" value="' + def + '" required></label>',
      ok: 'Add',
      onOk: function (fd) {
        var v = parseInt(fd.get('n'), 10);
        if (!isFinite(v) || v < min || v > max) { toast('Enter a number from ' + min + ' to ' + max + '.', 'warn'); return false; }
        onOk(v);
      }
    });
  }

  var celebrate = false;
  function confetti() {
    if (reducedMotion()) return;
    var cv = $('#confetti'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var W = cv.width = window.innerWidth, H = cv.height = window.innerHeight;
    cv.style.display = 'block';
    var colors = ['#f5c518', '#2f6fe0', '#c8102e', '#7a2a8f', '#f08a24', '#138a43', '#ffffff'];
    var parts = [];
    for (var i = 0; i < 160; i++) {
      parts.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 5 + 3, c: colors[i % colors.length], a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3 });
    }
    var start = performance.now();
    (function frame(now) {
      var dt = now - start;
      ctx.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - dt / 2600);
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        ctx.restore();
      });
      if (dt < 2600) requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, W, H); cv.style.display = 'none'; }
    })(start);
  }

  /* ------------------------------------------------------------------ *
   * Shared render pieces
   * ------------------------------------------------------------------ */
  function ballIcon(c, size) {
    var s = size || 28;
    if (c.id === 'snooker') {
      return '<svg class="ball" width="' + s + '" height="' + s + '" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#c8102e"/><circle cx="14" cy="13" r="5" fill="rgba(255,255,255,.45)"/></svg>';
    }
    if (c.id === 'fivepins') {
      return '<svg class="ball" width="' + s + '" height="' + s + '" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3c4 0 5 5 4 9-1 3 3 7 3 13 0 7-3 12-7 12s-7-5-7-12c0-6 4-10 3-13-1-4 0-9 4-9z" fill="#f4efe1"/><rect x="14" y="14" width="12" height="3" rx="1.5" fill="#c8102e"/></svg>';
    }
    var body = c.stripe
      ? '<circle cx="20" cy="20" r="18" fill="#fff"/><path d="M3.2 13h33.6a18 18 0 0 1 0 14H3.2a18 18 0 0 1 0-14z" fill="' + c.color + '"/>'
      : '<circle cx="20" cy="20" r="18" fill="' + c.color + '"/>';
    return '<svg class="ball" width="' + s + '" height="' + s + '" viewBox="0 0 40 40" aria-hidden="true">' + body +
      '<circle cx="20" cy="20" r="8" fill="#fff"/><text x="20" y="' + (c.ball.length > 1 ? 23.2 : 24) + '" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="' + (c.ball.length > 1 ? 8.5 : 11) + '" fill="#111">' + c.ball + '</text>' +
      '<circle cx="13" cy="12" r="4" fill="rgba(255,255,255,.35)"/></svg>';
  }
  function catBadge(id) {
    var c = CATS[id]; if (!c) return '';
    return '<span class="badge badge-cat">' + ballIcon(c, 16) + esc(c.name) + '</span>';
  }
  function avatar(name, side) {
    return '<span class="avatar' + (side ? ' avatar-' + side : '') + '" aria-hidden="true">' + esc(initials(name)) + '</span>';
  }
  function emptyState(title, text, actions) {
    return '<div class="empty"><div class="empty-art">' + window.BT_REFEREE_SVG({ className: 'g-idle' }) + '</div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (actions || '') + '</div>';
  }
  function datalists() {
    return '<datalist id="dl-players">' + db.players.map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join('') + '</datalist>' +
      '<datalist id="dl-refs">' + db.referees.map(function (r) { return '<option value="' + esc(r.name) + '">'; }).join('') + '</datalist>';
  }
  function catPicker(selected, name) {
    return '<div class="cat-picker" role="radiogroup" aria-label="Category">' + CAT_ORDER.map(function (id) {
      var c = CATS[id];
      return '<label class="cat-option"><input type="radio" name="' + (name || 'category') + '" value="' + id + '"' + (id === selected ? ' checked' : '') + ' required>' +
        '<span class="cat-option-inner">' + ballIcon(c, 30) + '<b>' + esc(c.name) + '</b><small>' + esc(CAT_BLURB[id]) + '</small></span></label>';
    }).join('') + '</div>';
  }
  function formatFields(catId, raceTo, target, breakRule) {
    var c = CATS[catId];
    return '<div class="grid-3 fmt-fields">' +
      '<label class="field" data-field="race"><span data-label="race">Race to</span><input type="number" name="raceTo" min="1" max="99" value="' + (raceTo || c.race) + '" inputmode="numeric" required></label>' +
      '<label class="field" data-field="target"><span data-label="target">Target points</span><input type="number" name="target" min="1" max="1000" value="' + (target || c.target || 60) + '" inputmode="numeric"></label>' +
      '<label class="field" data-field="break"><span>Break rule</span><select name="breakRule"><option value="alternate"' + (breakRule !== 'winner' ? ' selected' : '') + '>Alternate break</option><option value="winner"' + (breakRule === 'winner' ? ' selected' : '') + '>Winner breaks</option></select></label>' +
      '</div><p class="hint" data-hint></p>';
  }
  function syncFormatFields(form, resetDefaults) {
    var checked = $('input[name="category"]:checked', form); if (!checked) return;
    var c = CATS[checked.value];
    var race = $('[data-field="race"]', form), target = $('[data-field="target"]', form), brk = $('[data-field="break"]', form);
    var raceIn = $('input[name="raceTo"]', race), targetIn = $('input[name="target"]', target);
    var hint = $('[data-hint]', form);
    race.hidden = c.mode === 'points';
    target.hidden = !(c.mode === 'points' || c.mode === 'sets');
    brk.hidden = c.mode !== 'race';
    targetIn.required = !target.hidden;
    raceIn.required = !race.hidden;
    $('[data-label="race"]', race).textContent = c.mode === 'frames' ? 'Frames to win' : c.mode === 'sets' ? 'Sets to win' : 'Race to (racks)';
    $('[data-label="target"]', target).textContent = c.mode === 'sets' ? 'Points per set' : 'Target points';
    if (resetDefaults) { raceIn.value = c.race; if (c.target) targetIn.value = c.target; }
    function updateHint() {
      var r = intIn(raceIn.value, 1, 99, c.race), tg = intIn(targetIn.value, 1, 1000, c.target || 60);
      hint.textContent = c.mode === 'race' ? 'First to ' + plural(r, 'rack', 'racks') + ' wins the match.'
        : c.mode === 'frames' ? 'Best of ' + (r * 2 - 1) + ' frames — first to ' + r + '.'
        : c.mode === 'sets' ? 'Each set to ' + tg + ' points. First to ' + plural(r, 'set', 'sets') + ' wins.'
        : 'One game: first to ' + tg + ' points wins.';
    }
    raceIn.oninput = updateHint; targetIn.oninput = updateHint;
    updateHint();
  }

  /* ------------------------------------------------------------------ *
   * Views
   * ------------------------------------------------------------------ */
  function viewHome() {
    var live = db.matches.filter(function (m) { return m.status === 'live'; }).sort(function (a, b) { return (b.startedAt || 0) - (a.startedAt || 0); });
    var activeT = db.tournaments.filter(function (t) { return t.status !== 'done'; });
    var top = computeStats(db.matches).filter(function (s) { return s.mp > 0; }).slice(0, 5);

    var html = '<section class="hero"><div class="wrap hero-inner">' +
      '<div class="hero-copy">' +
        '<span class="eyebrow">Tournament manager · no login</span>' +
        '<h1>Run your billiards tournament <em>like the pros.</em></h1>' +
        '<p class="lead">Brackets and leagues, live referee scoring, an automatic leaderboard and the official rules — for 8-Ball, 9-Ball, 10-Ball, Straight Pool, Snooker and Italian 5-Pins.</p>' +
        '<div class="hero-actions">' +
          '<a class="btn btn-primary btn-xl" href="#/play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>Start Game</a>' +
          '<a class="btn btn-secondary btn-xl" href="#/tournaments/new">New Tournament</a>' +
          '<a class="btn btn-ghost btn-xl" href="#/free">Free Play · 2–4 players</a>' +
        '</div>' +
        '<ul class="hero-points"><li>No account needed</li><li>Works on phone, tablet &amp; TV</li><li>Undo any mistake</li></ul>' +
      '</div>' +
      '<div class="hero-art" aria-hidden="true"><div class="felt-table"><div class="felt-inner">' + window.BT_REFEREE_SVG({ className: 'g-idle hero-ref' }) +
        '<div class="hero-bubble">Rack to Player 1!</div></div></div></div>' +
    '</div></section>';

    html += '<div class="wrap stack-lg">';

    if (live.length) {
      html += '<section><div class="section-head"><h2><span class="live-dot"></span>Live now</h2></div><div class="grid-cards">' +
        live.map(function (m) { return matchTile(m); }).join('') + '</div></section>';
    }

    html += '<section><div class="section-head"><h2>Categories</h2><a class="link" href="#/rules">All rules →</a></div><div class="grid-cats">' +
      CAT_ORDER.map(function (id) {
        var c = CATS[id];
        return '<article class="cat-card">' + ballIcon(c, 44) + '<h3>' + esc(c.name) + '</h3><p>' + esc(CAT_BLURB[id]) + '</p>' +
          '<div class="cat-card-actions"><a class="btn btn-sm btn-primary" href="#/play?c=' + id + '">Play</a><a class="btn btn-sm btn-ghost" href="#/rules/' + id + '">Rules</a></div></article>';
      }).join('') + '</div></section>';

    var liveFree = db.sessions.filter(function (x) { return x.status === 'live'; });
    html += '<section class="card fp-cta"><div><span class="eyebrow">Normal play</span><h2>Free Play for 2, 3 or 4 players</h2><p class="muted">Press <b>+1 Point</b> for whoever wins each game. The first player to reach the target (up to 15) wins.</p></div>' +
      '<div class="row-gap">' + (liveFree.length ? '<a class="btn btn-live" href="#/free/' + liveFree[liveFree.length - 1].id + '">● Resume Free Play</a>' : '') + '<a class="btn btn-primary btn-lg" href="#/free">Start Free Play</a></div></section>';
    html += '<section class="grid-2">';
    html += '<div class="card"><div class="section-head"><h2>Tournaments</h2><a class="link" href="#/tournaments">See all →</a></div>' +
      (activeT.length ? '<ul class="list">' + activeT.slice(0, 5).map(tournamentRow).join('') + '</ul>'
        : '<p class="muted">No active tournament yet.</p><a class="btn btn-secondary" href="#/tournaments/new">Create a tournament</a>') + '</div>';
    html += '<div class="card"><div class="section-head"><h2>Leaderboard</h2><a class="link" href="#/leaderboard">Full table →</a></div>' +
      (top.length ? miniBoard(top) : '<p class="muted">Finish a match to see the rankings here.</p>') + '</div>';
    html += '</section>';

    html += '<section class="card how"><h2>How it works</h2><ol class="steps">' +
      '<li><b>Add players</b><span>Type names when you start — no sign-up. Referees too.</span></li>' +
      '<li><b>Pick a format</b><span>Quick game, knockout bracket or round-robin league.</span></li>' +
      '<li><b>Referee scores live</b><span>Big buttons, foul tracking, shot clock and undo.</span></li>' +
      '<li><b>Leaderboard updates</b><span>Wins, games won and difference ranked automatically.</span></li>' +
      '</ol></section>';

    if (!db.players.length) {
      html += '<section class="card demo-cta"><div><h2>Want to try it first?</h2><p class="muted">Load a sample 8-player 9-Ball knockout with two referees.</p></div><button class="btn btn-secondary" data-action="demo">Load demo tournament</button></section>';
    }
    html += '</div>';
    return html;
  }

  function miniBoard(rows) {
    return '<ol class="mini-board">' + rows.map(function (s, i) {
      return '<li><span class="rank rank-' + (i + 1) + '">' + (i + 1) + '</span>' + avatar(pName(s.id)) + '<span class="mb-name">' + esc(pName(s.id)) + '</span><span class="mb-rec">' + s.w + '–' + s.l + '</span><span class="mb-pts">' + s.pts + ' pts</span></li>';
    }).join('') + '</ol>';
  }

  function tournamentRow(t) {
    var ms = tMatches(t).filter(function (m) { return m.status !== 'bye'; });
    var done = ms.filter(function (m) { return m.status === 'done'; }).length;
    var pct = ms.length ? Math.round(done / ms.length * 100) : 0;
    return '<li><a class="t-row" href="#/t/' + t.id + '"><span class="t-row-main"><b>' + esc(t.name) + '</b><small>' + esc(CATS[t.category].name) + ' · ' + (t.format === 'elim' ? 'Knockout' : 'Round robin') + ' · ' + plural(t.playerIds.length, 'player', 'players') + '</small></span>' +
      (t.status === 'done' ? '<span class="badge badge-gold">🏆 ' + esc(pName(t.championId)) + '</span>' : '<span class="progress" title="' + done + ' of ' + ms.length + ' matches played"><span style="width:' + pct + '%"></span></span>') + '</a></li>';
  }

  function matchTile(m) {
    var t = T(m.tId), c = cat(m);
    return '<a class="match-tile" href="#/match/' + m.id + '">' +
      '<div class="mt-top">' + catBadge(m.category) + '<span class="muted small">' + esc(t ? t.name + ' · ' + roundName(t, m.round) : 'Quick game') + '</span></div>' +
      '<div class="mt-row"><span>' + esc(sideName(m, 1)) + '</span><b>' + (c.mode === 'points' ? m.g1 : m.s1) + '</b></div>' +
      '<div class="mt-row"><span>' + esc(sideName(m, 2)) + '</span><b>' + (c.mode === 'points' ? m.g2 : m.s2) + '</b></div>' +
      '<div class="mt-foot"><span>' + esc(raceLabel(m)) + '</span><span class="badge badge-live">Live</span></div></a>';
  }

  /* ---- Quick game ---- */
  function viewPlay(params) {
    var catId = CATS[params.c] ? params.c : 'eightball';
    return '<div class="wrap narrow">' +
      '<header class="page-head"><span class="eyebrow">Quick game</span><h1>Start a game</h1><p class="muted">Choose how many players, enter their names and the referee, pick a category and press Start.</p></header>' +
      '<form class="card form" id="playForm" autocomplete="off" novalidate>' +
        '<fieldset><legend>How many players?</legend><div class="seg seg-3" role="radiogroup" aria-label="Number of players">' +
          [2, 3, 4].map(function (n) { return '<label><input type="radio" name="count" value="' + n + '"' + (n === 2 ? ' checked' : '') + '><span><b>' + n + ' players</b></span></label>'; }).join('') +
        '</div><p class="hint" data-count-hint></p></fieldset>' +
        '<fieldset><legend>Category</legend>' + catPicker(catId) + '</fieldset>' +
        '<fieldset><legend>Players</legend><div class="grid-2">' +
          [1, 2, 3, 4].map(function (i) { return '<label class="field" data-fp-player="' + i + '"' + (i > 2 ? ' hidden' : '') + '><span>Player ' + i + '</span><input name="p' + i + '" list="dl-players" maxlength="40" placeholder="Name"></label>'; }).join('') +
        '</div></fieldset>' +
        '<fieldset><legend>Referee</legend><label class="field"><span>Referee name <small class="muted">(optional)</small></span><input name="ref" list="dl-refs" maxlength="40" placeholder="Name"></label></fieldset>' +
        '<fieldset><legend>Format</legend><div data-two>' + formatFields(catId) +
          '<label class="field"><span>First break</span><select name="breaker"><option value="1">Player 1 breaks</option><option value="2">Player 2 breaks</option><option value="lag">Lag / coin toss — pick at random</option></select></label></div>' +
          '<div data-multi hidden><label class="field"><span>Points to win (max 15)</span><select name="games">' + gameOptions() + '</select></label></div>' +
        '</fieldset>' +
        '<div class="form-actions"><a class="btn btn-ghost" href="#/">Cancel</a><button class="btn btn-primary btn-lg" type="submit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>Start Game</button></div>' +
      '</form>' + datalists() + '</div>';
  }
  function gameOptions() {
    var o = '';
    for (var g = 1; g <= 15; g++) o += '<option value="' + g + '"' + (g === 15 ? ' selected' : '') + '>First to ' + g + (g === 1 ? ' point' : ' points') + '</option>';
    return o;
  }
  function afterPlay() { var f = $('#playForm'); if (f) { syncFormatFields(f, false); playSyncCount(f); var p1 = $('input[name="p1"]', f); if (p1) p1.focus(); } }
  function playSyncCount(f) {
    var c = $('input[name="count"]:checked', f); var n = c ? parseInt(c.value, 10) : 2;
    $$('[data-fp-player]', f).forEach(function (el) { el.hidden = parseInt(el.getAttribute('data-fp-player'), 10) > n; });
    $('[data-two]', f).hidden = n > 2;
    $('[data-multi]', f).hidden = n <= 2;
    $('[data-count-hint]', f).textContent = n > 2
      ? n + ' players: press +1 Point for the winner of each game. The first player to reach the points to win (up to 15) wins.'
      : '2 players: full referee match with racks, fouls and shot clock. Counts on the leaderboard.';
  }

  function submitPlay(form) {
    var fd = new FormData(form);
    if (intIn(fd.get('count'), 2, 4, 2) > 2) { submitFree(form); return; }
    var catId = fd.get('category'); var c = CATS[catId];
    if (!c) { toast('Choose a category.', 'warn'); return; }
    var n1 = cleanName(fd.get('p1')), n2 = cleanName(fd.get('p2'));
    if (!n1 || !n2) { toast('Enter both player names.', 'warn'); (n1 ? $('input[name="p2"]', form) : $('input[name="p1"]', form)).focus(); return; }
    if (n1.toLowerCase() === n2.toLowerCase()) { toast('The two players must have different names.', 'warn'); $('input[name="p2"]', form).focus(); return; }
    var raceTo = c.mode === 'points' ? 1 : intIn(fd.get('raceTo'), 1, 99, c.race);
    var target = (c.mode === 'points' || c.mode === 'sets') ? intIn(fd.get('target'), 1, 1000, c.target) : 0;
    var p1 = ensurePlayer(n1), p2 = ensurePlayer(n2);
    var ref = ensureReferee(fd.get('ref'));
    var b = fd.get('breaker'); var breaker = b === 'lag' ? (Math.random() < 0.5 ? 1 : 2) : (b === '2' ? 2 : 1);
    var m = newMatch({ category: catId, raceTo: raceTo, target: target, p1: p1.id, p2: p2.id, breakRule: c.mode === 'race' ? fd.get('breakRule') : 'alternate' });
    db.matches.push(m);
    startMatch(m, ref ? ref.id : null, breaker);
    if (b === 'lag') toast(sideName(m, breaker) + ' won the lag and breaks.');
    save();
    go('#/match/' + m.id);
  }

  /* ---- Tournaments ---- */
  function viewTournaments() {
    var list = db.tournaments.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    var html = '<div class="wrap"><header class="page-head row-between"><div><span class="eyebrow">Events</span><h1>Tournaments</h1></div><a class="btn btn-primary" href="#/tournaments/new">+ New tournament</a></header>';
    if (!list.length) {
      html += emptyState('No tournaments yet', 'Create a knockout bracket or a round-robin league in under a minute.',
        '<div class="row-gap"><a class="btn btn-primary" href="#/tournaments/new">Create tournament</a><button class="btn btn-ghost" data-action="demo">Load demo</button></div>');
    } else {
      html += '<div class="grid-cards">' + list.map(function (t) {
        var ms = tMatches(t).filter(function (m) { return m.status !== 'bye'; });
        var done = ms.filter(function (m) { return m.status === 'done'; }).length;
        var live = ms.filter(function (m) { return m.status === 'live'; }).length;
        var pct = ms.length ? Math.round(done / ms.length * 100) : 0;
        return '<a class="t-card" href="#/t/' + t.id + '">' +
          '<div class="t-card-top">' + catBadge(t.category) + (t.status === 'done' ? '<span class="badge badge-gold">Finished</span>' : live ? '<span class="badge badge-live">' + live + ' live</span>' : '<span class="badge">In progress</span>') + '</div>' +
          '<h3>' + esc(t.name) + '</h3>' +
          '<p class="muted small">' + (t.format === 'elim' ? 'Knockout' : 'Round robin') + ' · ' + plural(t.playerIds.length, 'player', 'players') + ' · ' + esc(raceLabel({ category: t.category, raceTo: t.raceTo, target: t.target })) + '</p>' +
          (t.status === 'done' ? '<p class="champ-line">🏆 ' + esc(pName(t.championId)) + '</p>' : '<div class="progress progress-wide"><span style="width:' + pct + '%"></span></div><p class="muted small">' + done + ' / ' + ms.length + ' matches played</p>') +
          '<p class="muted tiny">Created ' + esc(fmtDate(t.createdAt)) + '</p></a>';
      }).join('') + '</div>';
    }
    return html + '</div>';
  }

  function viewNewTournament() {
    var catId = 'eightball';
    var chips = function (arr, target) {
      if (!arr.length) return '';
      return '<div class="chips"><span class="muted small">Add saved:</span>' + arr.map(function (x) {
        return '<button type="button" class="chip" data-action="addName" data-target="' + target + '" data-name="' + esc(x.name) + '">+ ' + esc(x.name) + '</button>';
      }).join('') + '</div>';
    };
    return '<div class="wrap narrow">' +
      '<header class="page-head"><span class="eyebrow">New event</span><h1>Create a tournament</h1><p class="muted">Everything is generated automatically: bracket or schedule, byes, standings and champion.</p></header>' +
      '<form class="card form" id="tForm" autocomplete="off" novalidate>' +
        '<fieldset><legend>Details</legend><label class="field"><span>Tournament name</span><input name="name" maxlength="60" placeholder="e.g. Spring Open 2026" required></label></fieldset>' +
        '<fieldset><legend>Category</legend>' + catPicker(catId) + '</fieldset>' +
        '<fieldset><legend>Format</legend>' +
          '<div class="seg" role="radiogroup" aria-label="Format">' +
            '<label><input type="radio" name="format" value="elim" checked><span><b>Knockout</b><small>Single elimination bracket</small></span></label>' +
            '<label><input type="radio" name="format" value="rr"><span><b>Round robin</b><small>Everyone plays everyone</small></span></label>' +
          '</div>' + formatFields(catId) +
          '<label class="check"><input type="checkbox" name="shuffle" checked><span>Random draw (shuffle the seeding)</span></label>' +
        '</fieldset>' +
        '<fieldset><legend>Players</legend><label class="field"><span>One name per line <small class="muted" data-count="players">0 players</small></span><textarea name="players" rows="8" placeholder="Marco Rossi&#10;Giulia Bianchi&#10;Luca Verdi&#10;Sara Neri" required></textarea></label>' + chips(db.players, 'players') + '</fieldset>' +
        '<fieldset><legend>Referees</legend><label class="field"><span>One name per line <small class="muted">(optional — assigned in rotation)</small></span><textarea name="referees" rows="3" placeholder="Referee name"></textarea></label>' + chips(db.referees, 'referees') + '</fieldset>' +
        '<div class="form-actions"><a class="btn btn-ghost" href="#/tournaments">Cancel</a><button class="btn btn-primary btn-lg" type="submit">Create tournament</button></div>' +
      '</form></div>';
  }
  function parseNames(text) {
    var seen = {}, out = [];
    String(text || '').split(/[\n,;]+/).forEach(function (line) {
      var n = cleanName(line); if (!n) return;
      var k = n.toLowerCase(); if (seen[k]) return;
      seen[k] = 1; out.push(n);
    });
    return out;
  }
  function afterNewTournament() {
    var f = $('#tForm'); if (!f) return;
    syncFormatFields(f, false);
    var ta = $('textarea[name="players"]', f), cnt = $('[data-count="players"]', f);
    var upd = function () { cnt.textContent = plural(parseNames(ta.value).length, 'player', 'players'); };
    ta.addEventListener('input', upd); upd();
    $('input[name="name"]', f).focus();
  }
  function submitTournament(form) {
    var fd = new FormData(form);
    var name = cleanName(fd.get('name')).slice(0, 60);
    var catId = fd.get('category'), c = CATS[catId];
    var format = fd.get('format') === 'rr' ? 'rr' : 'elim';
    var names = parseNames(fd.get('players'));
    var refs = parseNames(fd.get('referees'));
    if (!name) { toast('Give the tournament a name.', 'warn'); $('input[name="name"]', form).focus(); return; }
    if (!c) { toast('Choose a category.', 'warn'); return; }
    if (names.length < 2) { toast('Add at least 2 players (one per line).', 'warn'); $('textarea[name="players"]', form).focus(); return; }
    var max = format === 'elim' ? 128 : 32;
    if (names.length > max) { toast((format === 'elim' ? 'Knockout' : 'Round robin') + ' supports up to ' + max + ' players.', 'warn'); return; }
    var players = names.map(ensurePlayer), referees = refs.map(ensureReferee);
    var ids = players.map(function (p) { return p.id; });
    if (fd.get('shuffle')) shuffle(ids);
    var t = {
      id: uid(), name: name, category: catId, format: format,
      raceTo: c.mode === 'points' ? 1 : intIn(fd.get('raceTo'), 1, 99, c.race),
      target: (c.mode === 'points' || c.mode === 'sets') ? intIn(fd.get('target'), 1, 1000, c.target) : 0,
      breakRule: c.mode === 'race' && fd.get('breakRule') === 'winner' ? 'winner' : 'alternate',
      playerIds: ids, refereeIds: referees.map(function (r) { return r.id; }),
      status: 'active', championId: null, createdAt: Date.now(), rounds: 0, refTurn: 0
    };
    db.tournaments.push(t);
    if (format === 'elim') buildElim(t); else buildRR(t);
    save();
    toast('Tournament created. Good luck everyone!');
    go('#/t/' + t.id);
  }

  function matchCard(m, t) {
    var c = cat(m), done = m.status === 'done', bye = m.status === 'bye';
    function line(side) {
      var id = m['p' + side];
      var score = bye ? '' : (m.status === 'pending' ? '' : (m.wo ? (m.winner === side ? 'W' : '–') : (c.mode === 'points' ? m['tp' + side] : m['s' + side])));
      return '<div class="mc-line' + ((done || bye) && m.winner === side ? ' win' : '') + ((done || bye) && m.winner && m.winner !== side ? ' lose' : '') + '">' +
        '<span class="mc-name">' + (id ? esc(pName(id)) : '<i class="muted">' + (bye && !id ? 'Bye' : 'TBD') + '</i>') + '</span><b class="mc-score">' + score + '</b></div>';
    }
    var action = '';
    if (bye) action = '<span class="badge">Bye</span>';
    else if (m.status === 'live') action = '<a class="btn btn-sm btn-live" href="#/match/' + m.id + '">● Resume</a>';
    else if (done) action = '<a class="btn btn-sm btn-ghost" href="#/match/' + m.id + '">View</a>';
    else if (m.p1 && m.p2) action = '<button class="btn btn-sm btn-primary" data-action="startMatch" data-id="' + m.id + '">Start</button>';
    else action = '<span class="muted tiny">Waiting</span>';
    return '<div class="mc mc-' + m.status + '">' + line(1) + line(2) +
      '<div class="mc-foot"><span class="muted tiny">' + (m.refId ? '🧑‍⚖️ ' + esc(rName(m.refId)) : (bye ? 'Advances automatically' : '')) + '</span>' + action + '</div></div>';
  }

  function viewTournament(id, params) {
    var t = T(id); if (!t) return notFound('Tournament not found');
    var ms = tMatches(t);
    var real = ms.filter(function (m) { return m.status !== 'bye'; });
    var done = real.filter(function (m) { return m.status === 'done'; }).length;
    var tab = params.tab === 'standings' || params.tab === 'info' ? params.tab : 'matches';
    var html = '<div class="wrap">' +
      '<nav class="crumbs"><a href="#/tournaments">Tournaments</a><span>/</span><span>' + esc(t.name) + '</span></nav>' +
      '<header class="page-head row-between"><div>' + catBadge(t.category) + '<h1>' + esc(t.name) + '</h1>' +
        '<p class="muted">' + (t.format === 'elim' ? 'Knockout' : 'Round robin') + ' · ' + plural(t.playerIds.length, 'player', 'players') + ' · ' + esc(raceLabel({ category: t.category, raceTo: t.raceTo, target: t.target })) + (CATS[t.category].mode === 'race' ? ' · ' + (t.breakRule === 'winner' ? 'Winner breaks' : 'Alternate break') : '') + '</p></div>' +
        '<div class="head-stat"><b>' + done + '<small>/' + real.length + '</small></b><span>matches played</span></div></header>';

    if (t.status === 'done' && t.championId) {
      html += '<section class="champion"><div class="champion-trophy" aria-hidden="true">🏆</div><div><span class="eyebrow">Champion</span><h2>' + esc(pName(t.championId)) + '</h2><p class="muted">' + esc(t.name) + ' · ' + esc(CATS[t.category].name) + (t.endedAt ? ' · ' + esc(fmtDate(t.endedAt)) : '') + '</p></div></section>';
    }

    html += '<div class="tabs" role="tablist">' +
      tabLink('#/t/' + t.id, 'matches', tab, t.format === 'elim' ? 'Bracket' : 'Schedule') +
      tabLink('#/t/' + t.id + '?tab=standings', 'standings', tab, 'Standings') +
      tabLink('#/t/' + t.id + '?tab=info', 'info', tab, 'Info & referees') + '</div>';

    if (tab === 'matches') {
      if (t.format === 'elim') {
        html += '<div class="bracket" style="--rounds:' + t.rounds + '">';
        for (var r = 1; r <= t.rounds; r++) {
          var rm = ms.filter(function (m) { return m.round === r; });
          html += '<div class="b-round"><h3 class="b-round-title">' + esc(roundName(t, r)) + '</h3><div class="b-matches">' + rm.map(function (m) { return '<div class="b-slot">' + matchCard(m, t) + '</div>'; }).join('') + '</div></div>';
        }
        html += '</div>';
      } else {
        for (var rr = 1; rr <= t.rounds; rr++) {
          var list = ms.filter(function (m) { return m.round === rr; });
          var playing = {};
          list.forEach(function (m) { playing[m.p1] = 1; playing[m.p2] = 1; });
          var resting = t.playerIds.filter(function (pid) { return !playing[pid]; });
          html += '<section class="rr-round"><h3>Round ' + rr + (resting.length ? ' <small class="muted">· rest: ' + esc(resting.map(pName).join(', ')) + '</small>' : '') + '</h3><div class="grid-cards">' + list.map(function (m) { return matchCard(m, t); }).join('') + '</div></section>';
        }
      }
    } else if (tab === 'standings') {
      html += standingsTable(computeStats(ms, t.playerIds), CATS[t.category], t.format === 'rr' && t.status === 'done');
    } else {
      var refStats = {};
      ms.forEach(function (m) { if (m.refId && m.status !== 'pending' && m.status !== 'bye') refStats[m.refId] = (refStats[m.refId] || 0) + 1; });
      html += '<div class="grid-2"><section class="card"><h2>Referees</h2>' +
        (t.refereeIds.length ? '<ul class="list ref-list">' + t.refereeIds.map(function (rid) { return '<li>' + window.BT_REFEREE_SVG({ className: 'ref-mini' }) + '<b>' + esc(rName(rid) || 'Removed referee') + '</b><span class="muted small">' + plural(refStats[rid] || 0, 'match', 'matches') + '</span></li>'; }).join('') + '</ul>' : '<p class="muted">No referees assigned. You can still pick any referee when starting a match.</p>') +
        '<form class="inline-form" id="addTRef"><input name="ref" list="dl-refs" maxlength="40" placeholder="Add referee name" aria-label="Referee name"><button class="btn btn-secondary btn-sm" type="submit">Add</button></form></section>' +
        '<section class="card"><h2>Rules & format</h2><p>' + esc(window.BT_RULES[t.category].tagline) + '</p><p><a class="btn btn-secondary btn-sm" href="#/rules/' + t.category + '">Read ' + esc(CATS[t.category].name) + ' rules</a></p>' +
        '<h3>Players (seeding order)</h3><ol class="seed-list">' + t.playerIds.map(function (pid) { return '<li>' + esc(pName(pid)) + '</li>'; }).join('') + '</ol></section></div>' +
        '<section class="card danger-zone"><h2>Danger zone</h2><p class="muted">Deleting removes this tournament and all of its matches from the leaderboard.</p><button class="btn btn-danger" data-action="deleteTournament" data-id="' + t.id + '">Delete tournament</button></section>' + datalists();
    }
    return html + '</div>';
  }
  function tabLink(href, key, cur, label) {
    return '<a role="tab" href="' + href + '" class="tab' + (key === cur ? ' active' : '') + '" aria-selected="' + (key === cur) + '">' + esc(label) + '</a>';
  }

  function standingsTable(rows, c, final) {
    if (!rows.length) return emptyState('No results yet', 'Standings appear as soon as the first match is finished.');
    var unit = c ? c.unit : 'Games';
    return '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th class="left">Player</th><th title="Matches played">MP</th><th title="Won">W</th><th title="Lost">L</th><th title="Win percentage">Win %</th><th title="' + esc(unit) + ' won">' + esc(unit.slice(0, 1)) + 'F</th><th title="' + esc(unit) + ' lost">' + esc(unit.slice(0, 1)) + 'A</th><th title="Difference">+/−</th><th class="hide-sm" title="Last five">Form</th><th title="Ranking points (win = 3)">Pts</th></tr></thead><tbody>' +
      rows.map(function (s, i) {
        return '<tr' + (final && i === 0 ? ' class="row-champ"' : '') + '><td><span class="rank rank-' + (i + 1) + '">' + (i + 1) + '</span></td><td class="left"><span class="pcell">' + avatar(pName(s.id)) + esc(pName(s.id)) + '</span></td><td>' + s.mp + '</td><td>' + s.w + '</td><td>' + s.l + '</td><td>' + Math.round(s.pct * 100) + '%</td><td>' + s.gf + '</td><td>' + s.ga + '</td><td class="' + (s.diff > 0 ? 'pos' : s.diff < 0 ? 'neg' : '') + '">' + (s.diff > 0 ? '+' : '') + s.diff + '</td><td class="hide-sm"><span class="form">' + s.form.map(function (f) { return '<i class="f-' + f + '">' + f + '</i>'; }).join('') + '</span></td><td><b>' + s.pts + '</b></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function openStartDialog(m) {
    var t = T(m.tId);
    var pool = [];
    if (t) t.refereeIds.forEach(function (rid) { if (R(rid)) pool.push(R(rid)); });
    db.referees.forEach(function (r) { if (pool.indexOf(r) < 0) pool.push(r); });
    var suggested = '';
    if (t && t.refereeIds.length) {
      var valid = t.refereeIds.filter(R);
      if (valid.length) suggested = valid[(t.refTurn || 0) % valid.length];
    }
    openDialog({
      title: 'Start match',
      body: '<p class="dlg-match"><b>' + esc(sideName(m, 1)) + '</b> vs <b>' + esc(sideName(m, 2)) + '</b><br><span class="muted">' + esc(CATS[m.category].name) + ' · ' + esc(raceLabel(m)) + '</span></p>' +
        '<label class="field"><span>Referee</span><select name="ref"><option value="">No referee</option>' + pool.map(function (r) { return '<option value="' + r.id + '"' + (r.id === suggested ? ' selected' : '') + '>' + esc(r.name) + '</option>'; }).join('') + '<option value="__new">+ New referee…</option></select></label>' +
        '<label class="field" data-newref hidden><span>New referee name</span><input name="newref" maxlength="40"></label>' +
        '<label class="field"><span>First break</span><select name="breaker"><option value="1">' + esc(sideName(m, 1)) + '</option><option value="2">' + esc(sideName(m, 2)) + '</option><option value="lag">Lag / coin toss — random</option></select></label>',
      ok: 'Start match',
      onOk: function (fd) {
        var refId = fd.get('ref');
        if (refId === '__new') {
          var nr = ensureReferee(fd.get('newref'));
          if (!nr) { toast('Enter the new referee’s name.', 'warn'); return false; }
          refId = nr.id;
          if (t && t.refereeIds.indexOf(refId) < 0) t.refereeIds.push(refId);
        }
        var b = fd.get('breaker');
        var breaker = b === 'lag' ? (Math.random() < 0.5 ? 1 : 2) : (b === '2' ? 2 : 1);
        if (t && refId && refId === suggested) t.refTurn = (t.refTurn || 0) + 1;
        startMatch(m, refId || null, breaker);
        if (b === 'lag') toast(sideName(m, breaker) + ' won the lag and breaks.');
        save();
        go('#/match/' + m.id);
      }
    });
    var sel = $('#dlg select[name="ref"]');
    if (sel) sel.addEventListener('change', function () {
      var box = $('#dlg [data-newref]'); box.hidden = sel.value !== '__new';
      if (!box.hidden) $('input', box).focus();
    });
  }

  /* ---- Scoreboard ---- */
  function viewMatch(id) {
    var m = M(id); if (!m) return notFound('Match not found');
    var c = cat(m), t = T(m.tId);
    var crumbs = '<nav class="crumbs">' + (t ? '<a href="#/tournaments">Tournaments</a><span>/</span><a href="#/t/' + t.id + '">' + esc(t.name) + '</a><span>/</span><span>' + esc(roundName(t, m.round)) + '</span>' : '<a href="#/">Home</a><span>/</span><span>Quick game</span>') + '</nav>';

    if (m.status === 'pending' || m.status === 'bye') {
      return '<div class="wrap narrow">' + crumbs + '<div class="card center-card">' + window.BT_REFEREE_SVG({ className: 'g-idle ref-lg' }) +
        '<h1>' + esc(sideName(m, 1)) + ' <span class="muted">vs</span> ' + esc(sideName(m, 2)) + '</h1><p class="muted">' + esc(c.name) + ' · ' + esc(raceLabel(m)) + '</p>' +
        (m.status === 'bye' ? '<p>This is a bye — the player advances automatically.</p>' : (m.p1 && m.p2 ? '<button class="btn btn-primary btn-lg" data-action="startMatch" data-id="' + m.id + '">Start match</button>' : '<p class="muted">Waiting for the previous round to finish.</p>')) + '</div></div>';
    }

    var done = m.status === 'done';
    var html = '<div class="board-wrap">' + '<div class="wrap">' + crumbs + '</div>' +
      '<section class="board' + (done ? ' board-done' : '') + '" data-mid="' + m.id + '">' +
      '<div class="board-head">' + catBadge(m.category) + '<span class="bh-race">' + esc(raceLabel(m)) + '</span>' +
        '<span class="bh-timer" title="Match time">⏱ <b id="matchTimer">' + fmtClock((done ? m.endedAt : Date.now()) - (m.startedAt || Date.now())) + '</b></span>' +
        (done ? '<span class="badge badge-gold">Final</span>' : '<span class="badge badge-live">Live</span>') + '</div>' +
      '<div class="board-main">' + sidePanel(m, 1) + centerPanel(m) + sidePanel(m, 2) + '</div>' +
      boardFoot(m) +
      '</section>';

    html += '<div class="wrap board-bottom"><section class="card"><div class="section-head"><h2>Match log</h2><span class="muted small">' + plural(m.log.length, 'entry', 'entries') + '</span></div>' +
      (m.log.length ? '<ol class="log">' + m.log.slice().reverse().map(function (e) {
        return '<li class="log-' + esc(e.kind) + (e.side ? ' log-s' + e.side : '') + '"><time>' + esc(fmtTime(e.t)) + '</time><span>' + esc(e.text) + '</span></li>';
      }).join('') + '</ol>' : '<p class="muted">No actions yet.</p>') + '</section>' +
      '<section class="card rules-mini"><h2>' + esc(c.name) + ' — quick rules</h2><p>' + esc(window.BT_RULES[m.category].scoring) + '</p><a class="link" href="#/rules/' + m.category + '">Full rules →</a></section></div>';
    return html + '</div>';
  }

  function sidePanel(m, s) {
    var c = cat(m), done = m.status === 'done', dis = done ? ' disabled' : '';
    var name = sideName(m, s);
    var big = c.mode === 'points' ? m['g' + s] : m['s' + s];
    var bigLabel = c.mode === 'points' ? 'of ' + m.target + ' points' : c.unit.toLowerCase();
    var isBreak = !done && m.breaker === s && c.mode !== 'points';
    var html = '<div class="side side-' + s + (done && m.winner === s ? ' side-win' : '') + (done && m.winner && m.winner !== s ? ' side-lose' : '') + '">' +
      '<div class="side-head">' + avatar(name, s) + '<div class="side-id"><h2 class="side-name">' + esc(name) + '</h2>' +
        '<div class="side-tags">' + (isBreak ? '<span class="tag tag-break">● Break</span>' : '') + (done && m.winner === s ? '<span class="tag tag-win">🏆 Winner</span>' : '') + '</div></div></div>' +
      '<div class="score-big" aria-live="polite"><span class="score-num">' + big + '</span><span class="score-label">' + esc(bigLabel) + '</span></div>';

    if (c.mode === 'frames' || c.mode === 'sets') {
      html += '<div class="game-pts"><span>' + (c.mode === 'frames' ? 'Frame' : 'Set') + ' points</span><b>' + m['g' + s] + '</b>' + (c.mode === 'sets' ? '<small>/ ' + m.target + '</small>' : '') + '</div>';
    }
    var cf = m['cf' + s];
    html += '<div class="side-meta"><span>Fouls <b>' + m['f' + s] + '</b></span>' +
      (c.threeFoul ? '<span class="cf" title="Consecutive fouls">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= cf ? 'on' : '') + '"></i>'; }).join('') + '</span>' : '') +
      (c.mode !== 'race' ? '<span>Total <b>' + m['tp' + s] + '</b></span>' : '') + '</div>';

    html += '<div class="side-actions">';
    var a = function (op, label, cls, n, title) {
      return '<button class="btn ' + (cls || 'btn-secondary') + '" data-action="sb" data-op="' + op + '" data-side="' + s + '"' + (n != null ? ' data-n="' + n + '"' : '') + (title ? ' title="' + esc(title) + '"' : '') + dis + '>' + label + '</button>';
    };
    if (c.mode === 'race') {
      html += a('rack', 'Win ' + c.one, 'btn-primary btn-lg btn-block') +
        '<div class="btn-row">' + a('foul', 'Foul', 'btn-foul') + (c.threeFoul ? a('legal', 'Legal shot', 'btn-ghost', null, 'Resets the consecutive-foul count') : '') + '</div>';
    } else if (c.mode === 'points') {
      html += a('pts', '+1 Ball', 'btn-primary btn-lg btn-block', 1) +
        '<div class="btn-row">' + a('custom', '+N', 'btn-secondary', null, 'Add several points') + a('legal', 'Safe / miss', 'btn-ghost', null, 'Legal shot without a ball: resets consecutive fouls') + '</div>' +
        '<div class="btn-row">' + a('foul', 'Foul −1', 'btn-foul') + a('breakfoul', 'Break foul −2', 'btn-foul') + '</div>';
    } else if (c.mode === 'frames') {
      html += '<div class="balls">' + SNOOKER_BALLS.map(function (b) {
        return '<button class="sball" style="--c:' + b.c + '" data-action="sb" data-op="pts" data-side="' + s + '" data-n="' + b.n + '" title="' + b.name + ' (' + b.n + ')" aria-label="' + b.name + ' ' + b.n + ' point' + (b.n > 1 ? 's' : '') + '"' + dis + '><span>' + b.n + '</span></button>';
      }).join('') + '</div>' +
        '<div class="foul-row"><span class="muted small">Foul (to opponent):</span>' + [4, 5, 6, 7].map(function (n) { return a('foul', n, 'btn-foul btn-sm', n); }).join('') + '</div>' +
        '<div class="btn-row">' + a('custom', '+N', 'btn-secondary btn-sm', null, 'Add custom points') + a('concede', 'Concede frame', 'btn-ghost btn-sm') + '</div>';
    } else {
      html += '<div class="btn-grid">' + [[2, 'White pin'], [3, 'Red ball hit'], [4, 'Red pin'], [10, 'Red pin alone']].map(function (p) { return a('pts', '+' + p[0], 'btn-primary', p[0], p[1]); }).join('') + '</div>' +
        '<div class="btn-row">' + a('custom', '+N', 'btn-secondary') + a('foul', 'Foul +2 opp.', 'btn-foul', 2) + a('foulN', 'Foul +N', 'btn-foul') + '</div>';
    }
    html += '</div></div>';
    return html;
  }

  function centerPanel(m) {
    var c = cat(m), done = m.status === 'done';
    var refLabel = m.refId ? rName(m.refId) : 'No referee';
    var html = '<div class="center">' +
      '<div class="ref-stage"><div class="bubble" id="refBubble" hidden></div>' + window.BT_REFEREE_SVG({ className: 'g-idle' }) + '</div>' +
      '<div class="ref-name"><span class="muted tiny">Referee</span><b>' + esc(refLabel) + '</b></div>';
    if (c.mode !== 'points') {
      html += '<div class="vs-score"><b class="c1">' + m.s1 + '</b><span>–</span><b class="c2">' + m.s2 + '</b></div>';
    } else {
      html += '<div class="vs-score"><b class="c1">' + m.g1 + '</b><span>–</span><b class="c2">' + m.g2 + '</b></div>';
    }
    if (c.mode === 'frames' && !done) {
      var diff = Math.abs(m.g1 - m.g2);
      html += '<div class="frame-info muted small">' + (m.g1 === m.g2 ? 'Frame level' : sideName(m, m.g1 > m.g2 ? 1 : 2) + ' leads by ' + diff) + '</div>' +
        '<button class="btn btn-secondary btn-block" data-action="sb" data-op="endframe" data-side="1">End Frame</button>';
    }
    if (!done) {
      html += '<div class="shot-clock" id="shotClock"><div class="sc-face"><span id="scVal">' + Math.ceil(clock.remaining) + '</span><small>shot clock</small></div>' +
        '<div class="sc-btns"><button class="btn btn-sm btn-secondary" data-action="clock" data-op="toggle" id="scToggle">' + (clock.running ? 'Pause' : 'Start') + '</button>' +
        '<button class="btn btn-sm btn-ghost" data-action="clock" data-op="reset" title="Reset to ' + clock.base + ' seconds">Reset</button>' +
        '<button class="btn btn-sm btn-ghost" data-action="clock" data-op="ext" title="Add a 30-second extension">+30</button>' +
        '<button class="btn btn-sm btn-ghost" data-action="clock" data-op="base" title="Switch between 30 and 60 seconds">' + clock.base + 's</button></div></div>';
    }
    return html + '</div>';
  }

  function boardFoot(m) {
    var c = cat(m), done = m.status === 'done', t = T(m.tId);
    var html = '<div class="board-foot">' +
      '<button class="btn btn-secondary" data-action="undo" data-id="' + m.id + '"' + (m.hist.length ? '' : ' disabled') + '>↶ Undo</button>';
    if (!done && c.mode !== 'points') html += '<button class="btn btn-ghost" data-action="sb" data-op="swapbreak" data-side="1">⇄ Swap break</button>';
    if (!done && t) html += '<button class="btn btn-ghost" data-action="walkover" data-id="' + m.id + '">Walkover</button>';
    if (!done) html += '<button class="btn btn-ghost" data-action="fullscreen">⛶ Fullscreen</button>';
    if (done && t) html += '<a class="btn btn-primary" href="#/t/' + t.id + '">Back to tournament</a>';
    if (done && !t) html += '<button class="btn btn-primary" data-action="rematch" data-id="' + m.id + '">Rematch</button><a class="btn btn-secondary" href="#/play">New game</a>';
    if (t) html += '<button class="btn btn-ghost danger-text" data-action="resetMatch" data-id="' + m.id + '">Reset match</button>';
    else html += '<button class="btn btn-ghost danger-text" data-action="deleteMatch" data-id="' + m.id + '">Delete game</button>';
    return html + '</div>';
  }

  /* ---- Leaderboard ---- */
  function viewLeaderboard(params) {
    var scope = params.scope || 'all', catF = CATS[params.cat] ? params.cat : 'all';
    var ms = db.matches.filter(function (m) {
      if (scope === 'quick' && m.tId) return false;
      if (scope !== 'all' && scope !== 'quick' && m.tId !== scope) return false;
      if (catF !== 'all' && m.category !== catF) return false;
      return true;
    });
    var rows = computeStats(ms).filter(function (s) { return s.mp > 0; });
    var finished = ms.filter(function (m) { return m.status === 'done'; });
    var refCount = {};
    finished.forEach(function (m) { if (m.refId) refCount[m.refId] = (refCount[m.refId] || 0) + 1; });
    var refRows = Object.keys(refCount).map(function (k) { return { id: k, n: refCount[k] }; }).sort(function (a, b) { return b.n - a.n; });
    var unitCat = catF !== 'all' ? CATS[catF] : (scope !== 'all' && scope !== 'quick' && T(scope) ? CATS[T(scope).category] : null);

    var html = '<div class="wrap"><header class="page-head row-between"><div><span class="eyebrow">Rankings</span><h1>Leaderboard</h1><p class="muted">Win = 3 points. Ties broken by game difference, games won, then point difference.</p></div>' +
      '<button class="btn btn-ghost no-print" data-action="print">🖨 Print</button></header>' +
      '<form class="filters card no-print" id="lbFilters">' +
        '<label class="field"><span>Scope</span><select name="scope"><option value="all">All matches</option><option value="quick"' + (scope === 'quick' ? ' selected' : '') + '>Quick games only</option>' +
          db.tournaments.map(function (t) { return '<option value="' + t.id + '"' + (scope === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>Category</span><select name="cat"><option value="all">All categories</option>' + CAT_ORDER.map(function (id) { return '<option value="' + id + '"' + (catF === id ? ' selected' : '') + '>' + esc(CATS[id].name) + '</option>'; }).join('') + '</select></label>' +
      '</form>';

    if (rows.length >= 3) {
      html += '<section class="podium">' + [1, 0, 2].map(function (i) {
        var s = rows[i];
        return '<div class="pod pod-' + (i + 1) + '">' + avatar(pName(s.id)) + '<b>' + esc(pName(s.id)) + '</b><span>' + s.pts + ' pts · ' + s.w + '–' + s.l + '</span><div class="pod-block">' + (i + 1) + '</div></div>';
      }).join('') + '</section>';
    }
    html += '<section class="stats-row">' +
      '<div class="stat"><b>' + finished.length + '</b><span>matches played</span></div>' +
      '<div class="stat"><b>' + rows.length + '</b><span>ranked players</span></div>' +
      '<div class="stat"><b>' + finished.reduce(function (a, m) { return a + m.s1 + m.s2; }, 0) + '</b><span>' + esc(unitCat ? unitCat.unit.toLowerCase() : 'games') + ' played</span></div>' +
      '<div class="stat"><b>' + db.tournaments.filter(function (t) { return t.status === 'done'; }).length + '</b><span>tournaments finished</span></div></section>';
    html += standingsTable(rows, unitCat);
    if (refRows.length) {
      html += '<section class="card"><h2>Referees</h2><ul class="list ref-list">' + refRows.map(function (r) { return '<li>' + window.BT_REFEREE_SVG({ className: 'ref-mini' }) + '<b>' + esc(rName(r.id) || 'Removed referee') + '</b><span class="muted small">' + plural(r.n, 'match', 'matches') + ' officiated</span></li>'; }).join('') + '</ul></section>';
    }
    return html + '</div>';
  }

  /* ---- People ---- */
  function viewPeople() {
    var stats = {};
    computeStats(db.matches).forEach(function (s) { stats[s.id] = s; });
    var refCount = {};
    db.matches.forEach(function (m) { if (m.refId && (m.status === 'done' || m.status === 'live')) refCount[m.refId] = (refCount[m.refId] || 0) + 1; });
    var players = db.players.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var refs = db.referees.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    return '<div class="wrap"><header class="page-head"><span class="eyebrow">Roster</span><h1>Players &amp; Referees</h1><p class="muted">Names are saved automatically when you start a game or a tournament. Add, rename or remove them here.</p></header>' +
      '<div class="grid-2">' +
      '<section class="card"><div class="section-head"><h2>Players <small class="muted">' + players.length + '</small></h2></div>' +
        '<form class="inline-form" id="addPlayer"><input name="name" maxlength="40" placeholder="New player name" aria-label="New player name" required><button class="btn btn-primary btn-sm" type="submit">Add</button></form>' +
        (players.length ? '<ul class="list people">' + players.map(function (p) {
          var s = stats[p.id];
          return '<li>' + avatar(p.name) + '<span class="pp-name">' + esc(p.name) + '<small class="muted">' + (s && s.mp ? s.w + 'W – ' + s.l + 'L · ' + s.pts + ' pts' : 'No matches yet') + '</small></span>' +
            '<span class="pp-actions"><button class="btn btn-ghost btn-sm" data-action="rename" data-kind="player" data-id="' + p.id + '">Rename</button>' +
            '<button class="btn btn-ghost btn-sm danger-text" data-action="removePerson" data-kind="player" data-id="' + p.id + '">Remove</button></span></li>';
        }).join('') + '</ul>' : '<p class="muted">No players yet.</p>') + '</section>' +
      '<section class="card"><div class="section-head"><h2>Referees <small class="muted">' + refs.length + '</small></h2></div>' +
        '<form class="inline-form" id="addReferee"><input name="name" maxlength="40" placeholder="New referee name" aria-label="New referee name" required><button class="btn btn-primary btn-sm" type="submit">Add</button></form>' +
        (refs.length ? '<ul class="list people">' + refs.map(function (r) {
          return '<li>' + window.BT_REFEREE_SVG({ className: 'ref-mini' }) + '<span class="pp-name">' + esc(r.name) + '<small class="muted">' + plural(refCount[r.id] || 0, 'match', 'matches') + ' officiated</small></span>' +
            '<span class="pp-actions"><button class="btn btn-ghost btn-sm" data-action="rename" data-kind="referee" data-id="' + r.id + '">Rename</button>' +
            '<button class="btn btn-ghost btn-sm danger-text" data-action="removePerson" data-kind="referee" data-id="' + r.id + '">Remove</button></span></li>';
        }).join('') + '</ul>' : '<p class="muted">No referees yet.</p>') + '</section>' +
      '</div></div>';
  }

  /* ---- Rules ---- */
  function viewRules(catId) {
    var key = window.BT_RULES[catId] ? catId : 'general';
    var r = window.BT_RULES[key];
    var tabs = ['general'].concat(CAT_ORDER);
    var html = '<div class="wrap"><header class="page-head"><span class="eyebrow">Rulebook</span><h1>Rules</h1><p class="muted">Summaries of the international standard rules for every category, plus tournament and referee guidelines.</p></header>' +
      '<div class="tabs tabs-scroll" role="tablist">' + tabs.map(function (k) {
        return '<a role="tab" class="tab' + (k === key ? ' active' : '') + '" aria-selected="' + (k === key) + '" href="#/rules/' + k + '">' + (CATS[k] ? ballIcon(CATS[k], 18) : '⚖️ ') + esc(CATS[k] ? CATS[k].name : 'Tournament & Referee') + '</a>';
      }).join('') + '</div>' +
      '<article class="rules"><header class="rules-head">' + (CATS[key] ? ballIcon(CATS[key], 56) : window.BT_REFEREE_SVG({ className: 'ref-mini ref-56' })) + '<div><h2>' + esc(r.title) + '</h2><p class="lead">' + esc(r.tagline) + '</p></div></header>' +
      '<dl class="facts">' + r.facts.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="rules-grid">' + r.sections.map(function (s, i) {
        return '<section class="card rule-sec"><h3><span class="rule-num">' + (i + 1) + '</span>' + esc(s.h) + '</h3>' + (s.p ? '<p>' + s.p + '</p>' : '') + (s.list ? '<ul>' + s.list.map(function (li) { return '<li>' + li + '</li>'; }).join('') + '</ul>' : '') + '</section>';
      }).join('') + '</div>' +
      (r.scoring ? '<section class="card callout"><h3>Scoring on this site</h3><p>' + esc(r.scoring) + '</p>' + (CATS[key] ? '<a class="btn btn-primary" href="#/play?c=' + key + '">Start a ' + esc(CATS[key].name) + ' game</a>' : '') + '</section>' : '') +
      '<p class="muted small disclaimer">Summaries based on the WPA World Standardized Rules (pool), WPBSA rules (snooker) and common Italian federation practice (5-Pins). Local variations announced by the organiser before play take priority.</p>' +
      '</article></div>';
    return html;
  }

  /* ---- Data ---- */
  function viewData() {
    var size = 0;
    try { size = new Blob([JSON.stringify(db)]).size; } catch (e) { size = 0; }
    return '<div class="wrap narrow"><header class="page-head"><span class="eyebrow">Your data</span><h1>Backup &amp; restore</h1><p class="muted">There is no login: everything is stored in this browser on this device. Export a backup to move it to another device or keep it safe.</p></header>' +
      (storageOk ? '' : '<div class="card warn-card">This browser is blocking storage (private mode?). Export a backup before closing the tab.</div>') +
      '<section class="stats-row"><div class="stat"><b>' + db.players.length + '</b><span>players</span></div><div class="stat"><b>' + db.referees.length + '</b><span>referees</span></div><div class="stat"><b>' + db.tournaments.length + '</b><span>tournaments</span></div><div class="stat"><b>' + db.sessions.length + '</b><span>free play games</span></div><div class="stat"><b>' + db.matches.filter(function (m) { return m.status === 'done'; }).length + '</b><span>matches played</span></div></section>' +
      '<section class="card"><h2>Export</h2><p class="muted">Download all players, referees, tournaments and matches as a JSON file (' + Math.max(1, Math.round(size / 1024)) + ' KB).</p><button class="btn btn-primary" data-action="export">⬇ Download backup</button></section>' +
      '<section class="card"><h2>Import</h2><p class="muted">Restore a backup file. This replaces the current data on this device.</p><label class="btn btn-secondary file-btn">⬆ Choose backup file<input type="file" accept="application/json,.json" id="importFile"></label></section>' +
      '<section class="card"><h2>Demo</h2><p class="muted">Add a sample 8-player 9-Ball knockout tournament with two referees.</p><button class="btn btn-secondary" data-action="demo">Load demo tournament</button></section>' +
      '<section class="card danger-zone"><h2>Reset</h2><p class="muted">Delete everything on this device. This cannot be undone.</p><button class="btn btn-danger" data-action="resetAll">Delete all data</button></section></div>';
  }

  function notFound(msg) {
    return '<div class="wrap narrow">' + emptyState(msg || 'Page not found', 'It may have been deleted, or the link is wrong.', '<a class="btn btn-primary" href="#/">Go home</a>') + '</div>';
  }

  /* ------------------------------------------------------------------ *
   * Shot clock & match timer
   * ------------------------------------------------------------------ */
  var clock = { base: 30, remaining: 30, running: false, deadline: 0, lastBeep: -1 };
  var ticker = null;
  var audioCtx = null;
  function beep(freq, dur) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(0.15, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) { /* audio not available */ }
  }
  function clockReset() { clock.running = false; clock.remaining = clock.base; clock.lastBeep = -1; }
  function clockOp(op) {
    if (op === 'toggle') {
      if (clock.running) { clock.remaining = Math.max(0, (clock.deadline - Date.now()) / 1000); clock.running = false; }
      else { if (clock.remaining <= 0) clock.remaining = clock.base; clock.deadline = Date.now() + clock.remaining * 1000; clock.running = true; }
    } else if (op === 'reset') {
      clockReset();
    } else if (op === 'ext') {
      if (clock.running) clock.deadline += 30000; else clock.remaining += 30;
    } else if (op === 'base') {
      clock.base = clock.base === 30 ? 60 : 30; clockReset();
    }
    paintClock();
    var tg = $('#scToggle'); if (tg) tg.textContent = clock.running ? 'Pause' : 'Start';
    var bb = $('[data-action="clock"][data-op="base"]'); if (bb) bb.textContent = clock.base + 's';
  }
  function paintClock() {
    var el = $('#scVal'), box = $('#shotClock');
    if (!el) return;
    var rem = clock.running ? Math.max(0, (clock.deadline - Date.now()) / 1000) : clock.remaining;
    var shown = Math.ceil(rem - 0.001);
    if (shown < 0) shown = 0;
    el.textContent = shown;
    box.classList.toggle('sc-warn', shown <= 10 && shown > 5);
    box.classList.toggle('sc-crit', shown <= 5);
    box.classList.toggle('sc-run', clock.running);
    if (clock.running) {
      if (shown <= 5 && shown !== clock.lastBeep) { clock.lastBeep = shown; beep(shown === 0 ? 440 : 880, shown === 0 ? 0.6 : 0.12); }
      if (rem <= 0) {
        clock.running = false; clock.remaining = 0;
        var tg = $('#scToggle'); if (tg) tg.textContent = 'Start';
        toast('Shot clock expired — foul.', 'warn');
      }
    }
  }
  function startTicker(m) {
    stopTicker();
    ticker = setInterval(function () {
      var cur = M(m.id);
      var tEl = $('#matchTimer');
      if (cur && tEl && cur.startedAt) tEl.textContent = fmtClock((cur.status === 'done' ? cur.endedAt : Date.now()) - cur.startedAt);
      paintClock();
    }, 250);
  }
  function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } }

  /* ------------------------------------------------------------------ *
   * Demo data
   * ------------------------------------------------------------------ */
  function loadDemo() {
    var names = ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi', 'Sara Neri', 'Alessandro Conti', 'Chiara Romano', 'Matteo Greco', 'Elena Marino'];
    var players = names.map(ensurePlayer);
    var refs = ['Paolo Ferri', 'Anna Galli'].map(ensureReferee);
    var t = {
      id: uid(), name: 'Demo 9-Ball Open', category: 'nineball', format: 'elim', raceTo: 5, target: 0, breakRule: 'alternate',
      playerIds: players.map(function (p) { return p.id; }), refereeIds: refs.map(function (r) { return r.id; }),
      status: 'active', championId: null, createdAt: Date.now(), rounds: 0, refTurn: 0
    };
    db.tournaments.push(t);
    buildElim(t);
    /* play two first-round matches so the bracket has results */
    tMatches(t).filter(function (m) { return m.round === 1; }).slice(0, 2).forEach(function (m, i) {
      startMatch(m, refs[i % 2].id, 1);
      var w = i === 0 ? 1 : 2;
      var l = other(w);
      for (var k = 0; k < 3; k++) { m['s' + l]++; }
      m['f' + l] = 2; m['f' + w] = 1;
      m['s' + w] = m.raceTo;
      m.startedAt = Date.now() - 1000 * 60 * (40 + i * 7);
      finish(m, w);
    });
    celebrate = false; pendingGesture = null;
    save();
    toast('Demo tournament loaded.');
    go('#/t/' + t.id);
  }

  /* ------------------------------------------------------------------ *
   * Router
   * ------------------------------------------------------------------ */
  var view = $('#view');
  var currentPath = null;
  var currentMatchId = null;
  var currentFreeId = null;

  function parseHash() {
    var h = location.hash.replace(/^#/, '') || '/';
    var q = h.indexOf('?');
    var path = q >= 0 ? h.slice(0, q) : h;
    var params = {};
    if (q >= 0) h.slice(q + 1).split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      try { params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } catch (e) { /* ignore bad param */ }
    });
    if (path.length > 1) path = path.replace(/\/+$/, '');
    return { path: path || '/', params: params };
  }
  function go(hash) {
    if (location.hash === hash) render(false); else location.hash = hash;
  }

  function render(inPlace) {
    var r = parseHash();
    var path = r.path, params = r.params, html, after = null, nav = '';
    var mm;
    var leavingMatch = currentMatchId;
    currentMatchId = null;
    currentFreeId = null;

    if (path === '/') { html = viewHome(); nav = 'home'; }
    else if (path === '/play') { html = viewPlay(params); after = afterPlay; nav = ''; }
    else if (path === '/tournaments') { html = viewTournaments(); nav = 'tournaments'; }
    else if (path === '/tournaments/new') { html = viewNewTournament(); after = afterNewTournament; nav = 'tournaments'; }
    else if ((mm = path.match(/^\/t\/([A-Za-z0-9_-]+)$/))) { html = viewTournament(mm[1], params); nav = 'tournaments'; }
    else if ((mm = path.match(/^\/match\/([A-Za-z0-9_-]+)$/))) { html = viewMatch(mm[1]); currentMatchId = mm[1]; nav = M(mm[1]) && M(mm[1]).tId ? 'tournaments' : ''; }
    else if (path === '/leaderboard') { html = viewLeaderboard(params); nav = 'leaderboard'; }
    else if (path === '/people') { html = viewPeople(); nav = 'people'; }
    else if ((mm = path.match(/^\/rules(?:\/([a-z]+))?$/))) { html = viewRules(mm[1]); nav = 'rules'; }
    else if (path === '/data') { html = viewData(); nav = 'data'; }
    else if (path === '/free') { html = viewFree(); after = afterFree; nav = 'free'; }
    else if ((mm = path.match(/^\/free\/([A-Za-z0-9_-]+)$/))) { html = viewFreeBoard(mm[1]); currentFreeId = mm[1]; nav = 'free'; }
    else { html = notFound(); }

    if (leavingMatch !== currentMatchId) { clockReset(); }
    stopTicker();

    var scrollY = window.scrollY;
    var focusSel = null;
    if (inPlace && document.activeElement && document.activeElement !== document.body && view.contains(document.activeElement)) {
      var ae = document.activeElement;
      focusSel = ['data-action', 'data-op', 'data-side', 'data-n', 'data-id'].filter(function (k) { return ae.hasAttribute(k); })
        .map(function (k) { return '[' + k + '="' + String(ae.getAttribute(k)).replace(/["\\]/g, '') + '"]'; }).join('');
    }
    view.innerHTML = html;
    $$('#nav a').forEach(function (a) {
      var on = a.getAttribute('data-nav') === nav;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var titles = { home: '', free: 'Free Play', tournaments: 'Tournaments', leaderboard: 'Leaderboard', people: 'Players & Referees', rules: 'Rules', data: 'Data' };
    document.title = (currentMatchId ? 'Live score · ' : (titles[nav] ? titles[nav] + ' · ' : (path === '/play' ? 'Start game · ' : ''))) + 'Biliardo Tournament';

    if (after) after();
    if (currentMatchId) {
      var m = M(currentMatchId);
      if (m && (m.status === 'live' || m.status === 'done')) startTicker(m);
      paintClock();
      applyGesture();
    } else if (currentFreeId && S(currentFreeId)) {
      var fs = S(currentFreeId);
      if (fs.status === 'live') ticker = setInterval(function () {
        var tEl = $('#matchTimer'); var cur = S(fs.id);
        if (tEl && cur && cur.status === 'live') tEl.textContent = fmtClock(Date.now() - cur.startedAt);
      }, 500);
      applyGesture();
    } else {
      pendingGesture = null;
    }
    if (celebrate) { celebrate = false; confetti(); }

    if (inPlace) {
      window.scrollTo(0, scrollY);
      if (focusSel) { var fe = $(focusSel, view); if (fe && !fe.disabled) { try { fe.focus({ preventScroll: true }); } catch (err) { fe.focus(); } } }
    } else {
      window.scrollTo(0, 0);
      if (dlg && !dlg.open) { try { view.focus({ preventScroll: true }); } catch (err) { /* ignore */ } }
    }
    currentPath = path;
  }

  function applyGesture() {
    if (!pendingGesture) return;
    var g = pendingGesture; pendingGesture = null;
    var svg = $('.ref-stage .ref-svg'), bub = $('#refBubble');
    if (!svg) return;
    svg.classList.remove('g-idle');
    svg.classList.add('g-' + g.type);
    if (bub) {
      bub.textContent = g.text;
      bub.className = 'bubble bubble-' + g.type;
      bub.hidden = false;
    }
  }

  /* ------------------------------------------------------------------ *
   * Events
   * ------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    var a = el.getAttribute('data-action');
    var id = el.getAttribute('data-id');
    var m;
    switch (a) {
      case 'sb': {
        m = M(currentMatchId); if (!m) return;
        var op = el.getAttribute('data-op'), side = parseInt(el.getAttribute('data-side'), 10) === 2 ? 2 : 1;
        var n = el.hasAttribute('data-n') ? parseInt(el.getAttribute('data-n'), 10) : null;
        if (op === 'custom') {
          promptNumber('Add points — ' + sideName(m, side), 'Points to add', 1, 200, 1, function (v) { act(m, 'pts', side, v); });
          return;
        }
        if (op === 'foulN') {
          promptNumber('Foul by ' + sideName(m, side), 'Points awarded to ' + sideName(m, other(side)), 1, 200, 2, function (v) { act(m, 'foul', side, v); });
          return;
        }
        if (op === 'concede') {
          confirmDialog('Concede ' + cat(m).one.toLowerCase() + '?', sideName(m, side) + ' concedes. The ' + cat(m).one.toLowerCase() + ' goes to ' + sideName(m, other(side)) + '.', 'Concede', true, function () { act(m, 'concede', side); });
          return;
        }
        if (op === 'endframe') {
          if (m.g1 === m.g2) { toast('Scores are level — re-spot the black and play on.', 'warn'); return; }
          var lead = m.g1 > m.g2 ? 1 : 2;
          confirmDialog('End frame?', 'Award the frame to ' + sideName(m, lead) + ' (' + m.g1 + '–' + m.g2 + ').', 'End frame', false, function () { act(m, 'endframe', lead); });
          return;
        }
        act(m, op, side, n);
        break;
      }
      case 'undo': m = M(id); if (m) undo(m); break;
      case 'clock': clockOp(el.getAttribute('data-op')); break;
      case 'startMatch': m = M(id); if (m && m.status === 'pending' && m.p1 && m.p2) openStartDialog(m); break;
      case 'walkover': {
        m = M(id); if (!m || m.status !== 'live') return;
        openDialog({
          title: 'Walkover',
          body: '<p>Award the match without play (no-show or retirement). Who wins?</p><label class="field"><span>Winner</span><select name="w"><option value="1">' + esc(sideName(m, 1)) + '</option><option value="2">' + esc(sideName(m, 2)) + '</option></select></label>',
          ok: 'Award walkover', okClass: 'btn-danger',
          onOk: function (fd) { act(m, 'walkover', fd.get('w') === '2' ? 2 : 1); }
        });
        break;
      }
      case 'resetMatch': {
        m = M(id); if (!m) return;
        confirmDialog('Reset this match?', 'All scores and the log for this match will be cleared and it will go back to “not started”.', 'Reset match', true, function () {
          if (resetMatch(m)) { save(); toast('Match reset.'); go('#/t/' + m.tId); }
        });
        break;
      }
      case 'deleteMatch': {
        m = M(id); if (!m) return;
        confirmDialog('Delete this game?', 'It will be removed from the leaderboard. This cannot be undone.', 'Delete', true, function () {
          db.matches = db.matches.filter(function (x) { return x.id !== m.id; });
          save(); toast('Game deleted.'); go('#/');
        });
        break;
      }
      case 'rematch': {
        m = M(id); if (!m) return;
        var nm = newMatch({ category: m.category, raceTo: m.raceTo, target: m.target, p1: m.p1, p2: m.p2, breakRule: m.breakRule });
        db.matches.push(nm);
        startMatch(nm, m.refId && R(m.refId) ? m.refId : null, m.winner ? other(m.winner) : 1);
        save(); go('#/match/' + nm.id);
        break;
      }
      case 'fullscreen': {
        var b = document.documentElement;
        try {
          if (document.fullscreenElement) document.exitFullscreen();
          else if (b.requestFullscreen) b.requestFullscreen().catch(function () { toast('Fullscreen is not available here.'); });
          else toast('Fullscreen is not available here.');
        } catch (err) { toast('Fullscreen is not available here.'); }
        break;
      }
      case 'deleteTournament': {
        var t = T(id); if (!t) return;
        confirmDialog('Delete “' + t.name + '”?', 'The tournament and all its matches will be deleted. Players stay in the roster.', 'Delete tournament', true, function () {
          db.matches = db.matches.filter(function (x) { return x.tId !== t.id; });
          db.tournaments = db.tournaments.filter(function (x) { return x.id !== t.id; });
          save(); toast('Tournament deleted.'); go('#/tournaments');
        });
        break;
      }
      case 'addName': {
        var form = el.closest('form'); var ta = form && $('textarea[name="' + el.getAttribute('data-target') + '"]', form);
        if (!ta) return;
        var nm2 = el.getAttribute('data-name');
        var existing = parseNames(ta.value).map(function (x) { return x.toLowerCase(); });
        if (existing.indexOf(nm2.toLowerCase()) >= 0) { toast(nm2 + ' is already in the list.'); return; }
        ta.value = (ta.value.replace(/\s+$/, '') ? ta.value.replace(/\s+$/, '') + '\n' : '') + nm2;
        ta.dispatchEvent(new Event('input'));
        el.classList.add('chip-used');
        break;
      }
      case 'rename': {
        var kind = el.getAttribute('data-kind');
        var obj = kind === 'player' ? P(id) : R(id); if (!obj) return;
        openDialog({
          title: 'Rename ' + (kind === 'player' ? 'player' : 'referee'),
          body: '<label class="field"><span>Name</span><input name="name" maxlength="40" value="' + esc(obj.name) + '" required></label>',
          ok: 'Save',
          onOk: function (fd) {
            var nn = cleanName(fd.get('name'));
            if (!nn) { toast('Enter a name.', 'warn'); return false; }
            var clash = kind === 'player' ? playerByName(nn) : refByName(nn);
            if (clash && clash.id !== obj.id) { toast('That name is already used.', 'warn'); return false; }
            obj.name = nn; save(); render(true); toast('Saved.');
          }
        });
        break;
      }
      case 'removePerson': {
        var k2 = el.getAttribute('data-kind');
        if (k2 === 'player') {
          var p = P(id); if (!p) return;
          if (playerInUse(p.id)) { toast(p.name + ' has matches or tournaments, so they can’t be removed. Rename instead, or delete those first.', 'warn'); return; }
          confirmDialog('Remove ' + p.name + '?', 'The player will be removed from the roster.', 'Remove', true, function () {
            db.players = db.players.filter(function (x) { return x.id !== p.id; }); save(); render(true);
          });
        } else {
          var rf = R(id); if (!rf) return;
          confirmDialog('Remove ' + rf.name + '?', 'Past matches will show no referee name.', 'Remove', true, function () {
            db.referees = db.referees.filter(function (x) { return x.id !== rf.id; });
            db.tournaments.forEach(function (t) { t.refereeIds = t.refereeIds.filter(function (x) { return x !== rf.id; }); });
            save(); render(true);
          });
        }
        break;
      }
      case 'print': window.print(); break;
      case 'export': exportData(); break;
      case 'demo': loadDemo(); break;
      case 'resetAll':
        confirmDialog('Delete all data?', 'All players, referees, tournaments and matches on this device will be permanently deleted.', 'Delete everything', true, function () {
          db = defaults(); save(); toast('All data deleted.'); go('#/');
        });
        break;
    }
  });

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !f.id) return;
    if (f.closest('dialog')) return;
    e.preventDefault();
    if (f.id === 'playForm') submitPlay(f);
    else if (f.id === 'tForm') submitTournament(f);
    else if (f.id === 'addPlayer' || f.id === 'addReferee') {
      var n = cleanName(new FormData(f).get('name'));
      if (!n) { toast('Enter a name.', 'warn'); return; }
      var isP = f.id === 'addPlayer';
      if (isP ? playerByName(n) : refByName(n)) { toast(n + ' already exists.', 'warn'); return; }
      if (isP) ensurePlayer(n); else ensureReferee(n);
      save(); toast(n + ' added.'); render(true);
      var inp = $('#' + f.id + ' input'); if (inp) inp.focus();
    } else if (f.id === 'addTRef') {
      var r = parseHash().path.match(/^\/t\/([A-Za-z0-9_-]+)$/);
      var t = r && T(r[1]); if (!t) return;
      var ref = ensureReferee(new FormData(f).get('ref'));
      if (!ref) { toast('Enter a name.', 'warn'); return; }
      if (t.refereeIds.indexOf(ref.id) < 0) t.refereeIds.push(ref.id);
      save(); toast(ref.name + ' added to the tournament.'); render(true);
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.name === 'category' && el.form && (el.form.id === 'playForm' || el.form.id === 'tForm')) syncFormatFields(el.form, true);
    if (el.form && el.form.id === 'lbFilters') {
      var fd = new FormData(el.form);
      var q = [];
      if (fd.get('scope') && fd.get('scope') !== 'all') q.push('scope=' + encodeURIComponent(fd.get('scope')));
      if (fd.get('cat') && fd.get('cat') !== 'all') q.push('cat=' + encodeURIComponent(fd.get('cat')));
      location.hash = '#/leaderboard' + (q.length ? '?' + q.join('&') : '');
    }
    if (el.id === 'importFile' && el.files && el.files[0]) importData(el.files[0], el);
  });

  function exportData() {
    try {
      var blob = new Blob([JSON.stringify({ app: 'biliardo-tournament', exportedAt: new Date().toISOString(), data: db }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'biliardo-tournament-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      toast('Backup downloaded.');
    } catch (e) { toast('Export failed in this browser.', 'warn'); }
  }
  function importData(file, input) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(reader.result); } catch (e) { toast('That file is not valid JSON.', 'warn'); input.value = ''; return; }
      var data = parsed && parsed.data ? parsed.data : parsed;
      if (!data || !Array.isArray(data.players) || !Array.isArray(data.matches)) { toast('That file is not a Biliardo Tournament backup.', 'warn'); input.value = ''; return; }
      confirmDialog('Replace current data?', 'The backup has ' + data.players.length + ' players and ' + (data.tournaments || []).length + ' tournaments. Current data on this device will be replaced.', 'Import', true, function () {
        db = normalize(data); save(); toast('Backup restored.'); go('#/');
      });
      input.value = '';
    };
    reader.onerror = function () { toast('Could not read the file.', 'warn'); };
    reader.readAsText(file);
  }

  /* keep tabs in sync if the site is open in two windows */
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    db = load();
    if (!(dlg && dlg.open)) render(true);
  });

  window.addEventListener('hashchange', function () {
    if (dlg && dlg.open) dlg.close('cancel');
    render(false);
  });

  /* ------------------------------------------------------------------ *
   * Free Play — 2 to 4 players, up to 15 games, +1 point per game won
   * ------------------------------------------------------------------ */
  var FP_MAX_GAMES = 15;
  function S(id) { return id ? find(db.sessions, id) : null; }
  function fpPoints(s) {
    var pts = s.players.map(function () { return 0; });
    s.games.forEach(function (w) { if (w >= 0 && w < pts.length) pts[w]++; });
    return pts;
  }
  /* s.maxGames is the target: the first player to reach it wins (race to N).
     Points go up one at a time, so two players can never reach it together. */
  function fpEligible(s) {
    return s.players.map(function (_, i) { return i; });
  }
  function fpCheckEnd(s) {
    var pts = fpPoints(s);
    for (var i = 0; i < pts.length; i++) {
      if (pts[i] >= s.maxGames) {
        s.status = 'done'; s.winnerIdx = i; s.endedAt = Date.now();
        gesture('win', pName(s.players[i]) + ' wins!');
        celebrate = true;
        return;
      }
    }
  }
  function fpRanking(s) {
    var pts = fpPoints(s);
    return s.players.map(function (id, i) { return { i: i, id: id, pts: pts[i] }; })
      .sort(function (a, b) { return b.pts - a.pts || a.i - b.i; });
  }
  function fpSide(s, i) { var n = s.players.length; return i * 2 < n - 1 ? 'left' : 'right'; }

  function viewFree() {
    var list = db.sessions.slice().sort(function (a, b) { return (b.startedAt || 0) - (a.startedAt || 0); });
    var gameOpts = '';
    gameOpts = gameOptions();
    var html = '<div class="wrap narrow">' +
      '<header class="page-head"><span class="eyebrow">Normal play</span><h1>Free Play</h1><p class="muted">Casual games for 2, 3 or 4 players. Choose the points to win (up to 15) and press <b>+1 Point</b> for the player who wins each game. The first player to reach that number wins: choose 9 and whoever gets 9 first wins; choose 15 and whoever gets 15 first wins.</p></header>' +
      '<form class="card form" id="freeForm" autocomplete="off" novalidate>' +
        '<fieldset><legend>Category</legend>' + catPicker('eightball', 'fpcat') + '</fieldset>' +
        '<fieldset><legend>Number of players</legend><div class="seg seg-3" role="radiogroup" aria-label="Number of players">' +
          [2, 3, 4].map(function (n) { return '<label><input type="radio" name="count" value="' + n + '"' + (n === 3 ? ' checked' : '') + '><span><b>' + n + ' players</b></span></label>'; }).join('') +
        '</div><div class="grid-2">' +
          [1, 2, 3, 4].map(function (i) { return '<label class="field" data-fp-player="' + i + '"' + (i > 3 ? ' hidden' : '') + '><span>Player ' + i + '</span><input name="p' + i + '" list="dl-players" maxlength="40" placeholder="Name"></label>'; }).join('') +
        '</div></fieldset>' +
        '<fieldset><legend>Points to win &amp; referee</legend><div class="grid-2">' +
          '<label class="field"><span>Points to win (max 15)</span><select name="games">' + gameOpts + '</select></label>' +
          '<label class="field"><span>Referee <small class="muted">(optional)</small></span><input name="ref" list="dl-refs" maxlength="40" placeholder="Name"></label>' +
        '</div></fieldset>' +
        '<div class="form-actions"><a class="btn btn-ghost" href="#/">Cancel</a><button class="btn btn-primary btn-lg" type="submit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>Start Free Play</button></div>' +
      '</form>' + datalists();
    if (list.length) {
      html += '<section class="card" style="margin-top:20px"><div class="section-head"><h2>Recent Free Play</h2></div><ul class="list">' + list.slice(0, 20).map(function (s) {
        var r = fpRanking(s);
        return '<li><a class="t-row" href="#/free/' + s.id + '"><span class="t-row-main"><b>' + esc(s.players.map(pName).join(' · ')) + '</b><small>' + esc(CATS[s.category] ? CATS[s.category].name : '') + ' · first to ' + s.maxGames + ' · ' + plural(s.games.length, 'game', 'games') + ' played · ' +esc(fmtDate(s.startedAt)) + '</small></span>' +
          (s.status === 'done' ? (s.winnerIdx >= 0 ? '<span class="badge badge-gold">🏆 ' + esc(pName(s.players[s.winnerIdx])) + ' ' + r[0].pts + '</span>' : '<span class="badge">Draw</span>') : '<span class="badge badge-live">Live</span>') + '</a></li>';
      }).join('') + '</ul></section>';
    }
    return html + '</div>';
  }
  function afterFree() {
    var f = $('#freeForm'); if (!f) return;
    fpSyncCount(f);
    var p1 = $('input[name="p1"]', f); if (p1) p1.focus();
  }
  function fpSyncCount(f) {
    var c = $('input[name="count"]:checked', f); var n = c ? parseInt(c.value, 10) : 3;
    $$('[data-fp-player]', f).forEach(function (el) { el.hidden = parseInt(el.getAttribute('data-fp-player'), 10) > n; });
  }
  function submitFree(f) {
    var fd = new FormData(f);
    var catSel = fd.get('fpcat') || fd.get('category');
    var catId = CATS[catSel] ? catSel : 'eightball';
    var n = intIn(fd.get('count'), 2, 4, 3);
    var names = [], seen = {};
    for (var i = 1; i <= n; i++) {
      var nm = cleanName(fd.get('p' + i));
      if (!nm) { toast('Enter a name for Player ' + i + '.', 'warn'); $('input[name="p' + i + '"]', f).focus(); return; }
      if (seen[nm.toLowerCase()]) { toast('Each player needs a different name.', 'warn'); $('input[name="p' + i + '"]', f).focus(); return; }
      seen[nm.toLowerCase()] = 1; names.push(nm);
    }
    var ref = ensureReferee(fd.get('ref'));
    var s = {
      id: uid(), category: catId, players: names.map(function (x) { return ensurePlayer(x).id; }),
      refId: ref ? ref.id : null, maxGames: intIn(fd.get('games'), 1, FP_MAX_GAMES, FP_MAX_GAMES),
      games: [], status: 'live', winnerIdx: -1, startedAt: Date.now(), endedAt: null
    };
    db.sessions.push(s); save();
    go('#/free/' + s.id);
  }

  function viewFreeBoard(id) {
    var s = S(id); if (!s) return notFound('Free Play game not found');
    var c = CATS[s.category] || CATS.eightball;
    var pts = fpPoints(s), done = s.status === 'done';
    var elig = fpEligible(s);
    var gameNo = s.games.length + 1;
    var top = Math.max.apply(null, pts);
    var near = pts.map(function (p, i) { return p === s.maxGames - 1 ? i : -1; }).filter(function (i) { return i >= 0; });
    var html = '<div class="board-wrap"><div class="wrap"><nav class="crumbs"><a href="#/free">Free Play</a><span>/</span><span>' + esc(s.players.map(pName).join(' · ')) + '</span></nav></div>' +
      '<section class="board fp-board' + (done ? ' board-done' : '') + '">' +
      '<div class="board-head">' + catBadge(s.category) + '<span class="bh-race">' + 'First to ' + s.maxGames + ' · ' + (done ? 'Finished after ' + plural(s.games.length, 'game', 'games') : 'Game ' + gameNo) + '</span>' +
        '<span class="bh-timer">⏱ <b id="matchTimer">' + fmtClock((done ? s.endedAt : Date.now()) - s.startedAt) + '</b></span>' +
        (done ? '<span class="badge badge-gold">Final</span>' : '<span class="badge badge-live">Live</span>') + '</div>' +
      '<div class="fp-top"><div class="ref-stage"><div class="bubble" id="refBubble" hidden></div>' + window.BT_REFEREE_SVG({ className: 'g-idle' }) + '</div>' +
        '<div class="fp-status"><span class="muted tiny">Referee</span><b>' + esc(s.refId ? rName(s.refId) || 'Referee' : 'No referee') + '</b>' +
        '<p class="fp-msg">' + (done ? (s.winnerIdx >= 0 ? '🏆 <b>' + esc(pName(s.players[s.winnerIdx])) + '</b> wins with ' + plural(pts[s.winnerIdx], 'point', 'points') + '!' : 'Finished as a draw.')
          : near.length ? '🔥 ' + esc(near.map(function (i) { return pName(s.players[i]); }).join(' and ')) + (near.length > 1 ? ' need' : ' needs') + ' just 1 more point to win!'
          : 'First player to reach <b>' + s.maxGames + '</b> wins. Press <b>+1 Point</b> for the winner of game ' + gameNo + '.') + '</p>' +
        '<div class="fp-progress" aria-label="Games played">' + (function () {
          var cells = '';
          for (var g = 0; g < s.games.length; g++) {
            var w = s.games[g];
            cells += '<span class="fp-cell fp-c' + (w + 1) + '" title="Game ' + (g + 1) + ': ' + esc(pName(s.players[w])) + '">' + esc(initials(pName(s.players[w]))) + '</span>';
          }
          if (!done) cells += '<span class="fp-cell" title="Next game">' + gameNo + '</span>';
          return cells;
        })() + '</div></div></div>' +
      '<div class="fp-players fp-n' + s.players.length + '">' + s.players.map(function (pid, i) {
        var can = !done && elig.indexOf(i) >= 0;
        var leading = pts[i] === top && top > 0;
        return '<div class="side fp-side fp-s' + (i + 1) + (done && s.winnerIdx === i ? ' side-win' : '') + (done && s.winnerIdx !== i ? ' side-lose' : '') + '">' +
          '<div class="side-head"><span class="avatar fp-av' + (i + 1) + '" aria-hidden="true">' + esc(initials(pName(pid))) + '</span><div class="side-id"><h2 class="side-name">' + esc(pName(pid)) + '</h2>' +
          '<div class="side-tags">' + (leading && !done ? '<span class="tag tag-win">Leader</span>' : '') + (done && s.winnerIdx === i ? '<span class="tag tag-win">🏆 Winner</span>' : '') + '</div></div></div>' +
          '<div class="score-big"><span class="score-num">' + pts[i] + '</span><span class="score-label">of ' + s.maxGames + ' to win</span></div>' +
          '<div class="fp-dots" aria-hidden="true">' + (function () { var d = ''; for (var k = 0; k < s.maxGames; k++) d += '<i' + (k < pts[i] ? ' class="on"' : '') + '></i>'; return d; })() + '</div>' +
          '<button class="btn btn-primary btn-lg btn-block" data-action="fpPoint" data-id="' + s.id + '" data-n="' + i + '"' + (can ? '' : ' disabled') + '>+1 Point</button></div>';
      }).join('') + '</div>' +
      '<div class="board-foot"><button class="btn btn-secondary" data-action="fpUndo" data-id="' + s.id + '"' + (s.games.length ? '' : ' disabled') + '>↶ Undo</button>' +
        (done ? '<button class="btn btn-primary" data-action="fpRematch" data-id="' + s.id + '">Play again</button><a class="btn btn-secondary" href="#/free">New Free Play</a>'
          : '<button class="btn btn-ghost" data-action="fpFinish" data-id="' + s.id + '">Finish now</button><button class="btn btn-ghost" data-action="fullscreen">⛶ Fullscreen</button>') +
        '<button class="btn btn-ghost danger-text" data-action="fpDelete" data-id="' + s.id + '">Delete</button></div>' +
      '</section>';
    var rank = fpRanking(s);
    html += '<div class="wrap"><section class="card"><h2>Standings</h2><ol class="mini-board">' + rank.map(function (r, k) {
      return '<li><span class="rank rank-' + (k + 1) + '">' + (k + 1) + '</span><span class="avatar fp-av' + (r.i + 1) + '" aria-hidden="true">' + esc(initials(pName(r.id))) + '</span><span class="mb-name">' + esc(pName(r.id)) + '</span><span class="mb-pts">' + r.pts + ' pts</span></li>';
    }).join('') + '</ol></section></div>';
    return html + '</div>';
  }

  function fpAction(a, s, n) {
    if (a === 'fpPoint') {
      if (s.status !== 'live' || fpEligible(s).indexOf(n) < 0) return;
      s.games.push(n);
      gesture(fpSide(s, n), '+1 ' + pName(s.players[n]));
      fpCheckEnd(s);
      save(); render(true);
    } else if (a === 'fpUndo') {
      if (!s.games.length) return;
      s.games.pop();
      s.status = 'live'; s.winnerIdx = -1; s.endedAt = null;
      save(); toast('Last point undone.'); render(true);
    } else if (a === 'fpFinish') {
      confirmDialog('Finish now?', 'End this Free Play after ' + plural(s.games.length, 'game', 'games') + '. The player with the most points wins; a tie is a draw.', 'Finish', false, function () {
        var r = fpRanking(s);
        s.status = 'done'; s.endedAt = Date.now();
        s.winnerIdx = r.length > 1 && r[0].pts === r[1].pts ? -1 : r[0].i;
        if (s.winnerIdx >= 0) { gesture('win', pName(s.players[s.winnerIdx]) + ' wins!'); celebrate = true; }
        save(); render(true);
      });
    } else if (a === 'fpRematch') {
      var ns = { id: uid(), category: s.category, players: s.players.slice(), refId: s.refId && R(s.refId) ? s.refId : null, maxGames: s.maxGames, games: [], status: 'live', winnerIdx: -1, startedAt: Date.now(), endedAt: null };
      db.sessions.push(ns); save(); go('#/free/' + ns.id);
    } else if (a === 'fpDelete') {
      confirmDialog('Delete this Free Play?', 'Its score will be removed. This cannot be undone.', 'Delete', true, function () {
        db.sessions = db.sessions.filter(function (x) { return x.id !== s.id; });
        save(); toast('Deleted.'); go('#/free');
      });
    }
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action^="fp"]');
    if (!el || el.disabled) return;
    var s = S(el.getAttribute('data-id')); if (!s) return;
    fpAction(el.getAttribute('data-action'), s, parseInt(el.getAttribute('data-n'), 10));
  });
  document.addEventListener('change', function (e) {
    if (e.target.name === 'count' && e.target.form && e.target.form.id === 'freeForm') fpSyncCount(e.target.form);
    if (e.target.name === 'count' && e.target.form && e.target.form.id === 'playForm') playSyncCount(e.target.form);
  });
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'freeForm') submitFree(e.target);
  });
  document.addEventListener('keydown', function (e) {
    if (!currentFreeId || e.ctrlKey || e.metaKey || e.altKey || (dlg && dlg.open)) return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/INPUT|SELECT|TEXTAREA/.test(tag)) return;
    var s = S(currentFreeId); if (!s) return;
    if (e.key === 'z' || e.key === 'u') { e.preventDefault(); fpAction('fpUndo', s); return; }
    var k = parseInt(e.key, 10);
    if (k >= 1 && k <= s.players.length) { e.preventDefault(); fpAction('fpPoint', s, k - 1); }
  });

  /* keyboard shortcuts on the scoreboard (when no input is focused) */
  document.addEventListener('keydown', function (e) {
    if (!currentMatchId || e.ctrlKey || e.metaKey || e.altKey) return;
    if (dlg && dlg.open) return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/INPUT|SELECT|TEXTAREA/.test(tag)) return;
    if (tag === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    var m = M(currentMatchId); if (!m) return;
    if ((e.key === 'z' || e.key === 'u') && m.hist.length) { e.preventDefault(); undo(m); return; }
    if (m.status !== 'live') return;
    if (e.key === ' ') { e.preventDefault(); clockOp('toggle'); return; }
    var c = cat(m);
    if (c.mode === 'race') {
      if (e.key === '1' || e.key === 'ArrowLeft') { e.preventDefault(); act(m, 'rack', 1); }
      else if (e.key === '2' || e.key === 'ArrowRight') { e.preventDefault(); act(m, 'rack', 2); }
    } else if (c.mode === 'points') {
      if (e.key === '1' || e.key === 'ArrowLeft') { e.preventDefault(); act(m, 'pts', 1, 1); }
      else if (e.key === '2' || e.key === 'ArrowRight') { e.preventDefault(); act(m, 'pts', 2, 1); }
    }
  });

  if (!storageOk) setTimeout(function () { toast('This browser is blocking storage — export a backup before closing.', 'warn'); }, 600);
  render(false);

  /* expose a tiny API for debugging/tests */
  window.BT = { db: function () { return db; }, computeStats: computeStats, seedOrder: seedOrder };
})();
