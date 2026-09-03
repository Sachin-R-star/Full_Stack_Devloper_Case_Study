# Technical Audit: Mini ERP + CRM Multi-Tenant SaaS Migration Audit

**Document Version:** 1.0  
**Date:** September 3, 2026  
**Status:** Baseline Audit Completed  

---

## 1. Current Architecture Overview

The system is currently structured as a single-tenant, full-stack ERP & CRM web application:

- **Frontend (`/client`):** Built with React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, and React Router v6.
- **Backend (`/server`):** Built with Express.js, TypeScript, and Prisma ORM 5.22.
- **Database:** PostgreSQL hosted on Neon DB (`neondb`).
- **Authentication:** Stateless JSON Web Token (JWT) authorization using `jsonwebtoken` and `bcryptjs`.
- **API Client:** Axios instance with request/response interceptors managing `Authorization: Bearer <token>` headers and handling `401 Unauthorized` token purges.

---

## 2. Current Database Models & Relationships

Defined in [`server/prisma/schema.prisma`](file:///c:/Users/SACHIN/OneDrive/Desktop/Full_Stack_Devloper_Case_Study/server/prisma/schema.prisma):

1. **User (`User`)**
   - Fields: `id` (UUID), `name`, `email` (Global Unique), `passwordHash`, `role` (Default: `"SALES"`), `createdAt`, `updatedAt`.
   - Relations: `followUps` (1:N), `stockMovements` (1:N), `challans` (1:N).

2. **Customer (`Customer`)**
   - Fields: `id` (UUID), `name`, `mobile`, `email`, `businessName`, `gstNumber`, `customerType` (Default: `"RETAIL"`), `address`, `status` (Default: `"LEAD"`), `followUpDate`, `notes`, `createdAt`, `updatedAt`.
   - Relations: `followUps` (1:N), `challans` (1:N).

3. **FollowUpNote (`FollowUpNote`)**
   - Fields: `id` (UUID), `customerId`, `userId`, `note`, `createdAt`.
   - Relations: Belongs to `Customer` (Cascade Delete), Belongs to `User`.

4. **Product (`Product`)**
   - Fields: `id` (UUID), `name`, `sku` (Global Unique), `category`, `unitPrice`, `currentStock` (Default: 0), `minimumStock` (Default: 10), `warehouseLocation`, `createdAt`, `updatedAt`.
   - Relations: `stockMovements` (1:N), `challanItems` (1:N).

5. **StockMovement (`StockMovement`)**
   - Fields: `id` (UUID), `productId`, `quantityChanged`, `movementType` (`"IN"` | `"OUT"`), `reason`, `createdById`, `createdAt`.
   - Relations: Belongs to `Product`, Belongs to `User` (`createdBy`).

6. **Challan (`Challan`)**
   - Fields: `id` (UUID), `challanNumber` (Global Unique format `SCH-YYYY-XXXX`), `customerId`, `totalQuantity`, `totalAmount`, `status` (`"DRAFT"` | `"CONFIRMED"` | `"CANCELLED"`), `createdById`, `createdAt`, `updatedAt`.
   - Relations: Belongs to `Customer`, Belongs to `User` (`createdBy`), `items` (1:N).

7. **ChallanItem (`ChallanItem`)**
   - Fields: `id` (UUID), `challanId`, `productId`, `productNameSnapshot`, `skuSnapshot`, `unitPriceSnapshot`, `quantity`, `subtotal`.
   - Relations: Belongs to `Challan` (Cascade Delete), Belongs to `Product`.

---

## 3. Authentication & Authorization Logic

### Authentication Flow
- **Login (`POST /auth/login`):** Validates email/password against `User` table. Issues a JWT valid for 24 hours containing:
  ```json
  { "id": "user-uuid", "email": "user@email.com", "name": "User Name", "role": "ADMIN|SALES|WAREHOUSE|ACCOUNTS" }
  ```
- **Profile Check (`GET /auth/me`):** Authenticates JWT header and returns full user details.

### Authorization Middleware
- [`authenticateJWT`](file:///c:/Users/SACHIN/OneDrive/Desktop/Full_Stack_Devloper_Case_Study/server/src/middlewares/auth.middleware.ts#L19-L35): Extracts Bearer token, verifies signature using `env.JWT_SECRET`, attaches decoded user payload to `req.user`.
- [`authorizeRoles(...allowedRoles)`](file:///c:/Users/SACHIN/OneDrive/Desktop/Full_Stack_Devloper_Case_Study/server/src/middlewares/auth.middleware.ts#L37-L54): Asserts `req.user.role` matches the route requirements.

### Existing Role Access Matrix

| Role | Customer CRM | Product Catalog | Stock Movements | Sales Challans | Reports |
|---|---|---|---|---|---|
| **ADMIN** | Read/Write | Read/Write | Read/Write | Read/Write | Read |
| **SALES** | Read/Write | Read | Read | Read/Write | Read |
| **WAREHOUSE** | No Access | Read/Write | Read/Write | Read | Read |
| **ACCOUNTS** | Read | Read | Read | Read/Update Status | Read |

---

## 4. Summary of Existing API Endpoints

### Auth
- `POST /auth/login` (Public) - Authenticates credentials, returns JWT.
- `GET /auth/me` (`authenticateJWT`) - Returns authenticated user details.

### Customers (`/customers` & `/api/customers`)
- `GET /` (`ADMIN`, `SALES`, `ACCOUNTS`) - List customers (search, filter, pagination).
- `GET /:id` (`ADMIN`, `SALES`, `ACCOUNTS`) - Customer details + follow-up history + recent challans.
- `POST /` (`ADMIN`, `SALES`) - Create customer.
- `PUT /:id` (`ADMIN`, `SALES`) - Update customer.
- `POST /:id/follow-ups` (`ADMIN`, `SALES`) - Add follow-up note (attaches `req.user.id`).

### Products (`/products` & `/api/products`)
- `GET /` (All Roles) - List products (search, category filter, low-stock filter).
- `GET /:id` (All Roles) - Product detail + stock movement history.
- `POST /` (`ADMIN`, `WAREHOUSE`) - Create product (creates initial stock movement if `initialStock > 0`).
- `PUT /:id` (`ADMIN`, `WAREHOUSE`) - Update product details.

### Inventory (`/inventory` & `/api/inventory`)
- `GET /movements` (All Roles) - List stock movements (filters by product, type).
- `POST /movements` (`ADMIN`, `WAREHOUSE`) - Create manual IN/OUT movement + update stock atomically.

### Sales Challans (`/challans` & `/api/challans`)
- `GET /` (All Roles) - List sales challans.
- `GET /:id` (All Roles) - Challan detail + line items.
- `POST /` (`ADMIN`, `SALES`) - Create sales challan (`DRAFT` or `CONFIRMED`).
- `PUT /:id` (`ADMIN`, `SALES`, `ACCOUNTS`) - Update challan status (`DRAFT->CONFIRMED`, `DRAFT->CANCELLED`, `CONFIRMED->CANCELLED`) with atomic stock adjustments.

### Reports (`/reports` & `/api/reports`)
- `GET /dashboard` (All Roles) - Returns aggregate stats (customer counts, inventory stock alerts, revenue sum, recent movements).

---

## 5. Frontend Auth & State Architecture

- [`AuthContext.tsx`](file:///c:/Users/SACHIN/OneDrive/Desktop/Full_Stack_Devloper_Case_Study/client/src/context/AuthContext.tsx): Manages `user` and `token` state synced with `localStorage` (`erp_token`, `erp_user`). Calls `/auth/me` on initial render to validate session token.
- [`axios.client.ts`](file:///c:/Users/SACHIN/OneDrive/Desktop/Full_Stack_Devloper_Case_Study/client/src/api/axios.client.ts): Attaches `Authorization: Bearer <token>` to all HTTP requests. Purges token on `401` errors.
- [`App.tsx`](file:///c:/Users/SACHIN/OneDrive/Desktop/Full_Stack_Devloper_Case_Study/client/src/App.tsx): Defines client routes wrapped in `ProtectedRoute` checks.
- [`LoginPage.tsx`](file:///c:/Users/SACHIN/OneDrive/Desktop/Full_Stack_Devloper_Case_Study/client/src/pages/LoginPage.tsx): Provides credentials form and quick demo buttons for testing all 4 roles.

> **Note on Signup/Registration:** There is currently **NO self-service "Create Account" or Organization Registration UI/API** in the codebase. All existing users are seeded or created programmatically.

---

## 6. Key Risks for Multi-Tenant SaaS Conversion

1. **Cross-Tenant Data Leakage (No Isolation in Queries):**
   Currently, all queries (`findMany`, `count`, `findUnique`, `aggregate`) perform unscoped global database reads/writes without checking a `tenantId`.
2. **Global Unique Key Collisions:**
   - `Product.sku` is `@unique`. In multi-tenancy, two separate tenants might use the same SKU (e.g. `DRILL-500`).
   - `Challan.challanNumber` is `@unique`. In multi-tenancy, challan sequence (`SCH-2026-0001`) must be scoped per tenant.
3. **Challan Sequence Generator Unscoped:**
   `generateChallanNumber()` searches globally across all records to calculate `nextSequence`.
4. **Token Context Missing Tenant Metadata:**
   The current JWT payload does not store `tenantId` or tenant slug.
5. **No Tenant Registration / Organization Provisioning Flow:**
   A multi-tenant SaaS requires a sign-up flow to onboard a new organization (Tenant) along with its first Admin user.

---

## 7. Recommended Migration Order

1. **Phase 1 — Tenant Schema & Model Foundation:**
   - Introduce `Tenant` model in `schema.prisma`.
   - Add `tenantId` foreign key to `User`, `Customer`, `Product`, `StockMovement`, `Challan`, `FollowUpNote`.
   - Update unique constraints to compound keys: `@@unique([tenantId, sku])`, `@@unique([tenantId, challanNumber])`.
2. **Phase 2 — Auth Context & Middleware Tenant Scoping:**
   - Update JWT payload to include `tenantId`.
   - Update `authenticateJWT` and request interfaces (`AuthRequest`) to expose `req.user.tenantId`.
3. **Phase 3 — Controller & Business Logic Isolation:**
   - Inject `tenantId` filters into all Prisma reads, updates, aggregates, and transaction writes.
   - Update `generateChallanNumber` to compute sequence per tenant.
4. **Phase 4 — Multi-Tenant Registration & Onboarding:**
   - Implement `POST /auth/register-tenant` API (creates Tenant + initial Admin user).
   - Build client-side Sign Up / Register Organization UI.
5. **Phase 5 — Test Suite & Verification:**
   - Update integration test suite (`test-integration.ts`) to verify strict cross-tenant data isolation and multi-tenant workflows.
