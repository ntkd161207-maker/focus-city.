import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('../',import.meta.url));
const port = Number(process.env.PORT || 8000);
const host = process.env.HOST || '0.0.0.0';
const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml' };
const server = createServer(async (request,response) => {
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405,{Allow:'GET, HEAD'});response.end();return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    if (pathname.split('/').some(part => part.startsWith('.')) || pathname.includes('\\')) { response.writeHead(403);response.end('Forbidden');return; }
    let path = resolve(root,`.${pathname}`);
    if (!path.startsWith(root.endsWith(sep) ? root : root+sep) && path!==resolve(root)) { response.writeHead(403);response.end('Forbidden');return; }
    if ((await stat(path)).isDirectory()) path = resolve(path,'index.html');
    const data = await readFile(path);
    response.writeHead(200,{'Content-Type':mime[extname(path)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    response.end(request.method==='HEAD'?undefined:data);
  } catch (error) {
    const status = error instanceof URIError ? 400 : ['ENOENT','ENOTDIR','EISDIR'].includes(error.code) ? 404 : 500;
    response.writeHead(status);response.end(status===404?'Not found':'Request failed');
  }
});
server.on('error',error => { console.error(`Cannot start Focus City: ${error.message}`);process.exitCode=1; });
server.listen(port,host,() => console.log(`Focus City listening on port ${port}. Open http://localhost:${port}`));
