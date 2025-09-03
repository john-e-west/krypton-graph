/// <reference types="cypress" />

// Custom commands for Krypton-Graph Admin UI testing

// Login command
Cypress.Commands.add('login', (username: string = 'admin@example.com', password: string = 'password') => {
  // This would be updated with actual login flow
  cy.visit('/login');
  cy.get('input[name="email"]').type(username);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/dashboard');
});

// Create ontology command
Cypress.Commands.add('createOntology', (name: string, domain: string) => {
  cy.visit('/ontologies');
  cy.get('button').contains('Create Ontology').click();
  cy.get('input[name="name"]').type(name);
  cy.get('input[name="domain"]').type(domain);
  cy.get('button').contains('Save').click();
});

// Wait for API call
Cypress.Commands.add('waitForApi', (alias: string) => {
  cy.intercept('GET', '/api/**').as(alias);
  cy.wait(`@${alias}`);
});

// TypeScript support for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(username?: string, password?: string): Chainable<void>;
      createOntology(name: string, domain: string): Chainable<void>;
      waitForApi(alias: string): Chainable<void>;
    }
  }
}

export {};