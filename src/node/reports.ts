import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { LighthouseResultLike } from '../types';
import { loadReportGenerator } from './loadLighthouse';

function slugify(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replaceAll(/[^a-z0-9]+/gi, '_')
    .replaceAll(/^_+|_+$/g, '')
    .slice(0, 80);
}

/**
 * Writes `<timestamp>_<formFactor>_<page>.json` (raw result) and `.html` (standalone report).
 * The HTML report comes from Lighthouse's own generator and shows the Lighthouse version in its footer.
 */
export async function writeReports(lhr: LighthouseResultLike, dir: string): Promise<{ json: string; html?: string }> {
  await fs.mkdir(dir, { recursive: true });

  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const formFactor = lhr.configSettings?.formFactor ?? 'unknown';
  const page = slugify(lhr.requestedUrl ?? lhr.finalDisplayedUrl ?? 'page');
  const base = path.join(dir, `${timestamp}_${formFactor}_${page}`);

  const json = `${base}.json`;
  await fs.writeFile(json, JSON.stringify(lhr, null, 2));

  try {
    const generator = await loadReportGenerator();
    const html = `${base}.html`;
    await fs.writeFile(html, generator.generateReportHtml(lhr));
    return { json, html };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[lighthouse] HTML report not written: ${(err as Error).message}`);
    return { json };
  }
}
