# Supabase Write Operations Inventory (Pre-Phase 3)

**Date:** 2026-02-09
**Commit:** c650c80

## POSPage.tsx (16 operations — ALL must be replaced)

| Line | Table | Operation | Function | Replacement Endpoint |
|------|-------|-----------|----------|---------------------|
| 696 | orders | SELECT | PickupTab.searchOrder | GET /api/pickup/search |
| 721 | orders | UPDATE status | PickupTab.markPickedUp | POST /api/pickup/verify |
| 729 | inventory | SELECT | PickupTab.markPickedUp | POST /api/pickup/verify |
| 736 | inventory | UPDATE qty | PickupTab.markPickedUp | POST /api/pickup/verify |
| 852 | payments | INSERT | PickupPaymentForm.processPayment | POST /api/pickup/verify |
| 860 | orders | UPDATE payment_status | PickupPaymentForm.processPayment | POST /api/pickup/verify |
| 916 | orders | SELECT | RefundTab.searchOrder | GET /api/pos/refund/search |
| 938 | orders | UPDATE status=refunded | RefundTab.processRefund | POST /api/pos/refund |
| 944 | payments | INSERT negative | RefundTab.processRefund | POST /api/pos/refund |
| 954 | inventory | SELECT | RefundTab.processRefund | POST /api/pos/refund |
| 961 | inventory | UPDATE return stock | RefundTab.processRefund | POST /api/pos/refund |
| 1043 | repair_tickets | SELECT | RepairTab.searchTicket | GET /api/pos/repairs/search |
| 1065 | repair_tickets | UPDATE status | RepairTab.markPickedUp | POST /api/pos/repairs/complete |
| 1086 | repair_tickets | UPDATE deposit | RepairTab.collectDeposit | POST /api/pos/repairs/collect-deposit |
| 1232 | payments | INSERT | RepairPaymentForm | POST /api/pos/repairs/complete |
| 1240 | repair_tickets | UPDATE status | RepairPaymentForm | POST /api/pos/repairs/complete |

## AdminDiscounts.tsx (9 operations — ALL must be replaced)

| Line | Table | Operation | Replacement Endpoint |
|------|-------|-----------|---------------------|
| 51 | coupons | SELECT | GET /api/admin/coupons |
| 59 | coupons | UPDATE is_active | PUT /api/admin/coupons/{id}/toggle |
| 67 | coupons | DELETE | DELETE /api/admin/coupons/{id} |
| 170 | coupons | UPDATE | PUT /api/admin/coupons/{id} |
| 173 | coupons | INSERT | POST /api/admin/coupons |
| 225 | gift_cards | SELECT | GET /api/admin/gift-cards |
| 233 | gift_cards | UPDATE is_active | PUT /api/admin/gift-cards/{id}/toggle |
| 316 | gift_cards | UPDATE | PUT /api/admin/gift-cards/{id} |
| 319 | gift_cards | INSERT | POST /api/admin/gift-cards |

## ProductPage.tsx (4 operations — wishlists, low priority)

| Line | Table | Operation | Replacement Endpoint |
|------|-------|-----------|---------------------|
| 30 | products | SELECT | Already served by Inertia prop (future) |
| 46 | wishlists | SELECT | GET /api/wishlist/check |
| 63 | wishlists | DELETE | DELETE /api/wishlist/{productId} |
| 70 | wishlists | INSERT | POST /api/wishlist |

## Total: 29 Supabase operations → 0 target
