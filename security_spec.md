# Security Specification — Laksmi Fertilizers Pesticides and Seeds

## 1. Data Invariants
1. **PII Isolation**: Customer records in `/users/{userId}`, `/carts/{userId}`, `/wishlists/{userId}`, `/orders/{orderId}`, `/orderItems/{itemId}`, `/payments/{paymentId}`, `/notifications/{notificationId}`, and `/invoices/{invoiceId}` MUST only be readable by the owning `userId` (`request.auth.uid`) or verified active Staff/Admins.
2. **No Self-Assigned Roles**: Customers cannot create or update `/admins/{adminId}` documents. Only the bootstrapped Super Admin (`nexumyst@gmail.com` with `email_verified == true`) or existing `SUPER_ADMIN` records may manage `/admins`.
3. **Catalog & Storefront Integrity**: `/products`, `/categories`, `/brands`, `/banners`, `/coupons`, `/suppliers`, `/purchaseEntries`, `/inventory`, `/stockMovements`, and `/settings` may only be modified by active Staff/Admins (with stock decrement during verified checkout strictly bounded or handled cleanly).
4. **Order State & Ownership**: Customers may only create orders with `userId == request.auth.uid`, `orderStatus == 'ORDER_PLACED'`, and cannot mark an order `PAID` unless verified or set by admin; customers may only request cancellation on non-shipped orders or return on delivered orders via allowed keys.
5. **Temporal Integrity & Path Guarding**: All document IDs (`isValidId`) match `^[a-zA-Z0-9_\-]+$` (<= 128 chars), every string enforces `.size()` limits, and `createdAt`/`updatedAt` timestamps match `request.time`.

## 2. The "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Order Creation**: Creating `/orders/order_1` with `request.auth == null`.
2. **Identity Spoofing on Order**: Authenticated user `uid_A` creating `/orders/order_2` with `userId: "uid_B"`.
3. **Self-Assigned Admin Escalation**: Regular user `uid_A` writing `/admins/uid_A` with `{ role: "SUPER_ADMIN", active: true }`.
4. **Cross-User PII Read**: Regular user `uid_A` reading `/users/uid_B`.
5. **Unfiltered List Query on Orders**: Regular user `uid_A` attempting `list` on `/orders` without filtering to `userId == uid_A`.
6. **Shadow Field Injection on User Profile**: User `uid_A` updating `/users/uid_A` with ghost field `{ isAdmin: true }`.
7. **Catalog Price Tampering**: Regular user `uid_A` updating `/products/prod_1` to set `price: 1`.
8. **Order Status Shortcutting**: Regular user `uid_A` updating `/orders/order_1` to set `orderStatus: "DELIVERED"` or `paymentStatus: "PAID"`.
9. **ID Poisoning**: Creating `/reviews/../../bad_id` or an ID exceeding 128 chars.
10. **Oversized String / Denial of Wallet**: Writing `/reviews/rev_1` with a 50,000-char `comment`.
11. **Unverified Email Spoof**: User with email `nexumyst@gmail.com` and `email_verified: false` attempting admin write.
12. **Audit Log Tampering**: Regular user or staff attempting to delete or modify `/auditLogs/log_1`.
