// POST JSON to Gemini through curl (HTTP/2). Node's built-in fetch stalls on Vertex image calls
// (no response headers for 5 minutes), while curl gets the same image back in ~45 s.
// The API key reaches curl on its stdin (`-H @-`): never a file, never the command line, so a
// killed run cannot leave it on disk. The temp dir holds only the request body and the response.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileP = promisify(execFile);

/** POST `body` as JSON with the key in `x-goog-api-key`; resolves to { status, json } (json is {} for an empty or non-JSON body). */
export async function postJson(url, key, body) {
  if (/[\r\n]/.test(key)) throw new Error('the API key contains a line break'); // each stdin line is one header
  const dir = mkdtempSync(join(tmpdir(), 'mb-pipeline-'));
  try {
    const bodyFile = join(dir, 'body.json');
    const outFile = join(dir, 'out.json');
    writeFileSync(bodyFile, JSON.stringify(body));
    // curl gets no copy of the key in its environment either, and no TLS key log to write
    const env = { ...process.env };
    delete env.VERTEX_API_KEY;
    delete env.GEMINI_API_KEY;
    delete env.SSLKEYLOGFILE;
    let stdout;
    try {
      // -q must come first: it skips any .curlrc, whose trace or libcurl options would write the headers to a file.
      // curl reads `-H @-` while parsing its arguments, before -m applies, so stdin is ended right away;
      // the exec timeout is a backstop.
      const args = ['-q', '-s', '--http2', '-m', '300', '-X', 'POST', url, '-H', '@-', '--data-binary', `@${bodyFile}`, '-o', outFile, '-w', '%{http_code}'];
      const call = execFileP('curl', args, { env, timeout: 310_000 });
      call.child.stdin.on('error', () => {}); // EPIPE when curl exits (or never starts) first: the promise reports it
      call.child.stdin.end(`x-goog-api-key: ${key}\ncontent-type: application/json\n`);
      ({ stdout } = await call);
    } catch (e) {
      throw new Error(`network: curl exit ${e.code ?? e.signal}${e.code === 28 ? ' (timed out after 300 s)' : ''}`);
    }
    let json = {};
    try {
      json = JSON.parse(readFileSync(outFile, 'utf8'));
    } catch {
      /* empty or non-JSON body */
    }
    return { status: Number(stdout.trim()) || 0, json };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
