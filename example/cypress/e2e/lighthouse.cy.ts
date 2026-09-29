describe('cy.lighthouse()', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('passes the budget on desktop', () => {
    cy.lighthouse({
      performance: 90,
      accessibility: 90,
      'best-practices': 90,
      seo: 90,
      'largest-contentful-paint': 2500,
      'cumulative-layout-shift': 0.1,
      'total-blocking-time': 200,
    }).then((result) => {
      expect(result.passed).to.equal(true);
      expect(result.formFactor).to.equal('desktop');
      expect(result.lighthouseVersion).to.match(/^\d+\.\d+\.\d+/);
      expect(result.reports?.html).to.be.a('string');
    });
  });

  it('reports a missed budget on mobile without failing when failOnBudget is false', () => {
    cy.lighthouse(
      { 'total-blocking-time': -1, 'not-a-real-audit': 1 },
      { formFactor: 'mobile', failOnBudget: false },
    ).then((result) => {
      expect(result.passed).to.equal(false);
      expect(result.formFactor).to.equal('mobile');
      expect(result.failures).to.have.length(2);
      expect(result.failures[0]).to.contain('total-blocking-time');
      expect(result.failures[1]).to.equal('not-a-real-audit: not reported by Lighthouse');
    });
  });
});
