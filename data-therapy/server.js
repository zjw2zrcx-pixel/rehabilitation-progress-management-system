/* 生产模式单端口服务器：静态文件 + /api 反代，零依赖。
   用法：先 npm run build，再 node server.js
   公开只需要一个端口(默认3000)，/api/* 自动转发到 127.0.0.1:8000 后端。 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'build');
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.map': 'application/json',
};

http.createServer((req, res) => {
  // ---- 1) API 请求：反代到后端 ----
  if (req.url.startsWith('/api')) {
    const proxy = http.request({
      host: BACKEND_HOST, port: BACKEND_PORT,
      path: req.url, method: req.method, headers: req.headers,
    }, (pRes) => {
      res.writeHead(pRes.statusCode, pRes.headers);
      pRes.pipe(res);
    });
    proxy.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('后端服务未启动 (127.0.0.1:8000)');
    });
    req.pipe(proxy);
    return;
  }

  // ---- 2) 静态文件（SPA 路由回退到 index.html）----
  let file = path.join(DIST, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end('forbidden'); return; } // 防目录穿越
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`[server] 静态页 + /api 反代 -> 127.0.0.1:${BACKEND_PORT}，监听 :${PORT}`);
});