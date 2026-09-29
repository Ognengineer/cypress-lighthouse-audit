// Serves example/site on a local port, runs the example Cypress project against it, then stops the server.
// Usage: pnpm example   (EXAMPLE_BROWSER / EXAMPLE_PORT / EXAMPLE_SPEC override the defaults)
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import cypress from 'cypress';

const exampleDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.join(exampleDir, 'site');
const port = Number(process.env.EXAMPLE_PORT ?? 4173);
const browser = process.env.EXAMPLE_BROWSER ?? 'chrome';
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

let secretHeaderRequests = 0;

const server = createServer(async (req, res) => {
  if (req.headers['x-example-secret']) secretHeaderRequests += 1;

  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  const file = path.normalize(path.join(siteDir, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(siteDir)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    const contentType = CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': contentType, 'cache-control': 'public, max-age=3600' }).end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  }
});

await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
console.log(`[example] serving ${siteDir} on http://127.0.0.1:${port}`);

try {
  const result = await cypress.run({
    project: exampleDir,
    browser,
    ...(process.env.EXAMPLE_SPEC ? { spec: path.resolve(exampleDir, process.env.EXAMPLE_SPEC) } : {}),
    config: { baseUrl: `http://127.0.0.1:${port}` },
  });
  const failed = result.status === 'failed' || result.totalFailed > 0;
  console.log(`[example] requests carrying the Node-side header: ${secretHeaderRequests}`);
  if (secretHeaderRequests === 0) console.error('[example] expected Lighthouse to send the Node-side header');
  process.exitCode = failed || secretHeaderRequests === 0 ? 1 : 0;
} finally {
  server.close();
}
