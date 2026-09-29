import type { LighthouseResultLike, ThresholdResult, Thresholds } from '../types';

function roundValue(value: number, unit: string | undefined): number {
  return unit === 'unitless' ? Number(value.toFixed(3)) : Math.round(value);
}

function displayUnit(unit: string | undefined): string {
  if (unit === 'millisecond') return 'ms';
  if (!unit || unit === 'unitless') return '';
  return unit;
}

/**
 * Score every threshold against a Lighthouse result.
 * Categories pass when score ≥ threshold; audits pass when numericValue ≤ threshold.
 * A key Lighthouse did not report is `missing`, which counts as a failure.
 */
export function evaluateThresholds(thresholds: Thresholds, lhr: LighthouseResultLike): ThresholdResult[] {
  return Object.entries(thresholds).map(([metric, threshold]): ThresholdResult => {
    const category = lhr.categories?.[metric];
    if (category) {
      if (category.score === null) {
        return { metric, kind: 'category', value: null, unit: 'score', threshold, status: 'missing' };
      }
      const value = Math.round(category.score * 100);
      return { metric, kind: 'category', value, unit: 'score', threshold, status: value >= threshold ? 'pass' : 'fail' };
    }

    const audit = lhr.audits?.[metric];
    if (audit && typeof audit.numericValue === 'number') {
      const value = roundValue(audit.numericValue, audit.numericUnit);
      const unit = displayUnit(audit.numericUnit);
      return { metric, kind: 'audit', value, unit, threshold, status: value <= threshold ? 'pass' : 'fail' };
    }

    return { metric, kind: 'unknown', value: null, unit: '', threshold, status: 'missing' };
  });
}

export function describeFailure(result: ThresholdResult): string {
  if (result.status === 'missing') return `${result.metric}: not reported by Lighthouse`;
  const unit = result.unit && result.unit !== 'score' ? ` ${result.unit}` : '';
  const comparison = result.kind === 'category' ? 'minimum' : 'maximum';
  return `${result.metric}: ${result.value}${unit} (${comparison} ${result.threshold})`;
}
