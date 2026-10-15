import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { postJson } from '../tools/curl-post.mjs';

const has = (cmd, args) => {
  try {
    execFileSync(cmd, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
const hasCurl = has('curl', ['--version']);
const skip = !hasCurl && 'curl is not installed';
const PS = ['-A', '-ww', '-o', 'args='];
const skipPs = skip || (!has('ps', PS) && 'ps is not available');
const KEY = `test-key-${process.pid}-${Date.now()}`; // a dummy: no real key is ever read here

/**
 * Run fn in a sandbox: TMPDIR points at sandbox/tmp (so postJson's temp dir lands where the test sees
 * all of it), CURL_HOME at a .curlrc that would trace every header into the sandbox if curl read it,
 * and no proxy applies to the local server.
 */
async function inSandbox(fn) {
  const sandbox = mkdtempSync(join(tmpdir(), 'curl-post-test-'));
  const tmp = join(sandbox, 'tmp');
  const curlHome = join(sandbox, 'curlhome');
  mkdirSync(tmp);
  mkdirSync(curlHome);
  writeFileSync(join(curlHome, '.curlrc'), `trace-ascii = "${join(sandbox, 'curl-trace.log')}"\n`);
  const vars = { TMPDIR: tmp, CURL_HOME: curlHome, no_proxy: '*', NO_PROXY: '*' };
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.assign(process.env, vars);
  try {
    return await fn({ sandbox, tmp });
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    rmSync(sandbox, { recursive: true, force: true });
  }
}

const filesUnder = (dir) =>
  readdirSync(dir, { recursive: true })
    .map((f) => join(dir, f))
    .filter((f) => statSync(f).isFile());

/**
 * A local server that answers every request with handle(req, body) → [status, text]. A handler that
 * throws still gets an answer (500), so curl never waits out its timeout; the error is kept in `errors`.
 */
async function serve(handle) {
  const errors = [];
  const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      let reply = [500, '{}'];
      try {
        reply = handle(req, Buffer.concat(chunks).toString('utf8'));
      } catch (e) {
        errors.push(e);
      }
      res.writeHead(reply[0], { 'content-type': 'application/json' });
      res.end(reply[1]);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, errors, url: `http://127.0.0.1:${server.address().port}/v1/publishers/google/models/m:generateContent` };
}

test('postJson hands the key to curl on stdin: never on disk, never on the command line', { skip: skipPs }, () =>
  inSandbox(async ({ sandbox, tmp }) => {
    const seen = {};
    const { server, errors, url } = await serve((req, body) => {
      // curl is mid-call here, so any file or argument holding the key exists right now
      seen.key = req.headers['x-goog-api-key'];
      seen.type = req.headers['content-type'];
      seen.body = JSON.parse(body);
      seen.keyFiles = filesUnder(sandbox).filter((f) => readFileSync(f, 'utf8').includes(KEY));
      seen.tempFiles = filesUnder(tmp).length;
      const ps = execFileSync('ps', PS, { maxBuffer: 64 << 20 }).toString();
      seen.psSeesCurl = ps.includes(url);
      seen.inArgv = ps.includes(KEY);
      return [200, JSON.stringify({ candidates: [{ ok: true }] })];
    });
    try {
      const sent = { contents: [{ role: 'user', parts: [{ text: 'a fox' }] }] };
      const { status, json } = await postJson(url, KEY, sent);
      assert.deepEqual(errors, []);
      assert.equal(status, 200);
      assert.deepEqual(json, { candidates: [{ ok: true }] });
      assert.equal(seen.key, KEY);
      assert.equal(seen.type, 'application/json');
      assert.deepEqual(seen.body, sent);
      assert.ok(seen.tempFiles >= 1, 'the request body is in the temp dir during the call');
      assert.deepEqual(seen.keyFiles, [], 'no file holds the key (temp files, or a trace from a .curlrc)');
      assert.ok(seen.psSeesCurl, 'ps lists the running curl, so the next check is not vacuous');
      assert.equal(seen.inArgv, false, 'no process command line holds the key');
      assert.deepEqual(readdirSync(tmp), [], 'the temp dir is removed after the call');
    } finally {
      server.close();
    }
  }),
);

test('postJson returns the status and {} for a non-JSON body', { skip }, () =>
  inSandbox(async ({ tmp }) => {
    const { server, url } = await serve(() => [429, 'slow down']);
    try {
      assert.deepEqual(await postJson(url, KEY, {}), { status: 429, json: {} });
      assert.deepEqual(readdirSync(tmp), []);
    } finally {
      server.close();
    }
  }),
);

test('postJson errors never carry the key, and leave no temp dir', { skip }, () =>
  inSandbox(async ({ tmp }) => {
    // a server that hangs up without answering: curl fails (empty reply) every time
    const server = createServer((req) => req.socket.destroy());
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${server.address().port}/v1/m:generateContent`;
    try {
      await assert.rejects(postJson(url, KEY, {}), (e) => /^network: curl exit \d+/.test(e.message) && !e.message.includes(KEY));
      await assert.rejects(postJson(url, `${KEY}\nx-evil: 1`, {}), (e) => /line break/.test(e.message) && !e.message.includes(KEY));
      assert.deepEqual(readdirSync(tmp), []);
    } finally {
      server.close();
    }
  }),
);

test('the key stays out of curl’s environment, and a curl that quits before reading stdin fails one call, not the run', { skip }, () =>
  inSandbox(async ({ sandbox, tmp }) => {
    // a stand-in curl first on PATH: it records its environment and exits without reading stdin
    const bin = join(sandbox, 'bin');
    const envOut = join(sandbox, 'curl-env.txt');
    mkdirSync(bin);
    writeFileSync(join(bin, 'curl'), `#!/bin/sh\nenv > "${envOut}"\nexit 2\n`, { mode: 0o755 });
    const saved = { PATH: process.env.PATH, VERTEX_API_KEY: process.env.VERTEX_API_KEY };
    Object.assign(process.env, { PATH: `${bin}:${process.env.PATH}`, VERTEX_API_KEY: KEY });
    try {
      // a 1 MiB header cannot fit in the pipe, so the write is still pending when the stand-in exits (EPIPE)
      await assert.rejects(postJson('http://127.0.0.1:9/', 'k'.repeat(1 << 20), {}), (e) => e.message === 'network: curl exit 2');
      const env = readFileSync(envOut, 'utf8');
      assert.ok(env.includes('PATH='), 'the stand-in curl ran');
      assert.equal(env.includes(KEY), false, 'no key in curl’s environment');
      assert.deepEqual(readdirSync(tmp), []);
    } finally {
      process.env.PATH = saved.PATH;
      if (saved.VERTEX_API_KEY === undefined) delete process.env.VERTEX_API_KEY;
      else process.env.VERTEX_API_KEY = saved.VERTEX_API_KEY;
    }
  }),
);
