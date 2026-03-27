export interface SOPStep {
  title: string;
  steps: string[];
}

export interface SOPSection {
  id: string;
  role: string; // 'cashier' | 'warehouse' | 'admin' | 'finance' | 'manager'
  title: string;
  icon: string; // lucide icon name
  procedures: SOPStep[];
}

export const SOP_DATA: SOPSection[] = [
  // ── CASHIER ──────────────────────────────────────────────
  {
    id: 'cashier-register',
    role: 'cashier',
    title: 'Register & Sales',
    icon: 'ShoppingCart',
    procedures: [
      {
        title: 'Start Shift',
        steps: [
          'What: Open your register session so the system can track your sales and cash.',
          'When: At the beginning of every shift, before serving any customers.',
          'Log in to the POS using your PIN.',
          'You will be asked to enter the float amount (the cash already in the drawer).',
          'Count the physical cash in the drawer and type in the total.',
          'Confirm the amount to open the session.',
          'Your register is now active and ready for sales.',
        ],
      },
      {
        title: 'Process Sale',
        steps: [
          'What: Ring up items for a customer and collect payment.',
          'When: Every time a customer is ready to check out.',
          'Scan the item barcode or use the search bar to find the product.',
          'Repeat for each item the customer wants to buy.',
          'If the customer has a discount or coupon, tap "Apply Discount" and enter the details.',
          'Review the items and total on screen.',
          'Ask the customer how they would like to pay (cash, card, or gift card).',
          'Select the payment method and process it.',
          'Hand the customer their receipt and thank them.',
        ],
      },
      {
        title: 'Process Refund',
        steps: [
          'What: Return an item and refund the customer.',
          'When: A customer brings back an item with a valid receipt or order reference.',
          'Ask the customer for the order number or receipt.',
          'Look up the order in the system using the order number or customer name.',
          'Select the item(s) the customer wants to return.',
          'Confirm the refund amount shown on screen.',
          'Process the refund back to the original payment method.',
          'If cash, count out the refund amount and hand it to the customer.',
          'The inventory will be updated automatically.',
        ],
      },
      {
        title: 'Gift Cards',
        steps: [
          'What: Sell, check balance, or accept gift cards as payment.',
          'When: A customer wants to buy, use, or check a gift card.',
          'To check balance: Scan or enter the gift card number and the balance will display.',
          'To sell a new gift card: Select "Sell Gift Card", enter the dollar amount, and process payment.',
          'To accept as payment: During checkout, select "Gift Card" as the payment method.',
          'Scan or enter the gift card number.',
          'If the gift card does not cover the full amount, collect the remaining balance via another method.',
        ],
      },
      {
        title: 'Close Shift',
        steps: [
          'What: End your register session and reconcile the cash drawer.',
          'When: At the end of your shift, after serving your last customer.',
          'Click "Close Shift" in the POS menu.',
          'Count all the cash in the drawer carefully.',
          'Enter the actual cash total into the system.',
          'The system will show you the expected amount and any variance (over or short).',
          'Review the variance. If it is large, double-check your count.',
          'Add a note if needed (e.g. "customer overpaid $1").',
          'Confirm to close the session. Your shift summary will be saved.',
        ],
      },
    ],
  },

  // ── WAREHOUSE ────────────────────────────────────────────
  {
    id: 'warehouse-inventory',
    role: 'warehouse',
    title: 'Inventory Management',
    icon: 'Warehouse',
    procedures: [
      {
        title: 'Search Product',
        steps: [
          'What: Find a product to check its stock level, location, or details.',
          'When: You need to look up any product in the system.',
          'Go to the Inventory page from the sidebar.',
          'Use the search bar at the top to type the product name or SKU.',
          'Alternatively, scan the product barcode with the scanner.',
          'The matching product(s) will appear with current stock levels.',
          'Click on a product to see full details including location and history.',
        ],
      },
      {
        title: 'Count Inventory (Cycle Count)',
        steps: [
          'What: Physically count stock and update the system to match.',
          'When: During scheduled cycle counts or when stock levels seem wrong.',
          'Go to the Inventory page.',
          'Switch to Card mode using the view toggle (grid icon).',
          'Find the product you are counting.',
          'Use the +/- buttons for small adjustments.',
          'For a full count, click "Count" and enter the exact quantity on hand.',
          'Add a note explaining the count (e.g. "weekly cycle count").',
          'Submit the update. The system will record the adjustment.',
        ],
      },
      {
        title: 'Receive Stock',
        steps: [
          'What: Log incoming stock from a supplier delivery.',
          'When: A shipment arrives at the store.',
          'Go to the Batch Receive section from the sidebar.',
          'Scan each item as you unpack it, or search by name/SKU.',
          'Enter the quantity received for each item.',
          'If an item is damaged, do not include it in the received count (handle separately).',
          'Review the full list of received items.',
          'Submit the batch. Stock levels will update automatically.',
        ],
      },
      {
        title: 'Handle Damage / Shrink',
        steps: [
          'What: Record stock that is damaged, stolen, or otherwise lost.',
          'When: You find damaged goods or notice inventory shrinkage.',
          'Go to the Inventory page and find the affected product.',
          'Click on the product to open its details.',
          'Adjust the stock quantity down by the affected amount.',
          'Select the adjustment type: "Damage" or "Shrink".',
          'Add a note describing what happened (e.g. "broken in transit, 3 units").',
          'Submit the adjustment. The system will log the reason and updated stock.',
        ],
      },
      {
        title: 'Reorder View',
        steps: [
          'What: Check which items are running low and need to be reordered.',
          'When: Daily or before placing supplier orders.',
          'Go to the Inventory page.',
          'Look for items flagged as "Low Stock" (below their reorder level).',
          'Review the list of items that need restocking.',
          'Use the export button to download the list as a CSV file.',
          'Share the exported list with the purchasing team or manager.',
        ],
      },
    ],
  },

  // ── ADMIN ────────────────────────────────────────────────
  {
    id: 'admin-management',
    role: 'admin',
    title: 'Store Administration',
    icon: 'Shield',
    procedures: [
      {
        title: 'Manage Products',
        steps: [
          'What: Add new products, edit existing ones, or update pricing.',
          'When: New merchandise arrives, prices change, or product details need updating.',
          'Go to the Products page from the sidebar.',
          'To add a new product, click "Add Product" and fill in name, SKU, price, and category.',
          'To edit an existing product, find it in the list and click the edit icon.',
          'Update the fields you need to change (name, price, description, etc.).',
          'Assign the product to the correct category.',
          'Save your changes. The product will be available in the POS immediately.',
        ],
      },
      {
        title: 'Manage Categories',
        steps: [
          'What: Organize products into categories for easier browsing.',
          'When: You need to create a new category, rename one, or change the display order.',
          'Go to the Categories page from the sidebar.',
          'To create a new category, click "Add Category" and enter a name.',
          'Set the sort order (lower numbers appear first).',
          'Toggle the category active or inactive as needed.',
          'To edit, click the edit icon next to the category name.',
          'Save changes. Products in that category will reflect the update.',
        ],
      },
      {
        title: 'Manage Staff',
        steps: [
          'What: Add new employees, update roles, or manage POS access.',
          'When: A new employee joins, someone changes roles, or access needs updating.',
          'Go to the Staff page from the sidebar.',
          'To add a new staff member, click "Add Staff".',
          'Enter their name, email, and select their role (cashier, warehouse, admin, etc.).',
          'Set a POS PIN for register access.',
          'To deactivate a staff member, find them in the list and toggle their active status off.',
          'Inactive staff cannot log in to the POS or admin panel.',
        ],
      },
      {
        title: 'Handle Repairs',
        steps: [
          'What: Track and manage repair tickets for customer items.',
          'When: A customer drops off an item for repair or a repair status changes.',
          'Go to the Repair Tickets page from the sidebar.',
          'View all open repair tickets and their current status.',
          'Click on a ticket to see full details.',
          'Update the status as work progresses (e.g. Received, In Progress, Ready, Picked Up).',
          'Record any payments or deposits against the ticket.',
          'When the customer picks up, mark the ticket as complete.',
        ],
      },
      {
        title: 'Use Dashboard',
        steps: [
          'What: Get an overview of store performance and any issues that need attention.',
          'When: Start of day, or any time you want a quick health check.',
          'Go to the Dashboard (Overview) page.',
          'Review today\'s sales total and transaction count.',
          'Check the alerts section for anything that needs immediate attention.',
          'Review low stock warnings and pending orders.',
          'Monitor daily performance against targets.',
          'Click on any metric to drill down into more detail.',
        ],
      },
    ],
  },

  // ── FINANCE ──────────────────────────────────────────────
  {
    id: 'finance-operations',
    role: 'finance',
    title: 'Financial Operations',
    icon: 'DollarSign',
    procedures: [
      {
        title: 'Review Reports',
        steps: [
          'What: Analyze sales, revenue, and store performance data.',
          'When: Daily, weekly, or monthly as part of financial review.',
          'Go to the Reports page from the sidebar.',
          'Select the date range you want to review.',
          'View the charts and summary figures for that period.',
          'Use filters to narrow down by category, payment method, or staff member.',
          'To save the data, click "Export CSV" to download a spreadsheet.',
          'Share the exported file with management or accounting as needed.',
        ],
      },
      {
        title: 'Approve Payroll',
        steps: [
          'What: Review and approve pending payroll entries before payment.',
          'When: At the end of each pay period, before processing bank payments.',
          'Go to the Finance page and select the Payroll section.',
          'Review all pending payroll entries.',
          'For each entry, verify the hours worked and hourly rate are correct.',
          'Cross-reference with timesheet records if anything looks off.',
          'Click "Approve" on each verified entry.',
          'Approved entries are ready for bank payment processing.',
        ],
      },
      {
        title: 'Mark Payroll Paid',
        steps: [
          'What: Record that an approved payroll entry has been paid via bank transfer.',
          'When: After the bank payment has been confirmed and processed.',
          'Go to the Finance page and select the Payroll section.',
          'Find the approved entries that have been paid.',
          'Click "Mark Paid" on each entry that the bank has confirmed.',
          'The status will update to "Paid" and the payment date will be recorded.',
          'This keeps the system in sync with your actual bank payments.',
        ],
      },
      {
        title: 'Review Expenses',
        steps: [
          'What: Check and manage recorded business expenses.',
          'When: Regularly, to keep expense tracking up to date.',
          'Go to the Finance page and select the Expenses section.',
          'Use the category filter to narrow down by expense type.',
          'Review each expense entry for accuracy.',
          'Check that receipts or documentation are attached where required.',
          'Use the export button to download expense records for accounting.',
          'Flag any entries that need follow-up or correction.',
        ],
      },
    ],
  },

  // ── MANAGER (Daily) ──────────────────────────────────────
  {
    id: 'manager-daily',
    role: 'manager',
    title: 'Manager Daily Routines',
    icon: 'UserCog',
    procedures: [
      {
        title: 'Morning Check',
        steps: [
          'What: Review the state of the store at the start of the day.',
          'When: First thing every morning before the store opens.',
          'Log in and go to the Dashboard.',
          'Check the alerts section for any urgent issues.',
          'Review low stock items and decide if any need emergency reorders.',
          'Check for pending orders or deliveries expected today.',
          'Review yesterday\'s closing notes if any were left by the evening team.',
          'Make a plan for the day based on what needs attention.',
        ],
      },
      {
        title: 'Staff Check',
        steps: [
          'What: Make sure the right people are working and hours are tracked.',
          'When: After the morning rush, or mid-day.',
          'Go to the Timesheets page.',
          'Verify that all scheduled staff have clocked in.',
          'Check for any missing or unusual timesheet entries.',
          'Follow up with anyone who has not clocked in.',
          'Review the shift coverage to make sure all positions are filled.',
        ],
      },
      {
        title: 'End of Day',
        steps: [
          'What: Wrap up the day and make sure everything is accounted for.',
          'When: After the store closes, before leaving for the day.',
          'Go to the Dashboard and review today\'s total sales.',
          'Check register variances from all closed shifts.',
          'Investigate any large variances (over/short more than $5).',
          'Review any repair tickets that were updated today.',
          'Check that all staff have clocked out.',
          'Leave notes for the morning team if anything needs follow-up.',
        ],
      },
    ],
  },

  // ── MANAGER (Weekly) ─────────────────────────────────────
  {
    id: 'manager-weekly',
    role: 'manager',
    title: 'Manager Weekly Routines',
    icon: 'UserCog',
    procedures: [
      {
        title: 'Reports Review',
        steps: [
          'What: Analyze the week\'s performance and spot trends.',
          'When: End of the week (Friday or Saturday).',
          'Go to the Reports page.',
          'Set the date range to the current week.',
          'Compare this week\'s sales to last week.',
          'Look for trends: which days were strongest, which products sold most.',
          'Note anything unusual (big drops, spikes, or new patterns).',
          'Save or export the data for your weekly team meeting.',
        ],
      },
      {
        title: 'Inventory Audit',
        steps: [
          'What: Review stock levels and make sure inventory is accurate.',
          'When: Once per week, ideally on a quieter day.',
          'Go to the Inventory page.',
          'Check the reorder list for items below their minimum stock level.',
          'Review recent stock movements and adjustments.',
          'Identify any products with large discrepancies.',
          'Schedule cycle counts for any suspicious items.',
          'Export the reorder list and submit to the purchasing team.',
        ],
      },
      {
        title: 'Payroll Approval',
        steps: [
          'What: Review and approve all pending payroll entries for the week.',
          'When: End of the pay period, before payroll is submitted to the bank.',
          'Go to the Finance page and select Payroll.',
          'Review all pending entries for the current pay period.',
          'Verify hours against timesheets for each staff member.',
          'Check that overtime, if any, is correctly calculated.',
          'Approve all verified entries.',
          'Notify the finance team that payroll is approved and ready for processing.',
        ],
      },
    ],
  },

  // ── CUSTOMERS ─────────────────────────────────────────────
  {
    id: 'customers',
    role: 'admin',
    title: 'Customer Management',
    icon: 'Users',
    procedures: [
      {
        title: 'Create a Customer',
        steps: [
          'What: Add a new customer record to the system.',
          'When: First time a customer makes a purchase or signs up.',
          'Go to Customers in the sidebar.',
          'Click the "New Customer" button at the top right.',
          'Fill in the customer\'s name (required), email, and phone number.',
          'Add their address and island if known.',
          'Select account type — Personal or Business.',
          'If Business: fill in Business Name, Contact Person, and VAT Number.',
          'Click "Create Customer" to save.',
          'The customer will appear in the list and can now be linked to quotes and invoices.',
        ],
      },
      {
        title: 'Find a Customer',
        steps: [
          'What: Search for an existing customer record.',
          'When: Before creating an invoice or quote, or to check order history.',
          'Go to Customers in the sidebar.',
          'Use the search bar to type the customer\'s name, email, or phone.',
          'Click the customer row to view their full profile and history.',
        ],
      },
      {
        title: 'Send Password Reset',
        steps: [
          'What: Help a customer regain access to their online account.',
          'When: Customer contacts support saying they cannot log in.',
          'Go to Customers in the sidebar.',
          'Find the customer using the search bar.',
          'Click the customer row to open their profile.',
          'Click "Send Password Reset" — an email will be dispatched automatically.',
          'Ask the customer to check their email and follow the reset link.',
        ],
      },
    ],
  },

  // ── QUOTES ────────────────────────────────────────────────
  {
    id: 'quotes',
    role: 'finance',
    title: 'Quotes',
    icon: 'FileText',
    procedures: [
      {
        title: 'Create a Quote',
        steps: [
          'What: Generate a formal price estimate to send to a customer.',
          'When: Customer requests pricing before committing to a purchase.',
          'Go to Quotes in the sidebar.',
          'The system auto-generates a quote number — change it if needed.',
          'Use the Customer search to select an existing customer, or leave blank.',
          'Set the status to Draft while building the quote.',
          'Set the Issued Date and Valid Until date.',
          'Under Quote Items, click "Add Item" and search for a product.',
          'Selecting a product auto-fills the description and price.',
          'Adjust quantity, apply tax % or discount $ as needed.',
          'Click "Create Quote" to save.',
          'Change status to Sent when ready to share with the customer.',
        ],
      },
      {
        title: 'Convert Quote to Invoice',
        steps: [
          'What: Turn an accepted quote into a payable invoice.',
          'When: Customer approves the quote and is ready to be billed.',
          'Go to Quotes in the sidebar.',
          'Find the quote and click the "→ Invoice" button.',
          'The system creates a new invoice with all line items copied over.',
          'The quote status is automatically set to Accepted.',
          'Go to Invoices to find the newly created invoice and set the Due Date.',
        ],
      },
      {
        title: 'Edit or Update a Quote',
        steps: [
          'What: Modify an existing quote before it is accepted.',
          'When: Customer requests changes to items, pricing, or dates.',
          'Go to Quotes in the sidebar.',
          'Find the quote and click the edit (pencil) icon.',
          'Make the required changes — add/remove items, adjust prices.',
          'Save the changes and notify the customer of the updated version.',
        ],
      },
    ],
  },

  // ── INVOICES ──────────────────────────────────────────────
  {
    id: 'invoices',
    role: 'finance',
    title: 'Invoices',
    icon: 'Receipt',
    procedures: [
      {
        title: 'Create an Invoice',
        steps: [
          'What: Issue a formal billing document to a customer.',
          'When: After services are rendered or goods are delivered.',
          'Go to Invoices in the sidebar.',
          'The system auto-generates an invoice number.',
          'Use the Customer search to select the customer being billed.',
          'Set the Issued Date and Due Date.',
          'Under Invoice Items, click "Add Item" and search for a product or service.',
          'Selecting a product auto-fills description and price — adjust as needed.',
          'Set quantity, tax %, and any discounts.',
          'Click "Create Invoice" to save.',
          'Set status to Sent when you share it with the customer.',
        ],
      },
      {
        title: 'Record a Payment',
        steps: [
          'What: Log that a customer has paid all or part of an invoice.',
          'When: Customer makes a payment via bank transfer, cash, or card.',
          'Go to Invoices in the sidebar.',
          'Find the invoice and open it.',
          'Enter the amount paid in the "Amount Paid" field.',
          'Save — the Balance Due updates automatically.',
          'If Amount Paid equals the total, status changes to Paid.',
          'If partial, the status changes to Partial.',
        ],
      },
      {
        title: 'Email Invoice to Customer',
        steps: [
          'What: Email a copy of the invoice directly to the customer.',
          'When: After creating an invoice or when a customer requests a copy.',
          'Go to Invoices in the sidebar.',
          'Find the invoice and click the Email button.',
          'Enter the recipient\'s email address and an optional message.',
          'Click Send — the email log records this send for your records.',
        ],
      },
      {
        title: 'Print or Download Invoice',
        steps: [
          'What: Get a printable or PDF copy of the invoice.',
          'When: Customer needs a physical copy, or for internal records.',
          'Go to Invoices in the sidebar.',
          'Find the invoice and click Print or Download.',
          'A formatted print view opens in a new tab.',
          'Use the browser\'s print dialog to print or save as PDF.',
        ],
      },
    ],
  },
];
