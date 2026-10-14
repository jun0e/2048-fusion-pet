// Dev-only: POST /__capture?name=<slug> with a PNG data URL saves it to reports/kv/<slug>.png
// (used by kv-guide.html?capture to export the proportion guide at full resolution).
// Local requests only; the build ignores this plugin.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const MAX = 40 * 1024 * 1024;

export default {
  plugins: [
    {
      name: 'kv-capture',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/__capture', (req, res) => {
          if (req.method !== 'POST' || !LOCAL.has(req.socket.remoteAddress)) {
            res.statusCode = 403;
            return res.end('no');
          }
          const name = (new URL(req.url, 'http://local').searchParams.get('name') || 'capture').replace(/[^a-z0-9-]/gi, '').slice(0, 60) || 'capture';
          const chunks = [];
          let size = 0;
          req.on('data', (c) => {
            size += c.length;
            if (size <= MAX) chunks.push(c);
          });
          req.on('end', () => {
            if (size > MAX) {
              res.statusCode = 413;
              return res.end('too big');
            }
            const dir = resolve('reports/kv');
            mkdirSync(dir, { recursive: true });
            const b64 = Buffer.concat(chunks).toString().replace(/^data:image\/png;base64,/, '');
            writeFileSync(join(dir, `${name}.png`), Buffer.from(b64, 'base64'));
            res.end('saved');
          });
        });
      },
    },
  ],
};
