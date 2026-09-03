# Multi-Tenant SaaS Database Architecture & Migration Documentation

**Document Version:** 1.0  
**Date:** September 3, 2026  
**Status:** Multi-Tenant Database Architecture Implemented & Verified  

---

## 1. Multi-Tenant Entity Model

The database has been upgraded from a single-tenant structure to a robust, row-level isolated **Multi-Tenant SaaS Architecture** centered around the `Organization` model.

### Primary Tenant Model
```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users          User[]
  customers      Customer[]
  followUps      FollowUpNote[]
  products       Product[]
  stockMovements StockMovement[]
  challans       Challan[]
}
```

---

## 2. Tenant Isolation & Relationships

Every domain entity is linked to an `Organization` via a required `organizationId` foreign key with `onDelete: Cascade`:

1. **User (`User`):** Belongs to an `Organization`. Every user session carries `organizationId`.
2. **Customer (`Customer`):** Tenant-scoped customer relationship records.
3. **FollowUpNote (`FollowUpNote`):** Tenant-scoped CRM logs.
4. **Product (`Product`):** Tenant-scoped product catalog and stock levels.
5. **StockMovement (`StockMovement`):** Tenant-scoped inventory movement audit trail.
6. **Challan (`Challan`):** Tenant-scoped sales order documents.
7. **ChallanItem (`ChallanItem`):** Child entity of `Challan` inherits tenant boundaries via parent `Challan`.

---

## 3. Compound Indexes & Uniqueness Constraints

To allow different organizations to operate with their own internal identifiers without global namespace collisions, global unique constraints have been refactored into **Tenant-Scoped Compound Unique Indexes**:

### Tenant-Scoped Product SKUs
```prisma
model Product {
  organizationId String
  sku            String
  ...
  @@unique([organizationId, sku])
}
```
*Effect:* Two distinct tenants can independently register identical SKUs (e.g. `DRILL-500`) without collision.

### Tenant-Scoped Challan Numbers
```prisma
model Challan {
  organizationId String
  challanNumber  String
  ...
  @@unique([organizationId, challanNumber])
}
```
*Effect:* Each organization maintains its own sequential sales challan numbering system starting from `SCH-YYYY-0001`.

### Query Performance Indexes
High-cardinality multi-tenant indexes added to optimize common query pathways:
- `User`: `@@index([organizationId])`
- `Customer`: `@@index([organizationId])`, `@@index([organizationId, status])`
- `FollowUpNote`: `@@index([organizationId])`
- `Product`: `@@index([organizationId])`, `@@index([organizationId, category])`
- `StockMovement`: `@@index([organizationId])`
- `Challan`: `@@index([organizationId])`, `@@index([organizationId, status])`

---

## 4. Zero Data-Loss Safe Migration Strategy

Existing database records were migrated safely to the multi-tenant architecture using a two-step zero-downtime strategy:

1. **Schema Initialization (Nullable Foreign Key):**
   `organizationId String?` was added to `schema.prisma` as optional, allowing schema changes to apply without failing existing rows.
2. **Data Population Script ([`server/prisma/migrate-tenants.ts`](file:///c:/Users/SACHIN/OneDrive/Desktop/Full_Stack_Devloper_Case_Study/server/prisma/migrate-tenants.ts)):**
   Created the default tenant (`Acme Corp`) and populated `organizationId` for all unassigned records in `User`, `Customer`, `FollowUpNote`, `Product`, `StockMovement`, and `Challan`.
3. **Schema Finalization (Required Foreign Key & Indexes):**
   Upgraded `organizationId String` to non-nullable required, applied compound indexes (`@@unique([organizationId, sku])`, `@@unique([organizationId, challanNumber])`), and synchronized the schema via `npx prisma db push`.

---

## 5. Seed Script Enhancements

The seed script ([`server/prisma/seed.ts`](file:///c:/Users/SACHIN/OneDrive/Desktop/Full_Stack_Devloper_Case_Study/server/prisma/seed.ts)) has been updated to automatically provision the default Organization (`Acme Corp`) and bind seeded users, customers, and products to that organization.

---

## 6. Verification & Test Suite

The automated verification suite ([`server/src/test-integration.ts`](file:///c:/Users/SACHIN/OneDrive/Desktop/Full_Stack_Devloper_Case_Study/server/src/test-integration.ts)) passed **30/30 test assertions**, confirming:
- Organization creation and multi-organization coexistence.
- User-organization binding and JWT tenant context propagation.
- Tenant-scoped SKU and Challan number uniqueness across multiple organizations.
- Cross-tenant data isolation preventing data leakage between Organization A and Organization B.
