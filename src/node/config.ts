import type { FormFactor, Thresholds } from '../types';

const LIGHTHOUSE_CATEGORIES = new Set(['performance', 'accessibility', 'best-practices', 'seo']);

const FORM_FACTOR_SETTINGS: Record<FormFactor, Record<string, unknown>> = {
  desktop: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
  },
  mobile: {
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  },
};

const DEBUGGING_PORT_ARG = '--remote-debugging-port=';

/** Cypress starts Chromium with `--remote-debugging-port=<n>`; Lighthouse attaches to that port. */
export function readDebuggingPort(args: readonly string[]): number | undefined {
  const arg = args.find((value) => value.startsWith(DEBUGGING_PORT_ARG));
  if (!arg) return undefined;
  const port = Number(arg.slice(DEBUGGING_PORT_ARG.length));
  return Number.isInteger(port) && port > 0 ? port : undefined;
}

/**
 * Categories Lighthouse must run for the given thresholds.
 * Audit ids (LCP, TBT, …) belong to `performance`, so it is added whenever an audit id is budgeted.
 */
export function inferOnlyCategories(thresholds: Thresholds): string[] {
  const keys = Object.keys(thresholds);
  const categories = new Set(keys.filter((key) => LIGHTHOUSE_CATEGORIES.has(key)));
  if (keys.some((key) => !LIGHTHOUSE_CATEGORIES.has(key))) categories.add('performance');
  return categories.size > 0 ? [...categories] : ['performance'];
}

/** `lighthouse:default` + the form-factor preset, with the caller's `settings` taking precedence. */
export function buildLighthouseConfig(
  formFactor: FormFactor = 'desktop',
  config: Record<string, unknown> = {},
): Record<string, unknown> {
  const settings = (config.settings ?? {}) as Record<string, unknown>;
  return {
    extends: 'lighthouse:default',
    ...config,
    settings: { ...FORM_FACTOR_SETTINGS[formFactor], ...settings },
  };
}
