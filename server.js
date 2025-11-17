// Custom Next.js server to force port binding on Windows
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
// Bind address — 0.0.0.0 ensures the server accepts connections on all interfaces
// (avoids issues where Chrome or the OS only resolves 'localhost' differently).
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3333', 10);

// Create Next.js app
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Server error:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) {
      console.error('Failed to listen:', err);
      process.exit(1);
    }
    console.log(`✅ Server running at http://${hostname}:${port} (bind)`);
    console.log(`✅ You can also access via http://localhost:${port} and http://127.0.0.1:${port}`);
    console.log(`✅ Port ${port} is actively listening`);
    console.log(`✅ Environment: ${dev ? 'development' : 'production'}`);
  });
});
