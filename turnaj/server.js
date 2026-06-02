import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const dbDir = process.env.SACHYUH_DB_DIR
  ? path.resolve(process.env.SACHYUH_DB_DIR)
  : path.join(rootDir, 'db');
const dbFile = path.join(dbDir, 'shared-state.sqlite');
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const defaultStateId = 'koruna-26';
let db;

const DEFAULT_TOURNAMENTS = [
  { id: 'koruna-26', name: 'Koruna 26' },
  { id: 'pucalik-26', name: 'U Pučalíka 26' },
  { id: 'kovariku-26', name: 'U Kovaříků 26' },
  { id: 'osel-26', name: 'Zašívárna U Osla 26' },
];

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon']
]);

async function readState(stateId) {
  const row = db.prepare('SELECT id, payload_json FROM shared_state WHERE id = ?').get(stateId);
  if (!row) {
    return { id: stateId, payload: null };
  }
  try {
    return { id: row.id, payload: JSON.parse(row.payload_json) };
  } catch {
    return { id: row.id, payload: null };
  }
}

async function writeState(state) {
  db.prepare(`
    INSERT INTO shared_state (id, payload_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `).run(state.id, JSON.stringify(state.payload ?? null), Date.now());
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return null;
  }
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.normalize(path.join(rootDir, pathname));
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes.get(ext) ?? 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

async function initDb() {
  await mkdir(dbDir, { recursive: true });
  db = new DatabaseSync(dbFile);
  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_state (
      id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
  `);

  // Seed default tournaments if table is empty
  const { count } = db.prepare('SELECT COUNT(*) as count FROM tournaments').get();
  if (count === 0) {
    const now = Date.now();
    for (const t of DEFAULT_TOURNAMENTS) {
      db.prepare(`
        INSERT OR IGNORE INTO tournaments (id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(t.id, t.name, null, now, now);
    }
    console.log('Seeded default tournaments.');
  }
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }

    // --- /api/shared-state ---
    if (req.url.startsWith('/api/shared-state')) {
      if (req.method === 'GET') {
        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        const stateId = requestUrl.searchParams.get('id') || defaultStateId;
        const state = await readState(stateId);
        sendJson(res, 200, [state]);
        return;
      }

      if (req.method === 'POST') {
        const parsed = await readBody(req);
        if (parsed === null) {
          sendJson(res, 400, { error: 'Invalid JSON.' });
          return;
        }
        const nextState = {
          id: typeof parsed.id === 'string' && parsed.id ? parsed.id : defaultStateId,
          payload: parsed && typeof parsed.payload === 'object' ? parsed.payload : null
        };
        await writeState(nextState);
        sendJson(res, 200, { ok: true });
        return;
      }

      res.writeHead(405, { Allow: 'GET, POST' });
      res.end();
      return;
    }

    // --- /api/tournaments ---
    if (req.url.startsWith('/api/tournaments')) {
      const idMatch = req.url.match(/^\/api\/tournaments\/([^?/]+)/);
      const tournamentId = idMatch ? decodeURIComponent(idMatch[1]) : null;

      // GET /api/tournaments – list all
      if (req.method === 'GET' && !tournamentId) {
        const rows = db.prepare(
          'SELECT id, name, description, created_at, updated_at FROM tournaments ORDER BY created_at ASC'
        ).all();
        sendJson(res, 200, rows);
        return;
      }

      // POST /api/tournaments – create
      if (req.method === 'POST' && !tournamentId) {
        const parsed = await readBody(req);
        if (parsed === null) {
          sendJson(res, 400, { error: 'Invalid JSON.' });
          return;
        }
        if (typeof parsed.name !== 'string' || !parsed.name.trim()) {
          sendJson(res, 400, { error: 'Pole name je povinné.' });
          return;
        }
        const now = Date.now();
        const id = typeof parsed.id === 'string' && parsed.id
          ? parsed.id
          : `t-${now}`;
        db.prepare(`
          INSERT INTO tournaments (id, name, description, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name        = excluded.name,
            description = excluded.description,
            updated_at  = excluded.updated_at
        `).run(id, parsed.name.trim(), parsed.description || null, now, now);
        sendJson(res, 200, { ok: true, id });
        return;
      }

      // PATCH /api/tournaments/:id – rename
      if (req.method === 'PATCH' && tournamentId) {
        const parsed = await readBody(req);
        if (parsed === null) {
          sendJson(res, 400, { error: 'Invalid JSON.' });
          return;
        }
        if (typeof parsed.name !== 'string' || !parsed.name.trim()) {
          sendJson(res, 400, { error: 'Pole name je povinné.' });
          return;
        }
        db.prepare('UPDATE tournaments SET name = ?, updated_at = ? WHERE id = ?')
          .run(parsed.name.trim(), Date.now(), tournamentId);
        sendJson(res, 200, { ok: true });
        return;
      }

      // DELETE /api/tournaments/:id
      if (req.method === 'DELETE' && tournamentId) {
        db.prepare('DELETE FROM tournaments WHERE id = ?').run(tournamentId);
        db.prepare('DELETE FROM shared_state WHERE id = ?').run(tournamentId);
        sendJson(res, 200, { ok: true });
        return;
      }

      res.writeHead(405, { Allow: 'GET, POST, PATCH, DELETE' });
      res.end();
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
});

await initDb();
server.listen(port, () => {
  console.log(`Server running on http://127.0.0.1:${port}`);
});
