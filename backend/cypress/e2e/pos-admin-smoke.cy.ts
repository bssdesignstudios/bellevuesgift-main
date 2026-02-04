/// <reference types="cypress" />

describe('Staff demo login routing', () => {
  beforeEach(() => {
    // Clear cookies to ensure no stale session between tests
    cy.clearCookies();
    cy.visit('/staff/login');
    // Wait for the React app to mount and demo buttons to render
    cy.contains('button', 'Maria Santos', { timeout: 5000 });
  });

  it('routes cashier demo to POS', () => {
    cy.contains('button', 'Maria Santos').click();
    // wait for the async login + 500ms setTimeout + page reload
    cy.url({ timeout: 10000 }).should('include', '/pos');
    // POS cart tab is visible
    cy.contains('Cart', { timeout: 10000 }).should('be.visible');
  });

  it('routes warehouse demo to POS', () => {
    cy.contains('button', 'Warehouse Manager').click();
    cy.url({ timeout: 10000 }).should('include', '/pos');
    cy.contains('Cart', { timeout: 10000 }).should('be.visible');
  });

  it('routes admin demo to Admin dashboard', () => {
    cy.contains('button', 'Admin User').click();
    cy.url({ timeout: 10000 }).should('include', '/admin');
    cy.contains('Overview', { timeout: 10000 }).should('be.visible');
  });
});
