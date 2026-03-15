import { useRef } from 'react';

interface ReceiptItem {
  name: string;
  sku: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface ReceiptData {
  orderNumber: string;
  date: string;
  cashier: string;
  register: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  vatAmount: number;
  total: number;
  paymentMethod: string;
  offline?: boolean;
}

export function printReceipt(data: ReceiptData) {
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) return;

  const itemRows = data.items.map(item => `
    <tr>
      <td style="text-align:left;padding:2px 0;">${item.name}<br/><span style="font-size:10px;color:#666;">${item.sku}</span></td>
      <td style="text-align:center;padding:2px 4px;">${item.qty}</td>
      <td style="text-align:right;padding:2px 0;">$${item.line_total.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${data.orderNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 280px;
          margin: 0 auto;
          padding: 10px 0;
        }
        .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .header h1 { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
        .header p { font-size: 10px; color: #333; }
        .info { margin: 8px 0; font-size: 11px; }
        .info div { display: flex; justify-content: space-between; padding: 1px 0; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th { text-align: left; border-bottom: 1px solid #000; padding: 4px 0; font-size: 11px; }
        th:nth-child(2) { text-align: center; }
        th:nth-child(3) { text-align: right; }
        .totals { border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; }
        .totals div { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; }
        .totals .grand-total { font-size: 16px; font-weight: bold; border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; }
        .footer { text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; font-size: 10px; color: #666; }
        .barcode { text-align: center; font-size: 14px; letter-spacing: 2px; margin: 8px 0; font-family: 'Libre Barcode 39', monospace; }
        @media print {
          body { width: 100%; }
          @page { margin: 0; size: 80mm auto; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>BELLEVUE</h1>
        <p>Gifts & Supplies Ltd.</p>
        <p>Freeport, Grand Bahama</p>
        <p>Tel: (242) 351-2000</p>
      </div>

      <div class="info">
        <div><span>Date:</span><span>${data.date}</span></div>
        <div><span>Order:</span><span>${data.orderNumber}</span></div>
        <div><span>Cashier:</span><span>${data.cashier}</span></div>
        <div><span>Register:</span><span>${data.register}</span></div>
        <div><span>Payment:</span><span>${data.paymentMethod.replace('_', ' ').toUpperCase()}</span></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="totals">
        <div><span>Subtotal:</span><span>$${data.subtotal.toFixed(2)}</span></div>
        ${data.discount > 0 ? `<div><span>Discount:</span><span>-$${data.discount.toFixed(2)}</span></div>` : ''}
        <div><span>VAT (10%):</span><span>$${data.vatAmount.toFixed(2)}</span></div>
        <div class="grand-total"><span>TOTAL:</span><span>$${data.total.toFixed(2)}</span></div>
      </div>

      ${data.offline ? '<div style="text-align:center;margin:10px 0;font-weight:bold;">** OFFLINE TRANSACTION **</div>' : ''}

      <div class="footer">
        <p>Thank you for shopping at Bellevue!</p>
        <p>Exchange/return within 7 days with receipt</p>
        <p style="margin-top:5px;">${data.orderNumber}</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); };
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
