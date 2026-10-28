import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));const relative=path.relative(root,file);if(!['index.html','style.css','game.mjs','engine.mjs','favicon.svg'].includes(relative)){res.writeHead(404).end();return;}if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403).end();return;}const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end('Not found');}}).listen(Number(process.env.PORT||4174),'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${process.env.PORT||4174}`));
