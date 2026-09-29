import { createRequire } from 'node:module';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { LighthouseResultLike } from '../types';

export type LighthouseRunner = (
  url: string,
  flags: Record<string, unknown>,
  config: Record<string, unknown>,
) => Promise<{ lhr: LighthouseResultLike } | undefined>;

type ReportGenerator = { generateReportHtml: (lhr: LighthouseResultLike) => string };

// Lighthouse ships ESM only, while Cypress may load this package as CJS.
// `new Function` keeps a real `import()` in the CJS build instead of a `require()`.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;
const requireFromHere = createRequire(import.meta.url);

let lighthousePromise: Promise<LighthouseRunner> | undefined;
let reportGeneratorPromise: Promise<ReportGenerator> | undefined;

/** Loads the consumer-installed `lighthouse` peer dependency. */
export function loadLighthouse(): Promise<LighthouseRunner> {
  lighthousePromise ??= dynamicImport(pathToFileURL(requireFromHere.resolve('lighthouse')).href).then(
    (mod) => mod.default as LighthouseRunner,
  );
  return lighthousePromise;
}

export function loadReportGenerator(): Promise<ReportGenerator> {
  reportGeneratorPromise ??= (async () => {
    const lighthouseDir = path.dirname(requireFromHere.resolve('lighthouse/package.json'));
    const generatorPath = path.join(lighthouseDir, 'report', 'generator', 'report-generator.js');
    const mod = await dynamicImport(pathToFileURL(generatorPath).href);
    return (mod.ReportGenerator ?? mod.default) as ReportGenerator;
  })();
  return reportGeneratorPromise;
}
