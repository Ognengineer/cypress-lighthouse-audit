# cypress-lighthouse-audit

Run Lighthouse budgets from Cypress 16+ tests against the Chrome session Cypress already controls, so audits see the logged-in page.

- Works with Cypress 16. It never calls `Cypress.env()`.
- Secrets such as a preview-bypass token are resolved in Node and never pass through the browser.
- Lighthouse is a peer dependency, so you choose and pin its version. Every result reports `lighthouseVersion`.
- Writes JSON and standalone HTML reports, and prints a pass/fail table in the Node console.

## Install

```bash
pnpm add -D cypress-lighthouse-audit lighthouse
```

`lighthouse` is a peer dependency. Pin the version you want, for example `lighthouse@13.4.1`.

To install straight from GitHub instead:

```bash
pnpm add -D github:Ognengineer/cypress-lighthouse-audit#v0.1.0 lighthouse
```

The Git install builds the package through its `prepare` script. If pnpm 10 skips that script, add `"pnpm": { "onlyBuiltDependencies": ["cypress-lighthouse-audit"] }` to your `package.json` and install again.

## Setup

```ts
// cypress.config.ts
import { defineConfig } from 'cypress';
import { lighthousePlugin } from 'cypress-lighthouse-audit';

export default defineConfig({
  e2e: {
    taskTimeout: 180_000,
    setupNodeEvents(on, config) {
      lighthousePlugin(on, {
        headers: () => ({ 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS ?? '' }),
        reportsDir: 'cypress/reports/lighthouse',
      });
      return config;
    },
  },
});
```

```ts
// cypress/support/e2e.ts
import 'cypress-lighthouse-audit/commands';
```

## Usage

```ts
it('homepage stays within budget', () => {
  cy.visit('/');
  cy.lighthouse(
    {
      performance: 80,
      'best-practices': 90,
      'largest-contentful-paint': 3500,
      'cumulative-layout-shift': 0.1,
      'total-blocking-time': 300,
    },
    { formFactor: 'mobile' },
  );
});
```

Run with a Chromium browser, for example `cypress run --browser chrome`. Lighthouse attaches to Chrome through its remote-debugging port.

### Thresholds

| Key | Meaning | Passes when |
| --- | --- | --- |
| Category id (`performance`, `accessibility`, `best-practices`, `seo`) | Score 0–100 | score ≥ threshold |
| Audit id (`largest-contentful-paint`, `total-blocking-time`, …) | `numericValue` (ms, or unitless for CLS) | value ≤ threshold |

A key Lighthouse does not report fails the test with "not reported by Lighthouse". Only the categories you budget are run. Audit ids automatically add `performance`.

### `cy.lighthouse(thresholds, options)`

| Option | Default | |
| --- | --- | --- |
| `formFactor` | `'desktop'` | `'desktop'` or `'mobile'` screen-emulation preset |
| `flags` | `{}` | Lighthouse flags, for example `{ onlyCategories: [...] }` |
| `config` | `{}` | Lighthouse config; `config.settings` overrides the preset, for example `{ settings: { throttlingMethod: 'provided' } }` |
| `failOnBudget` | `true` | Set `false` to only yield the result |
| `timeout` | `180000` | `cy.task` timeout in ms; the first audit in a run also loads Lighthouse |

The command yields `{ url, lighthouseVersion, formFactor, passed, results, failures, reports }`.

### Plugin options

| Option | Default | |
| --- | --- | --- |
| `headers` | none | Function returning request headers; runs in Node for every audit |
| `reportsDir` | `'cypress/reports/lighthouse'` | `false` disables report files |
| `chromeFlags` | `['--disable-dev-shm-usage']` | Extra Chromium launch flags |
| `retryOnClosedPage` | `true` | Retry once when Chrome closes the page mid-audit |
| `log` | `true` | Print the result table |

### You already register `before:browser:launch`

Cypress keeps only one handler per event. Use `createLighthouse` and call its handler from yours:

```ts
import { createLighthouse } from 'cypress-lighthouse-audit';

const lighthouse = createLighthouse({ reportsDir: false });
on('before:browser:launch', (browser, launchOptions) => {
  // your own changes …
  return lighthouse.onBeforeBrowserLaunch(browser, launchOptions);
});
on('task', { ...myTasks, ...lighthouse.tasks });
```

## Example

`example/` is a small Cypress project that audits a static page (`example/site/`) on desktop and mobile:

```bash
pnpm example
```

`example/run.mjs` serves the page on `http://127.0.0.1:4173`, runs Cypress in Chrome, and checks that Lighthouse sent the header returned by the Node-side `headers` option. Reports are written to `example/reports/`. Override the defaults with `EXAMPLE_BROWSER`, `EXAMPLE_PORT` and `EXAMPLE_SPEC` (a spec path relative to `example/`).

## Development

```bash
pnpm install
pnpm check     # typecheck + unit tests + build
pnpm example   # real audits in Chrome
```

## Publishing

```bash
npm login
npm publish    # `prepare` builds dist/; only dist/ is packed ("files")
git tag vX.Y.Z && git push --tags
```
