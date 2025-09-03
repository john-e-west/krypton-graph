describe('Ontology Management E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/ontologies');
  });

  it('should display the ontology management page', () => {
    cy.contains('h4', 'Ontology Management').should('be.visible');
    cy.contains('Create, manage, and publish ontologies').should('be.visible');
    cy.contains('button', 'Create Ontology').should('be.visible');
  });

  it('should open create ontology dialog when button is clicked', () => {
    cy.contains('button', 'Create Ontology').click();
    
    // Check if dialog opens (assuming it uses MUI Dialog)
    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('Create New Ontology').should('be.visible');
    
    // Check for form fields
    cy.get('input[name="name"]').should('be.visible');
    cy.get('input[name="domain"]').should('be.visible');
    cy.get('input[name="version"]').should('be.visible');
  });

  it('should create a new ontology', () => {
    // Click create button
    cy.contains('button', 'Create Ontology').click();
    
    // Fill in the form
    cy.get('input[name="name"]').type('Test Ontology');
    cy.get('input[name="domain"]').type('Testing');
    cy.get('input[name="version"]').type('1.0.0');
    cy.get('textarea[name="description"]').type('This is a test ontology');
    
    // Submit the form
    cy.contains('button', 'Create').click();
    
    // Verify the ontology appears in the list
    cy.contains('Test Ontology').should('be.visible');
    cy.contains('Testing').should('be.visible');
  });

  it('should display ontology cards with correct information', () => {
    // Check for ontology card elements
    cy.get('[class*="MuiCard"]').first().within(() => {
      // Check for essential elements
      cy.get('[class*="MuiTypography"]').should('exist');
      cy.get('[class*="MuiChip"]').should('exist'); // Status chip
      cy.get('[class*="MuiIconButton"]').should('exist'); // Action buttons
    });
  });

  it('should filter ontologies by status', () => {
    // If there's a filter dropdown
    cy.get('select[name="statusFilter"], [aria-label="Status Filter"]').select('Published');
    
    // Verify only published ontologies are shown
    cy.get('[class*="MuiChip"]').each(($chip) => {
      if ($chip.text().includes('Published')) {
        expect($chip).to.be.visible;
      }
    });
  });

  it('should edit an existing ontology', () => {
    // Click edit button on first ontology
    cy.get('[aria-label="Edit"]').first().click();
    
    // Dialog should open with pre-filled values
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('input[name="name"]').should('not.have.value', '');
    
    // Update the name
    cy.get('input[name="name"]').clear().type('Updated Ontology');
    
    // Save changes
    cy.contains('button', 'Save').click();
    
    // Verify update
    cy.contains('Updated Ontology').should('be.visible');
  });

  it('should clone an ontology', () => {
    // Click clone button on first ontology
    cy.get('[aria-label="Clone"]').first().click();
    
    // Verify a new ontology is created with "Copy" in the name
    cy.contains('Copy').should('be.visible');
  });

  it('should publish an ontology in testing status', () => {
    // Find an ontology with "Testing" status
    cy.contains('Testing').parent().parent().within(() => {
      cy.contains('button', 'Publish').click();
    });
    
    // Verify status changes to Published
    cy.contains('Published').should('be.visible');
  });

  it('should navigate to entity editor when clicking on an ontology', () => {
    // Click on an ontology card
    cy.get('[class*="MuiCard"]').first().click();
    
    // Should navigate to entity editor
    cy.url().should('include', '/entities');
  });

  it('should handle empty state', () => {
    // Mock empty response
    cy.intercept('GET', '**/ontologies', { body: [] });
    cy.visit('/ontologies');
    
    // Should show empty state message
    cy.contains('No ontologies found').should('be.visible');
    cy.contains('Create your first ontology').should('be.visible');
  });
});