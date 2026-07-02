import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const port = Number.parseInt(process.env.PORT || '4173', 10);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const sendFile = (filePath, response) => {
  const extension = extname(filePath).toLowerCase();
  response.statusCode = 200;
  response.setHeader('Content-Type', mimeTypes[extension] || 'application/octet-stream');
  createReadStream(filePath).pipe(response);
};

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const requestedPath = decodeURIComponent(url.pathname);
  const filePath = resolve(distDir, `.${requestedPath}`);

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    sendFile(filePath, response);
    return;
  }

  if (requestedPath.startsWith('/assets/')) {
    response.statusCode = 404;
    response.end('Not found');
    return;
  }

  sendFile(resolve(distDir, 'index.html'), response);
}).listen(port, '0.0.0.0', () => {
  console.log(`Frontend server listening on port ${port}`);
});
