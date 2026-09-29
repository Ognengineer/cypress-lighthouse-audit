import { defineConfig } from 'cypress';

// A consuming project imports from 'cypress-lighthouse-audit'; the example uses the local build.
import { lighthousePlugin } from '../dist/node/index.js';

export default defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: false,
    taskTimeout: 180_000,
    setupNodeEvents(on, config) {
      lighthousePlugin(on, {
        reportsDir: 'reports',
        // Stand-in for a real secret such as a preview-bypass token: resolved here, never exposed to the browser.
        headers: () => ({ 'x-example-secret': process.env.EXAMPLE_SECRET ?? 'node-side-only' }),
      });
      return config;
    },
  },
});
