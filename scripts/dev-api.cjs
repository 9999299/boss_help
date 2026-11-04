const http = require('http');
const analyzeHandler = require('../api/analyze.js');
const { createV1Handler } = require('../server/api/v1.cjs');
const { getRepository } = require('../server/repositories/index.cjs');

const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = 6 * 1024 * 1024;
const v1Handler = createV1Handler({ repository: getRepository() });

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        const error = new Error('请求体过大');
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function decorate(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(body));
    return res;
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  decorate(res);
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  try {
    if (['POST', 'PUT'].includes(req.method)) {
      const raw = await readBody(req);
      if (raw) {
        try {
          req.body = JSON.parse(raw);
        } catch {
          return res.status(400).json({ error: '请求体不是合法 JSON' });
        }
      }
    }

    if (url.pathname === '/api/analyze') {
      return analyzeHandler(req, res);
    }

    if (url.pathname === '/api/v1' || url.pathname.startsWith('/api/v1/')) {
      req.query = {
        path: url.pathname
          .replace(/^\/api\/v1\/?/, '')
          .split('/')
          .filter(Boolean),
        ...Object.fromEntries(url.searchParams),
      };
      return v1Handler(req, res);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`- POST http://localhost:${PORT}/api/analyze`);
  console.log(`- POST http://localhost:${PORT}/api/v1/session`);
});
