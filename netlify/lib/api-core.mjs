/* Biliardo Tournament — online tournament API (shared by the Netlify function and tests).
 *
 *   GET    /api/t          public list of published tournaments (history)
 *   GET    /api/t/:id      public copy of one tournament (bracket, scores, standings)
 *   PUT    /api/t/:id      publish or update. Header x-admin-key is required.
 *                          The first PUT for an id claims it with that key; later PUTs
 *                          must send the same key. Data is merged per match (newest wins),
 *                          so two scorers can update different matches at the same time.
 *   DELETE /api/t/:id      remove from the web (needs x-admin-key)
 *
 * Only a SHA-256 hash of the admin key is stored. Public responses never include it.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

const ID_RE = /^[A-Za-z0-9_-]{6,40}$/;
const MAX_BODY = 1_500_000;      // bytes
const MAX_MATCHES = 600;
const MAX_PEOPLE = 400;
const INDEX_KEY = '__index__';
const INDEX_MAX = 500;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}
const hash = (s) => createHash('sha256').update(String(s)).digest('hex');
function sameHash(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}
const str = (v, max) => String(v == null ? '' : v).slice(0, max);
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/* keep only the fields the site uses, with sane types */
function cleanMatch(m) {
  if (!isObj(m) || !ID_RE.test(String(m.id || ''))) return null;
  const out = {
    id: m.id, tId: str(m.tId, 40), round: num(m.round), idx: num(m.idx), category: str(m.category, 20),
    raceTo: num(m.raceTo), target: num(m.target),
    p1: m.p1 ? str(m.p1, 40) : null, p2: m.p2 ? str(m.p2, 40) : null, refId: m.refId ? str(m.refId, 40) : null,
    breaker: m.breaker === 2 ? 2 : 1, breakRule: m.breakRule === 'winner' ? 'winner' : 'alternate',
    status: ['pending', 'live', 'done', 'bye'].includes(m.status) ? m.status : 'pending',
    winner: m.winner === 1 || m.winner === 2 ? m.winner : 0, winnerId: m.winnerId ? str(m.winnerId, 40) : null,
    wo: !!m.wo, createdAt: num(m.createdAt), startedAt: m.startedAt ? num(m.startedAt) : null,
    endedAt: m.endedAt ? num(m.endedAt) : null, upd: num(m.upd),
    log: Array.isArray(m.log) ? m.log.slice(-200).filter(isObj).map((e) => ({ t: num(e.t), side: num(e.side), kind: str(e.kind, 10), text: str(e.text, 200) })) : []
  };
  for (const k of ['s1', 's2', 'g1', 'g2', 'tp1', 'tp2', 'f1', 'f2', 'cf1', 'cf2']) out[k] = num(m[k]);
  return out;
}
function cleanTournament(t) {
  if (!isObj(t) || !ID_RE.test(String(t.id || ''))) return null;
  return {
    id: t.id, name: str(t.name, 60) || 'Tournament', category: str(t.category, 20), format: t.format === 'rr' ? 'rr' : 'elim',
    raceTo: num(t.raceTo), target: num(t.target), breakRule: t.breakRule === 'winner' ? 'winner' : 'alternate',
    playerIds: Array.isArray(t.playerIds) ? t.playerIds.slice(0, 200).map((x) => str(x, 40)) : [],
    refereeIds: Array.isArray(t.refereeIds) ? t.refereeIds.slice(0, 100).map((x) => str(x, 40)) : [],
    status: t.status === 'done' ? 'done' : 'active', championId: t.championId ? str(t.championId, 40) : null,
    createdAt: num(t.createdAt), endedAt: t.endedAt ? num(t.endedAt) : null, rounds: num(t.rounds), upd: num(t.upd)
  };
}
function cleanPeople(list) {
  return (Array.isArray(list) ? list : []).slice(0, MAX_PEOPLE).filter((p) => isObj(p) && ID_RE.test(String(p.id || '')))
    .map((p) => ({ id: p.id, name: str(p.name, 40) || '?' }));
}

