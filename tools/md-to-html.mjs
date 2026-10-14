#!/usr/bin/env node
// Render a Markdown report as a standalone, readable HTML page next to it.
//   node tools/md-to-html.mjs "reports/Batch game asset generation tools.md"
// Covers the Markdown the reports use: headings, paragraphs, bold/italic, inline code,
// links, pipe tables, bullet and numbered lists, block quotes, rules and fenced code.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const src = process.argv[2];
if (!src) {
  console.error('usage: node tools/md-to-html.mjs <file.md>');
  process.exit(1);
}
const md = readFileSync(src, 'utf8');
const title = basename(src, '.md');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u.replace(/"/g, '&quot;')}" target="_blank" rel="noopener">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
}

const cells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((c) => inline(c.trim().replace(/\\\|/g, '|')));

function render(text) {
  const lines = text.split('\n');
  const out = [];
  let para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flush();
      const body = [];
      while (++i < lines.length && !/^```/.test(lines[i])) body.push(lines[i]);
      out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      flush();
      const n = m[1].length;
      const h = inline(m[2]);
      out.push(`<h${n} id="${slug(h)}">${h}</h${n}>`);
      continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      flush();
      const head = cells(line);
      i += 1;
      const rows = [];
      while (i + 1 < lines.length && /^\s*\|/.test(lines[i + 1])) rows.push(cells(lines[++i]));
      out.push(
        `<div class="table"><table${head.length >= 6 ? ' class="wide"' : ''}><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      );
      continue;
    }
    if ((m = line.match(/^\s*([-*]|\d+\.)\s+(.*)$/))) {
      flush();
      const ordered = /\d/.test(m[1]);
      const items = [m[2]];
      while (i + 1 < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i + 1])) items.push(lines[++i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }
    if ((m = line.match(/^>\s?(.*)$/))) {
      flush();
      const q = [m[1]];
      while (i + 1 < lines.length && /^>/.test(lines[i + 1])) q.push(lines[++i].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(q.join(' '))}</blockquote>`);
      continue;
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      flush();
      out.push('<hr />');
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return out.join('\n');
}

const body = render(md);
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:ital,wght@0,500;0,700;0,800;1,500&display=swap" />
<style>
  /* one reading column; tables break out wider in their own scroller */
  :root {
    --bg: #f5f3fb; --panel: #ffffff; --fg: #231a33; --muted: #5f5675; --line: #dcd5ea; --accent: #5a3ec8; --code: #ece7f8;
    --display: 'Baloo 2', 'Trebuchet MS', system-ui, sans-serif;
    --body: Nunito, 'Segoe UI', system-ui, sans-serif;
    --mono: ui-monospace, 'SF Mono', Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --bg: #161d3a; --panel: #1e2852; --fg: #f2f0ff; --muted: #b3bce4; --line: #34407a; --accent: #ffd36b; --code: #26315f; color-scheme: dark; }
  }
  :root[data-theme="dark"] { --bg: #161d3a; --panel: #1e2852; --fg: #f2f0ff; --muted: #b3bce4; --line: #34407a; --accent: #ffd36b; --code: #26315f; color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 500 16.5px/1.68 var(--body); }
  main { max-width: 74ch; margin: 0 auto; padding-inline: 18px; padding-block: 36px 72px; }
  h1, h2, h3 { font-family: var(--display); line-height: 1.15; text-wrap: balance; }
  h1 { font-size: clamp(30px, 6vw, 44px); margin: 0 0 18px; }
  h2 { font-size: 26px; margin: 46px 0 12px; padding-top: 14px; border-top: 2px solid var(--line); }
  h3 { font-size: 20px; margin: 30px 0 8px; }
  h1 + p { font-size: 17.5px; padding: 16px 18px; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; }
  p { margin: 0 0 14px; }
  strong { font-weight: 800; }
  a { color: var(--accent); text-underline-offset: 2px; text-decoration-thickness: 1px; }
  a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }
  code { font: 0.86em var(--mono); background: var(--code); padding: 1px 5px; border-radius: 5px; }
  pre { background: var(--code); padding: 12px 14px; border-radius: 10px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  ul, ol { padding-left: 22px; margin: 0 0 14px; }
  li { margin: 4px 0; }
  blockquote { margin: 0 0 14px; padding: 6px 14px; border-left: 3px solid var(--accent); color: var(--muted); }
  hr { border: 0; border-top: 1px solid var(--line); margin: 28px 0; }
  .table { overflow-x: auto; margin: 6px 0 22px; width: min(1180px, calc(100vw - 36px)); position: relative; left: 50%; transform: translateX(-50%); border: 1px solid var(--line); border-radius: 12px; background: var(--panel); }
  table { border-collapse: collapse; width: 100%; font-size: 13.5px; line-height: 1.45; font-variant-numeric: tabular-nums; }
  table.wide { min-width: 1040px; } /* many columns: scroll sideways rather than squeeze */
  th, td { text-align: left; vertical-align: top; padding: 9px 11px; border-bottom: 1px solid var(--line); }
  th { font: 800 12px/1.3 var(--display); text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); white-space: nowrap; }
  tbody tr:last-child td { border-bottom: 0; }
  td:first-child { font-weight: 700; }
  .src { color: var(--muted); font-size: 13px; margin: 0 0 22px; }
</style>
</head>
<body>
<main>
<p class="src">2048 Siege research report · rendered from ${esc(basename(src))}</p>
${body}
</main>
</body>
</html>
`;
const outFile = src.replace(/\.md$/, '.html');
writeFileSync(outFile, html);
console.log(`wrote ${outFile}`);
