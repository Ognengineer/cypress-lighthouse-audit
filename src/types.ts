export type FormFactor = 'desktop' | 'mobile';

/**
 * Budget per Lighthouse id.
 * - Category ids (`performance`, `accessibility`, `best-practices`, `seo`): minimum score 0–100.
 * - Audit ids (`largest-contentful-paint`, `total-blocking-time`, …): maximum `numericValue`.
 */
export type Thresholds = Record<string, number>;

/** Options passed to `cy.lighthouse(thresholds, options)`. Only public, serialisable values. */
export interface LighthouseCommandOptions {
  /** Defaults to `desktop`. */
  formFactor?: FormFactor;
  /** Lighthouse flags (2nd argument of `lighthouse(url, flags, config)`). */
  flags?: Record<string, unknown>;
  /** Lighthouse config (3rd argument). `settings` is merged over the form-factor preset. */
  config?: Record<string, unknown>;
  /** Fail the test when a threshold is missed. Defaults to `true`. */
  failOnBudget?: boolean;
  /** `cy.task` timeout in ms. Defaults to 180000 (the first audit also loads Lighthouse). */
  timeout?: number;
}

/** Payload sent from the browser to the Node task. */
export interface LighthouseTaskArgs {
  url: string;
  thresholds: Thresholds;
  formFactor?: FormFactor;
  flags?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export type ThresholdStatus = 'pass' | 'fail' | 'missing';

export interface ThresholdResult {
  metric: string;
  kind: 'category' | 'audit' | 'unknown';
  /** Category score 0–100, or the audit's numeric value. `null` when Lighthouse did not report it. */
  value: number | null;
  unit: string;
  threshold: number;
  status: ThresholdStatus;
}

export interface LighthouseTaskResult {
  url: string;
  lighthouseVersion: string;
  formFactor: string;
  passed: boolean;
  results: ThresholdResult[];
  /** One readable line per failed or missing threshold. Empty when `passed`. */
  failures: string[];
  reports?: { json: string; html?: string };
}

/** Options for the Node side (`lighthousePlugin` / `createLighthouse`). */
export interface LighthousePluginOptions {
  /**
   * Extra request headers for the audited page (e.g. a preview-protection bypass token).
   * Resolved in Node on every audit, so secrets never pass through the browser.
   */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  /** Where JSON + HTML reports are written. `false` disables writing. Defaults to `cypress/reports/lighthouse`. */
  reportsDir?: string | false;
  /** Extra Chromium launch flags. Defaults to `['--disable-dev-shm-usage']` (avoids `/dev/shm` crashes in CI containers). */
  chromeFlags?: string[];
  /** Retry once when Chrome closes the page during the audit. Defaults to `true`. */
  retryOnClosedPage?: boolean;
  /** Print a result table to the Node console. Defaults to `true`. */
  log?: boolean;
}

/** The subset of the Lighthouse result (`lhr`) this package reads. */
export interface LighthouseResultLike {
  lighthouseVersion?: string;
  requestedUrl?: string;
  finalDisplayedUrl?: string;
  configSettings?: { formFactor?: string };
  categories?: Record<string, { score: number | null } | undefined>;
  audits?: Record<string, { numericValue?: number; numericUnit?: string } | undefined>;
}
