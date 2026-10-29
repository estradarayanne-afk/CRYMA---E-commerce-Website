require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.ADMIN_PORT || 3001;
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Proxy all /api/* requests to backend using raw http (avoids IPv6 issues)
app.use('/api', (req, res) => {
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.url === '/' ? '/api' : `/api${req.url}`,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${BACKEND_HOST}:${BACKEND_PORT}`,
    },
  };

  const proxy = http.request(options, (backendRes) => {
    res.status(backendRes.statusCode);
    Object.entries(backendRes.headers).forEach(([key, val]) => {
      res.setHeader(key, val);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    backendRes.pipe(res);
  });

  proxy.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.status(503).json({ success: false, error: 'Backend unavailable' });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    const bodyStr = JSON.stringify(req.body);
    proxy.setHeader('Content-Type', 'application/json');
    proxy.setHeader('Content-Length', Buffer.byteLength(bodyStr));
    proxy.write(bodyStr);
  }

  proxy.end();
});

// SPA fallback — serve index.html for all non-asset routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Admin panel running on http://127.0.0.1:${PORT}`);
  console.log(`Proxying /api/* → http://${BACKEND_HOST}:${BACKEND_PORT}/api/*`);
});
