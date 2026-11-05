const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg']);

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

/* ---------- Enquiries ----------
   POST /api/enquiry stores every lead in data/enquiries.jsonl (one JSON
   object per line) and, when ENQUIRY_WEBHOOK_URL is set, forwards it to the
   sales team's inbox / sheet / CRM (e.g. a Google Apps Script web app, Zapier
   or the CRM's lead webhook). Without the webhook, leads are only stored on
   this server: set it before launch so they reach the sales team. */
const DATA_DIR = path.join(BASE_DIR, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'enquiries.jsonl');
const WEBHOOK = process.env.ENQUIRY_WEBHOOK_URL || '';
const INTENTS = new Set(['visit', 'price', 'docs', 'brochure', 'plot', 'buy', 'investment', 'info']);
const recent = new Map(); // ip -> timestamps, a light guard against floods

const sendJson = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
};

const handleEnquiry = (req, res) => {
  const ip = req.socket.remoteAddress || '';
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (hits.length >= 10) return sendJson(res, 429, { ok: false, error: 'Too many requests' });

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 10000) req.destroy();
  });
  req.on('end', async () => {
    let body;
    try { body = JSON.parse(raw); } catch (e) { return sendJson(res, 400, { ok: false, error: 'Bad request' }); }
    const name = String(body.name || '').trim().slice(0, 80);
    const phone = String(body.phone || '').replace(/\D/g, '');
    if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone)) return sendJson(res, 422, { ok: false, error: 'Invalid name or phone' });

    hits.push(now);
    recent.set(ip, hits);
    const ref = 'MJR-' + now.toString(36).toUpperCase().slice(-6);
    const lead = {
      ref,
      receivedAt: new Date(now).toISOString(),
      name,
      phone: '+91' + phone,
      intent: INTENTS.has(body.intent) ? body.intent : 'info',
      plot: String(body.plot || '').slice(0, 8),
      date: /^\d{4}-\d{2}-\d{2}$/.test(body.date || '') ? body.date : '',
      form: String(body.form || '').slice(0, 20),
      page: String(body.page || '').slice(0, 200),
    };

    try {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
      await fs.promises.appendFile(LEADS_FILE, JSON.stringify(lead) + '\n');
    } catch (e) {
      console.error('Could not store enquiry', e);
      return sendJson(res, 500, { ok: false, error: 'Could not save' });
    }

    if (WEBHOOK) {
      try {
        const r = await fetch(WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead),
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
      } catch (e) {
        // stored above, so nothing is lost; flag it for follow-up
        console.error(`Enquiry ${ref} stored but not forwarded:`, e.message);
      }
    }
    console.log(`Enquiry ${ref}: ${lead.intent}${lead.plot ? ' plot ' + lead.plot : ''}`);
    sendJson(res, 200, { ok: true, ref });
  });
};

const server = http.createServer((req, res) => {
  if (req.url.split('?')[0] === '/api/enquiry') {
    if (req.method === 'POST') return handleEnquiry(req, res);
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(path.join(BASE_DIR, pathname));

  // Security check: ensure path is within BASE_DIR, and never serve stored leads
  if (!safePath.startsWith(BASE_DIR) || safePath.startsWith(DATA_DIR) || path.basename(safePath).startsWith('.')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const totalSize = stats.size;

    // Handle range requests (crucial for MP4 video streaming)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (isNaN(start) || start >= totalSize || (parts[1] && end >= totalSize)) {
        res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(safePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fileStream.pipe(res);
    } else {
      const isCode = ['.html', '.css', '.js'].includes(ext);
      const cacheHeader = isCode ? 'no-cache' : 'public, max-age=604800';
      const acceptEncoding = req.headers['accept-encoding'] || '';
      if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(acceptEncoding)) {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Encoding': 'gzip',
          'Vary': 'Accept-Encoding',
          'Cache-Control': cacheHeader,
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(safePath).pipe(zlib.createGzip()).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': totalSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': cacheHeader,
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(safePath).pipe(res);
      }
    }
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Server running at ${url}`);
  if (!WEBHOOK) console.warn('ENQUIRY_WEBHOOK_URL is not set: enquiries are saved to data/enquiries.jsonl only and will not reach the sales team automatically.');
});
