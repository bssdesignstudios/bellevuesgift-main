describe('POS Order Test', () => {
    it('allows a cashier to log in and process an order', () => {
        // 1. Clear cookies and visit the staff login page
        cy.clearCookies();
        cy.visit('/staff/login');

        // Wait for demo buttons to render
        cy.contains('button', 'Maria Santos', { timeout: 5000 });

        // 2. Click the Cashier demo button (navigates directly to /pos)
        cy.contains('button', 'Maria Santos').click();

        // 3. Verify we are on the POS page
        cy.url({ timeout: 10000 }).should('include', '/pos');

        // Wait for products to load — look for a product card with stock
        cy.contains('In Stock', { timeout: 10000 }).should('be.visible');

        // 4. Click the first product card that has stock (contains "In Stock")
        // Find the parent card element and click it
        cy.contains('In Stock').parents('[class*="cursor-pointer"]').first().click();

        // 5. Verify item added to cart
        cy.contains('Cart (1)', { timeout: 5000 }).should('exist');

        // 6. Click "Pay" button
        // The button text contains "Pay $"
        cy.contains('button', 'Pay $').click();

        // 7. Verify Checkout Dialog opens
        cy.get('[role="dialog"]').should('be.visible');
        cy.contains('Total Due').should('be.visible');

        // 8. Select Cash (default) and Complete Payment
        cy.contains('button', 'Complete Payment').click();

        // 9. Verify Success State or Log Error
        // Wait for potential error toast first
        cy.wait(3000); // Wait for async operation
        cy.get('body').then(($body) => {
            // Sonner toasts usually have list items
            const errorToast = $body.find('li[data-type="error"]');
            if (errorToast.length > 0) {
                const errorText = errorToast.text();
                cy.log('PAYMENT FAILED WITH TOAST:', errorText);
                throw new Error(`Payment Failed: ${errorText}`);
            }
        });

        // "Payment successful!" toast or "Receipt" header
        cy.contains('Receipt', { timeout: 10000 }).should('be.visible');
        cy.contains('Payment Complete').should('be.visible');

        // 10. Close Receipt
        cy.contains('button', 'Done').click();

        // 11. Verify Cart is empty again
        cy.contains('Cart (0)').should('exist');
    });
});
