/// <reference types="cypress" />
import { LIGHTHOUSE_TASK } from './constants';
import type { LighthouseCommandOptions, LighthouseTaskArgs, LighthouseTaskResult, Thresholds } from './types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Runs a Lighthouse audit on the current page and fails the test when a threshold is missed.
       * Requires `lighthousePlugin(on)` in `setupNodeEvents` and a Chromium browser.
       */
      lighthouse(thresholds: Thresholds, options?: LighthouseCommandOptions): Chainable<LighthouseTaskResult>;
    }
  }
}

Cypress.Commands.add('lighthouse', (thresholds: Thresholds, options: LighthouseCommandOptions = {}) => {
  const { failOnBudget = true, timeout = 180_000, ...audit } = options;

  return cy.url({ log: false }).then((url) => {
    const args: LighthouseTaskArgs = { url, thresholds, ...audit };
    return cy.task<LighthouseTaskResult>(LIGHTHOUSE_TASK, args, { timeout, log: false }).then((result) => {
      Cypress.log({
        name: 'lighthouse',
        message: `${result.formFactor} ${result.passed ? 'within budget' : 'over budget'}`,
        consoleProps: () => ({ url: result.url, version: result.lighthouseVersion, results: result.results }),
      });
      if (failOnBudget && !result.passed) {
        throw new Error(`Lighthouse budget missed for ${result.url}:\n${result.failures.join('\n')}`);
      }
      return result;
    });
  });
});

export {};
