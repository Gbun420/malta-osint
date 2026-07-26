import http from 'node:http';

export function createHealthServer(port: number = 7700): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        mode: process.env.AIS_MOCK_MODE === 'true' ? 'mock' : 'live',
        version: '1.0.0',
      }));
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, () => {
    console.log(`[AIS Worker] Health endpoint on :${port}/health`);
  });

  return server;
}
