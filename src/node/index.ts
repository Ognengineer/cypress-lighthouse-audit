/// <reference types="cypress" />
import { LIGHTHOUSE_TASK } from '../constants';
import type {
  LighthousePluginOptions,
  LighthouseResultLike,
  LighthouseTaskArgs,
  LighthouseTaskResult,
} from '../types';
import { buildLighthouseConfig, inferOnlyCategories, readDebuggingPort } from './config';
import { formatResultsTable, formatSummary } from './format';
import { loadLighthouse } from './loadLighthouse';
import { writeReports } from './reports';
import { describeFailure, evaluateThresholds } from './thresholds';

const DEFAULT_REPORTS_DIR = 'cypress/reports/lighthouse';
const DEFAULT_CHROME_FLAGS = ['--disable-dev-shm-usage'];
const CLOSED_PAGE_ERRORS = ['Target closed', 'Session closed', 'page has been closed'];

function isClosedPageError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return CLOSED_PAGE_ERRORS.some((text) => message.includes(text));
}

export interface LighthouseHandlers {
  /** Use in your own `before:browser:launch` handler if you already register one. */
  onBeforeBrowserLaunch: (
    browser: Cypress.Browser,
    launchOptions: Cypress.BeforeBrowserLaunchOptions,
  ) => Cypress.BeforeBrowserLaunchOptions;
  /** Merge into your `on('task', …)` registration. */
  tasks: Record<typeof LIGHTHOUSE_TASK, (args: LighthouseTaskArgs) => Promise<LighthouseTaskResult>>;
}

/**
 * Builds the browser-launch handler and the audit task without registering them.
 * Use this when your config already owns `before:browser:launch` (Cypress keeps only one handler per event).
 */
export function createLighthouse(options: LighthousePluginOptions = {}): LighthouseHandlers {
  const {
    headers,
    reportsDir = DEFAULT_REPORTS_DIR,
    chromeFlags = DEFAULT_CHROME_FLAGS,
    retryOnClosedPage = true,
    log = true,
  } = options;

  let debuggingPort: number | undefined;

  const onBeforeBrowserLaunch: LighthouseHandlers['onBeforeBrowserLaunch'] = (browser, launchOptions) => {
    if (browser.family !== 'chromium') return launchOptions;
    for (const flag of chromeFlags) {
      if (!launchOptions.args.includes(flag)) launchOptions.args.push(flag);
    }
    debuggingPort = readDebuggingPort(launchOptions.args);
    return launchOptions;
  };

  async function runLighthouse(args: LighthouseTaskArgs): Promise<LighthouseResultLike> {
    if (!debuggingPort) {
      throw new Error('[lighthouse] No Chrome remote-debugging port. Run Cypress with a Chromium browser (--browser chrome).');
    }
    const lighthouse = await loadLighthouse();
    const nodeHeaders = headers ? await headers() : {};
    const userFlags = args.flags ?? {};
    const flags = {
      // Keep the Cypress session (cookies, storage) so the audit sees the logged-in page.
      disableStorageReset: true,
      onlyCategories: inferOnlyCategories(args.thresholds),
      ...userFlags,
      extraHeaders: { ...(userFlags.extraHeaders as Record<string, string> | undefined), ...nodeHeaders },
      port: debuggingPort,
    };
    const result = await lighthouse(args.url, flags, buildLighthouseConfig(args.formFactor, args.config));
    if (!result?.lhr) throw new Error(`[lighthouse] No result returned for ${args.url}`);
    return result.lhr;
  }

  async function runWithRetry(args: LighthouseTaskArgs): Promise<LighthouseResultLike> {
    try {
      return await runLighthouse(args);
    } catch (err) {
      if (!retryOnClosedPage || !isClosedPageError(err)) throw err;
      // eslint-disable-next-line no-console
      console.warn('[lighthouse] Chrome closed the page during the audit, retrying once');
      return runLighthouse(args);
    }
  }

  async function audit(args: LighthouseTaskArgs): Promise<LighthouseTaskResult> {
    const lhr = await runWithRetry(args);
    const results = evaluateThresholds(args.thresholds, lhr);
    const failures = results.filter((result) => result.status !== 'pass').map(describeFailure);
    const lighthouseVersion = lhr.lighthouseVersion ?? 'unknown';
    const formFactor = lhr.configSettings?.formFactor ?? args.formFactor ?? 'desktop';
    const passed = failures.length === 0;
    const reports = reportsDir === false ? undefined : await writeReports(lhr, reportsDir);

    if (log) {
      // eslint-disable-next-line no-console
      console.log(`\n${formatSummary(lighthouseVersion, formFactor, args.url, passed)}\n${formatResultsTable(results)}`);
    }

    return { url: args.url, lighthouseVersion, formFactor, passed, results, failures, reports };
  }

  return { onBeforeBrowserLaunch, tasks: { [LIGHTHOUSE_TASK]: audit } };
}

/**
 * Registers the browser-launch handler and the `lighthouse:audit` task.
 *
 * @example
 * setupNodeEvents(on, config) {
 *   lighthousePlugin(on, { headers: () => ({ 'x-bypass': process.env.BYPASS_TOKEN ?? '' }) });
 *   return config;
 * }
 */
export function lighthousePlugin(on: Cypress.PluginEvents, options: LighthousePluginOptions = {}): LighthouseHandlers {
  const handlers = createLighthouse(options);
  on('before:browser:launch', handlers.onBeforeBrowserLaunch);
  on('task', handlers.tasks);
  return handlers;
}

export { LIGHTHOUSE_TASK } from '../constants';
export { buildLighthouseConfig, inferOnlyCategories, readDebuggingPort } from './config';
export { describeFailure, evaluateThresholds } from './thresholds';
export type * from '../types';
