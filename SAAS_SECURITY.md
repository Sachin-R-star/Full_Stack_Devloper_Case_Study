# SaaS Production Security Hardening & Architecture Guide

This document summarizes the security posture, isolation architecture, and production controls implemented across the multi-tenant SaaS application.

---

## 🛡️ 1. Multi-Tenant Isolation & Data Governance

- **Database Tenant Association:** Every tenant-owned entity (`User`, `Customer`, `Product`, `InventoryMovement`, `Challan`, `Invitation`, `Subscription`, `Invoice`) maintains an explicit `organizationId` foreign key and database index (`@@index([organizationId])`).
- **Zero-Trust Frontend Context:** The backend NEVER relies on `organizationId` sent via request query parameters or request body. The tenant context is strictly extracted from the authenticated user's JWT payload (`req.user.organizationId`).
- **Query Scoping Enforcement:** All database read, update, create, and delete operations are scoped by `organizationId`:
  ```typescript
  // Example scoped query
  await prisma.customer.findFirst({
    where: { id, organizationId: req.user.organizationId }
  });
  ```

---

## 🔒 2. IDOR Protection & 404 Obfuscation

- **Insecure Direct Object Reference (IDOR) Defense:** Detail endpoints (`GET /customers/:id`, `GET /products/:id`, `GET /challans/:id`) automatically verify entity ownership against `req.user.organizationId`.
- **404 Not Found Obfuscation:** If a user from Organization A attempts to fetch or modify a record belonging to Organization B, the server responds with `404 Not Found` (rather than `403 Forbidden`). This prevents malicious actors from enumerating resource IDs across organizations.

---

## 🔑 3. Authentication, Password & JWT Security

- **Password Hashing:** Passwords are hashed using `bcryptjs` with standard salt rounds. Password hashes are strictly excluded from API user response objects.
- **Transactional User + Tenant Registration:** Account creation (`POST /auth/register`) executes in a single database transaction (`prisma.$transaction`). If either Organization or User creation fails, the transaction rolls back completely.
- **Strict Role Assignment:** Public registration automatically sets `role: 'ADMIN'`. The client cannot manipulate role selection during signup.
- **Privilege Escalation Controls:**
  - Non-admin users cannot alter team member roles (`PATCH /organization/members/:id/role`).
  - Users cannot escalate their own role or demote/remove the sole organization admin (**Last-ADMIN protection**).
- **JWT Security:** Tokens carry `userId`, `organizationId`, and `role`, signed with `JWT_SECRET` and expiring after 24 hours.

---

## ⚡ 4. Rate Limiting & Brute Force Prevention

Installed `express-rate-limit` middleware on critical paths:

| Endpoint | Window | Max Requests | Objective |
| :--- | :--- | :--- | :--- |
| `/auth/login` | 15 Minutes | 10 per IP | Prevents automated credential stuffing & brute-force password guessing |
| `/auth/register` | 1 Hour | 5 per IP | Prevents automated spam account / tenant creation |
| `/customers`, `/products`, `/challans` | 15 Minutes | 300 per IP | Prevents denial of service (DoS) and data scraping |

---

## 🛡️ 5. HTTP Security Headers (Helmet) & CORS Controls

- **Security Headers:** Integrated `helmet()` middleware:
  - `Content-Security-Policy` (CSP)
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (Clickjacking defense)
  - `X-XSS-Protection: 0`
- **CORS Whitelisting:** CORS origin is restricted to authorized frontend origins (`FRONTEND_URL`, `http://localhost:5173`) with `credentials: true`.
- **Request Body Size Limit:** JSON body parsing is restricted to `100kb` (`express.json({ limit: '100kb' })`) to prevent memory exhaustion attacks.

---

## 💳 6. Razorpay Webhook & Signature Security

- **Backend Checkout Creation:** Frontend payment state is never trusted. Checkout orders are signed backend via `PaymentService.createCheckoutOrder`.
- **HMAC SHA-256 Signature Verification:** Payments are activated only after verifying the HMAC SHA-256 signature (`orderId|paymentId`) with `RAZORPAY_KEY_SECRET`.
- **Webhook Authenticity & Idempotency:**
  - Webhooks (`POST /webhooks/razorpay`) verify the `x-razorpay-signature` header against `RAZORPAY_WEBHOOK_SECRET`.
  - Processed events are recorded in `WebhookEvent` (`eventId` @unique). Duplicate webhook calls are safely identified and skipped.

---

## 📋 7. Audit Logging & Security Event Tracing

- Structured `AuditLogger` service logs critical operations to stdout and internal buffers:
  - Authentication events (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `USER_REGISTERED`)
  - Team management (`MEMBER_INVITED`, `MEMBER_ROLE_UPDATED`, `MEMBER_REMOVED`)
  - Subscription & billing (`CHECKOUT_CREATED`, `PAYMENT_VERIFIED`, `WEBHOOK_PROCESSED`)

---

## ⚙️ 8. Environment Secrets & Error Masking

- **Production Error Masking:** In `NODE_ENV=production`, internal error stack traces and raw Prisma database messages are suppressed. API responses return sanitized error messages (`"An unexpected error occurred."`).
- **Secrets Management:** `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `JWT_SECRET`, and `DATABASE_URL` are stored in `.env` and strictly excluded from Git tracking via `.gitignore`.
