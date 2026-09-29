import { describe, expect, it } from 'vitest';

import { buildLighthouseConfig, inferOnlyCategories, readDebuggingPort } from '../src/node/config';

describe('readDebuggingPort', () => {
  it('reads the port Cypress passes to Chromium', () => {
    expect(readDebuggingPort(['--foo', '--remote-debugging-port=9222'])).toBe(9222);
  });

  it('returns undefined when the flag is absent or invalid', () => {
    expect(readDebuggingPort(['--foo'])).toBeUndefined();
    expect(readDebuggingPort(['--remote-debugging-port=abc'])).toBeUndefined();
  });
});

describe('inferOnlyCategories', () => {
  it('adds performance when an audit id is budgeted', () => {
    expect(inferOnlyCategories({ 'best-practices': 90, 'largest-contentful-paint': 3500 })).toEqual([
      'best-practices',
      'performance',
    ]);
  });

  it('keeps only the categories that are budgeted', () => {
    expect(inferOnlyCategories({ accessibility: 90, seo: 80 })).toEqual(['accessibility', 'seo']);
  });

  it('falls back to performance for empty thresholds', () => {
    expect(inferOnlyCategories({})).toEqual(['performance']);
  });
});

describe('buildLighthouseConfig', () => {
  it('defaults to the desktop preset on lighthouse:default', () => {
    const config = buildLighthouseConfig();
    expect(config.extends).toBe('lighthouse:default');
    expect(config.settings).toMatchObject({ formFactor: 'desktop', screenEmulation: { mobile: false } });
  });

  it('lets caller settings override the mobile preset', () => {
    const config = buildLighthouseConfig('mobile', { settings: { throttlingMethod: 'provided' } });
    expect(config.settings).toMatchObject({ formFactor: 'mobile', throttlingMethod: 'provided' });
  });
});
