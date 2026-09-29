import type { ThresholdResult } from '../types';

const STATUS_LABEL: Record<ThresholdResult['status'], string> = {
  pass: 'PASS',
  fail: 'FAIL',
  missing: 'N/A',
};

/** Fixed-width table: metric | value | unit | threshold | result. */
export function formatResultsTable(results: ThresholdResult[]): string {
  const header = ['metric', 'value', 'unit', 'threshold', 'result'];
  const rows = results.map((r) => [r.metric, r.value === null ? '—' : String(r.value), r.unit, String(r.threshold), STATUS_LABEL[r.status]]);
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column].length)));

  const line = (cells: string[]) => `| ${cells.map((cell, column) => cell.padEnd(widths[column])).join(' | ')} |`;
  const separator = `+${widths.map((width) => '-'.repeat(width + 2)).join('+')}+`;

  return [separator, line(header), separator, ...rows.map(line), separator].join('\n');
}

export function formatSummary(version: string, formFactor: string, url: string, passed: boolean): string {
  return `[lighthouse] v${version} • ${formFactor} • ${url} (${passed ? 'within budget' : 'over budget'})`;
}
