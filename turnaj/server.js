import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
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
const defaultStateId = 'turnaj-koruna';
let db;

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

async function readState() {
  const row = db.prepare('SELECT id, payload_json FROM shared_state WHERE id = ?').get(defaultStateId);
  if (!row) {
    return { id: defaultStateId, payload: null };
  }

  try {
    return {
      id: row.id,
      payload: JSON.parse(row.payload_json)
    };
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

  const existing = db.prepare('SELECT 1 FROM shared_state WHERE id = ?').get(defaultStateId);
  if (!existing) {
    await writeState({ id: defaultStateId, payload: null });
  }
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }

    if (req.url === '/api/db-export') {
      if (req.method !== 'GET') {
        res.writeHead(405, { Allow: 'GET' });
        res.end();
        return;
      }
      if (!existsSync(dbFile)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Database file not found');
        return;
      }
      const fileData = await readFile(dbFile);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="sachyuh-databaze.sqlite"',
        'Content-Length': fileData.length,
        'Cache-Control': 'no-store'
      });
      res.end(fileData);
      return;
    }

    if (req.url.startsWith('/api/shared-state')) {
      if (req.method === 'GET') {
        const state = await readState();
        sendJson(res, 200, [state]);
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        let parsed = {};
        try {
          parsed = body ? JSON.parse(body) : {};
        } catch {
          sendJson(res, 400, { error: 'Invalid JSON.' });
          return;
        }

        const nextState = {
          id: typeof parsed.id === 'string' && parsed.id ? parsed.id : 'turnaj-koruna',
          payload:
            parsed && typeof parsed.payload === 'object'
              ? parsed.payload
              : null
        };

        await writeState(nextState);
        sendJson(res, 200, { ok: true });
        return;
      }

      res.writeHead(405, { Allow: 'GET, POST' });
      res.end();
      return;
    }

    if (req.url.startsWith('/api/tournaments')) {
      if (req.method === 'GET') {
        const rows = db.prepare(
          'SELECT id, name, description, created_at, updated_at FROM tournaments ORDER BY created_at DESC'
        ).all();
        sendJson(res, 200, rows);
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        let parsed = {};
        try {
          parsed = body ? JSON.parse(body) : {};
        } catch {
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

      res.writeHead(405, { Allow: 'GET, POST' });
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
