import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml'};
const port = Number(process.env.PORT || 8080);
http.createServer((req,res) => {
  const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + requested, requested.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep)) {res.writeHead(403); res.end(); return;}
  fs.readFile(file, (err,data) => {
    if (err) {res.writeHead(404); res.end('Not found'); return;}
    res.writeHead(200, {'content-type': (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8'});
    res.end(data);
  });
}).listen(port, () => console.log(`Route Wrecker at http://localhost:${port}`));
