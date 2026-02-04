
describe('Gift Card Purchase Flow', () => {
    it('should allow configuring and adding a gift card to the cart', () => {
        // 1. Visit the Gift Cards page
        cy.visit('/gift-cards');

        // 2. Wait for form to load (check for "To" field)
        cy.get('input#recipientEmail').should('be.visible');

        // 3. Fill in the form
        cy.get('input#recipientEmail').type('test@example.com');
        cy.get('input#recipientName').type('Test Recipient');
        cy.get('input#senderName').type('Test Sender');
        cy.get('textarea#message').type('Happy Birthday!');

        // 4. Click Add to Cart
        cy.contains('button', 'Add to Cart').click();

        // 5. Verify toast message
        // The toast library used is 'sonner', which usually renders a toast list
        cy.contains('added to cart').should('be.visible');

        // 6. Visit the Cart page
        cy.visit('/cart');

        // 7. Verify the item is in the cart with details
        cy.contains('Gift Card').should('be.visible');
        // Check for the custom options
        cy.contains('test@example.com').should('be.visible');
        cy.contains('Test Sender').should('be.visible');
        cy.contains('Happy Birthday!').should('be.visible');
    });
});
