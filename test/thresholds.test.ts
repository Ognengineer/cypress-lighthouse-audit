import { describe, expect, it } from 'vitest';

import { describeFailure, evaluateThresholds } from '../src/node/thresholds';
import type { LighthouseResultLike } from '../src/types';

const lhr: LighthouseResultLike = {
  categories: {
    performance: { score: 0.83 },
    'best-practices': { score: 0.95 },
    seo: { score: null },
  },
  audits: {
    'largest-contentful-paint': { numericValue: 3612.4, numericUnit: 'millisecond' },
    'cumulative-layout-shift': { numericValue: 0.04321, numericUnit: 'unitless' },
    'total-blocking-time': { numericValue: 120, numericUnit: 'millisecond' },
  },
};

describe('evaluateThresholds', () => {
  it('passes a category when the score reaches the minimum', () => {
    const [result] = evaluateThresholds({ performance: 80 }, lhr);
    expect(result).toMatchObject({ kind: 'category', value: 83, status: 'pass' });
  });

  it('fails a category below the minimum', () => {
    const [result] = evaluateThresholds({ 'best-practices': 96 }, lhr);
    expect(result).toMatchObject({ value: 95, status: 'fail' });
  });

  it('treats a category without a score as missing', () => {
    const [result] = evaluateThresholds({ seo: 90 }, lhr);
    expect(result).toMatchObject({ value: null, status: 'missing' });
  });

  it('fails an audit above the maximum and reports milliseconds', () => {
    const [result] = evaluateThresholds({ 'largest-contentful-paint': 3500 }, lhr);
    expect(result).toMatchObject({ kind: 'audit', value: 3612, unit: 'ms', status: 'fail' });
  });

  it('keeps three decimals for unitless audits such as CLS', () => {
    const [result] = evaluateThresholds({ 'cumulative-layout-shift': 0.1 }, lhr);
    expect(result).toMatchObject({ value: 0.043, unit: '', status: 'pass' });
  });

  it('marks an id Lighthouse did not report as missing', () => {
    const [result] = evaluateThresholds({ 'not-a-real-audit': 1 }, lhr);
    expect(result).toMatchObject({ kind: 'unknown', status: 'missing' });
  });
});

describe('describeFailure', () => {
  it('describes category, audit and missing failures', () => {
    const results = evaluateThresholds(
      { 'best-practices': 96, 'largest-contentful-paint': 3500, 'not-a-real-audit': 1 },
      lhr,
    );
    expect(results.map(describeFailure)).toEqual([
      'best-practices: 95 (minimum 96)',
      'largest-contentful-paint: 3612 ms (maximum 3500)',
      'not-a-real-audit: not reported by Lighthouse',
    ]);
  });
});
