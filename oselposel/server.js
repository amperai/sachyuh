import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const dbDir = path.join(rootDir, 'db');
const dbFile = path.join(dbDir, 'shared-state.json');
const port = Number.parseInt(process.env.PORT ?? '3000', 10);

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

async function ensureDbFile() {
  await mkdir(dbDir, { recursive: true });
  try {
    await readFile(dbFile, 'utf8');
  } catch {
    const initialState = {
      id: 'turnaj-koruna',
      payload: null
    };
    await writeFile(dbFile, `${JSON.stringify(initialState, null, 2)}\n`, 'utf8');
  }
}

async function readState() {
  await ensureDbFile();
  const raw = await readFile(dbFile, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return { id: 'turnaj-koruna', payload: null };
  }
}

async function writeState(state) {
  await mkdir(dbDir, { recursive: true });
  const tmpFile = `${dbFile}.tmp`;
  await writeFile(tmpFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(tmpFile, dbFile);
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

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400);
      res.end('Bad request');
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

    await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
});

await ensureDbFile();
server.listen(port, () => {
  console.log(`Server running on http://127.0.0.1:${port}`);
});
