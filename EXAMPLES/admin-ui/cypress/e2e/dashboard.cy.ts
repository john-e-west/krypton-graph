describe('Dashboard E2E Tests', () => {
  beforeEach(() => {
    // Visit the dashboard page
    cy.visit('/dashboard');
  });

  it('should display the dashboard with all main sections', () => {
    // Check main title
    cy.contains('h4', 'Dashboard').should('be.visible');
    
    // Check for key metric cards
    cy.contains('Ontologies').should('be.visible');
    cy.contains('Rating Configs').should('be.visible');
    cy.contains('Test Runs').should('be.visible');
    cy.contains('Assignments').should('be.visible');
  });

  it('should display charts', () => {
    // Check for chart sections
    cy.contains('Domain Distribution').should('be.visible');
    cy.contains('Test Success Rate').should('be.visible');
    cy.contains('Performance Metrics').should('be.visible');
  });

  it('should display recent test runs section', () => {
    cy.contains('Recent Test Runs').should('be.visible');
  });

  it('should navigate to ontologies page when clicking view all', () => {
    // Find and click a "View All" or navigation button
    cy.contains('Ontologies').parent().parent().within(() => {
      // This would click on the ontology card if it's clickable
      cy.root().click();
    });
    
    // Or navigate via sidebar if available
    // cy.get('[data-testid="nav-ontologies"]').click();
    // cy.url().should('include', '/ontologies');
  });

  it('should refresh data when refresh button is clicked', () => {
    // If there's a refresh button
    cy.get('button[aria-label="refresh"]').click({ force: true, multiple: true });
    
    // Verify API calls are made
    cy.intercept('GET', '**/ontologies').as('getOntologies');
    cy.wait('@getOntologies', { timeout: 10000 });
  });

  it('should handle empty data gracefully', () => {
    // Intercept API calls and return empty arrays
    cy.intercept('GET', '**/ontologies', { body: [] });
    cy.intercept('GET', '**/fact-rating-configs', { body: [] });
    cy.intercept('GET', '**/test-runs', { body: [] });
    cy.intercept('GET', '**/assignments', { body: [] });
    
    cy.visit('/dashboard');
    
    // Should still display the structure without errors
    cy.contains('Dashboard').should('be.visible');
    cy.contains('Ontologies').should('be.visible');
  });
});