/* newest version of each object wins */
function mergeById(oldList, newList) {
  const map = new Map((oldList || []).map((x) => [x.id, x]));
  for (const x of newList) {
    const cur = map.get(x.id);
    if (!cur || num(x.upd) >= num(cur.upd)) map.set(x.id, x);
  }
  return [...map.values()];
}
function publicDoc(doc) {
  return { t: doc.t, matches: doc.matches, players: doc.players, referees: doc.referees, createdAt: doc.createdAt, updatedAt: doc.updatedAt };
}
function summary(doc) {
  const name = (id) => (doc.players.find((p) => p.id === id) || {}).name || null;
  const ms = doc.matches.filter((m) => m.status !== 'bye');
  return {
    id: doc.t.id, name: doc.t.name, category: doc.t.category, format: doc.t.format, status: doc.t.status,
    champion: doc.t.championId ? name(doc.t.championId) : null, players: doc.t.playerIds.length,
    played: ms.filter((m) => m.status === 'done').length, total: ms.length,
    live: ms.filter((m) => m.status === 'live').length,
    createdAt: doc.createdAt, updatedAt: doc.updatedAt
  };
}
async function updateIndex(store, id, entry) {
  const idx = (await store.get(INDEX_KEY, { type: 'json' })) || { list: [] };
  let list = Array.isArray(idx.list) ? idx.list.filter((x) => x && x.id !== id) : [];
  if (entry) list.unshift(entry);
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  list = list.slice(0, INDEX_MAX);
  await store.setJSON(INDEX_KEY, { list });
}

export async function handle(req, store) {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean); // ['api','t',id?]
  if (parts[0] !== 'api' || parts[1] !== 't' || parts.length > 3) return json(404, { error: 'Not found' });
  const id = parts[2];

  try {
    if (!id) {
      if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });
      const idx = (await store.get(INDEX_KEY, { type: 'json' })) || { list: [] };
      return json(200, { list: Array.isArray(idx.list) ? idx.list : [] });
    }
    if (!ID_RE.test(id)) return json(400, { error: 'Bad tournament id' });
    const key = 't:' + id;

    if (req.method === 'GET') {
      const doc = await store.get(key, { type: 'json' });
      return doc ? json(200, publicDoc(doc)) : json(404, { error: 'This tournament is not online (it may have been removed).' });
    }

    const adminKey = req.headers.get('x-admin-key') || '';
    if (adminKey.length < 20 || adminKey.length > 200) return json(401, { error: 'Missing or invalid access key' });
    const existing = await store.get(key, { type: 'json' });
    if (existing && !sameHash(existing.keyHash, hash(adminKey))) return json(403, { error: 'Wrong access key for this tournament' });

    if (req.method === 'DELETE') {
      if (existing) await store.delete(key);
      await updateIndex(store, id, null);
      return json(200, { ok: true });
    }
    if (req.method !== 'PUT') return json(405, { error: 'Method not allowed' });

    const text = await req.text();
    if (text.length > MAX_BODY) return json(413, { error: 'Tournament data is too large' });
    let body;
    try { body = JSON.parse(text); } catch { return json(400, { error: 'Invalid JSON' }); }
    const t = cleanTournament(body && body.t);
    if (!t || t.id !== id) return json(400, { error: 'Tournament data does not match the id' });
    const matches = (Array.isArray(body.matches) ? body.matches : []).slice(0, MAX_MATCHES).map(cleanMatch).filter((m) => m && m.tId === id);

    const now = Date.now();
    const doc = existing
      ? {
          ...existing,
          t: num(t.upd) >= num(existing.t.upd) ? t : existing.t,
          matches: mergeById(existing.matches, matches),
          players: mergeById(existing.players, cleanPeople(body.players)),
          referees: mergeById(existing.referees, cleanPeople(body.referees)),
          updatedAt: now
        }
      : { t, matches, players: cleanPeople(body.players), referees: cleanPeople(body.referees), keyHash: hash(adminKey), createdAt: now, updatedAt: now };
    if (doc.matches.length > MAX_MATCHES) return json(413, { error: 'Too many matches' });

    await store.setJSON(key, doc);
    await updateIndex(store, id, summary(doc));
    return json(200, publicDoc(doc));
  } catch (err) {
    return json(500, { error: 'Server error', detail: String((err && err.message) || err).slice(0, 200) });
  }
}
