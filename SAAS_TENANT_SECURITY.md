# Security Architecture Document: Multi-Tenant Data Isolation & Anti-IDOR Protections

**Document Version:** 1.0  
**Date:** September 3, 2026  
**Status:** Security Hardening & Penetration Verification Completed  

---

## 1. Security Design Principles

The application enforces a **Zero-Trust Multi-Tenant Data Isolation Model** to prevent cross-tenant data leakage, unauthorized access, and Insecure Direct Object Reference (IDOR) vulnerabilities.

### Key Rules Enforced Across All Backend APIs:
1. **Never Trust Client-Supplied Identifiers:**
   `organizationId` sent in request bodies, query strings, headers, or URL params is **strictly ignored** for authorization and overwritten with `req.user.organizationId` derived directly from the verified JWT.
2. **Single Source of Truth:**
   The authenticated JWT payload signed with `env.JWT_SECRET` provides the immutable `organizationId` for all business operations.
3. **Mandatory Query Scoping:**
   Every database operation (`findMany`, `findFirst`, `count`, `aggregate`, `update`, `delete`, `create`) automatically includes `where: { organizationId }`.
4. **Anti-IDOR Record Obfuscation:**
   Detail requests (`GET /customers/:id`, `GET /products/:id`, `GET /challans/:id`) and update operations (`PUT`) targeting records outside the authenticated user's organization return a **`404 Not Found`** status instead of `403 Forbidden`. This prevents attackers from enumerating valid resource IDs across other tenants.
5. **Cross-Entity Reference Validation:**
   When creating composite entities (e.g. Sales Challans referencing Customer IDs and Product IDs), referenced entity IDs are strictly validated to ensure they belong to the authenticated user's organization.

---

## 2. API Controller Security Audit Summary

| Module | Endpoint | Tenant Isolation Mechanism | IDOR Protection |
|---|---|---|---|
| **Customers** | `GET /customers` | Scoped by `organizationId: req.user.organizationId` | Returns only own organization records |
| | `GET /customers/:id` | Lookup via `findFirst({ where: { id, organizationId } })` | Returns `404 Not Found` if record belongs to another tenant |
| | `POST /customers` | Injects `organizationId: req.user.organizationId` | Cannot create records under another tenant ID |
| | `PUT /customers/:id` | Verifies `organizationId` ownership before update | Returns `404 Not Found` if record belongs to another tenant |
| | `POST /customers/:id/follow-ups` | Verifies `organizationId` ownership before logging note | Returns `404 Not Found` if customer belongs to another tenant |
| **Products** | `GET /products` | Scoped by `organizationId: req.user.organizationId` | Returns only own organization catalog |
| | `GET /products/:id` | Lookup via `findFirst({ where: { id, organizationId } })` | Returns `404 Not Found` if product belongs to another tenant |
| | `POST /products` | Injects `organizationId` & checks tenant SKU uniqueness | Cannot create product under another tenant ID |
| | `PUT /products/:id` | Verifies `organizationId` ownership before update | Returns `404 Not Found` if product belongs to another tenant |
| **Inventory** | `GET /inventory/movements` | Scoped by `organizationId: req.user.organizationId` | Returns only own organization stock log |
| | `POST /inventory/movements` | Validates target Product belongs to `organizationId` | Rejects stock movement on unowned product with `404` |
| **Challans** | `GET /challans` | Scoped by `organizationId: req.user.organizationId` | Returns only own organization challans |
| | `GET /challans/:id` | Lookup via `findFirst({ where: { id, organizationId } })` | Returns `404 Not Found` if challan belongs to another tenant |
| | `POST /challans` | Validates Customer ID & Product IDs belong to tenant | Rejects creation referencing another tenant's customer/product with `404` |
| | `PUT /challans/:id` | Verifies `organizationId` ownership before status update | Returns `404 Not Found` if challan belongs to another tenant |
| **Reports** | `GET /reports/dashboard` | Mandatory `organizationId` filter on counts & aggregations | Computes revenue, stock alerts & counts exclusively for own tenant |

---

## 3. Role-Based Access Control (RBAC) Coexistence

Tenant isolation operates as a **primary security boundary** *above* Role-Based Access Control (RBAC).

- **Tenant Boundary (Mandatory First Check):** Ensures user can ONLY see/modify data in `req.user.organizationId`.
- **Role Boundary (Second Check via `authorizeRoles`):** Restricts actions within the tenant based on user role (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).

---

## 4. Automated Cross-Tenant Penetration Suite Verification

Automated security verification in [`server/src/test-integration.ts`](file:///c:/Users/SACHIN/OneDrive/Desktop/Full_Stack_Devloper_Case_Study/server/src/test-integration.ts) executed **48/48 passed assertions**, explicitly validating:

1. **Org B cannot list Org A Customers:** Confirmed Org B list query excludes Org A records.
2. **Org B cannot read Org A Customer by ID:** Confirmed `GET /customers/:id` returns `null / 404`.
3. **Org B cannot modify Org A Customer:** Confirmed `PUT /customers/:id` returns `null / 404`.
4. **Org B cannot list Org A Products:** Confirmed Org B product catalog excludes Org A products.
5. **Org B cannot read Org A Product by ID:** Confirmed `GET /products/:id` returns `null / 404`.
6. **Org B cannot modify Org A Product:** Confirmed `PUT /products/:id` returns `null / 404`.
7. **Org B cannot view Org A Inventory Movements:** Confirmed Org B movement log excludes Org A movements.
8. **Org B cannot create Challan using Org A Customer:** Confirmed customer validation fails with `404`.
9. **Org B cannot create Challan using Org A Product:** Confirmed product validation fails with `404`.
10. **Org B cannot read Org A Challan:** Confirmed `GET /challans/:id` returns `null / 404`.
11. **Org A operations remain fully functional:** Confirmed Org A users can read/write their own data without interference.
