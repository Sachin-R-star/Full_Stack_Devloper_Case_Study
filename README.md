# Mini ERP + CRM Operations Portal

A full-stack Operations Portal built for wholesale and distribution companies to manage **Customers (CRM)**, **Inventory & Stock Movements**, and **Sales Challans** with strict **Role-Based Access Control (RBAC)**.

---

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, JWT, bcryptjs, Zod
- **Database**: PostgreSQL (Prisma Client with ACID Transactions)
- **Frontend**: React (Vite + TypeScript), React Router v6, Axios, Tailwind CSS, Lucide Icons
- **Auth & RBAC**: Stateless JWT auth with role permissions (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`)

---

## 👥 Role Permissions & Demo Credentials

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@company.com` | `admin123` | Full unrestricted access to all modules, users, stock, and challan cancellations. |
| **Sales** | `sales@company.com` | `sales123` | Manage Customers, log follow-up notes, view inventory, build Draft & Confirmed Challans. |
| **Warehouse**| `warehouse@company.com` | `warehouse123` | View inventory, add/edit products, record manual stock adjustments, view stock audit logs. |
| **Accounts** | `accounts@company.com` | `accounts123` | Read-only view of Customers, Inventory, and Challans; permission to Cancel Confirmed Challans. |

*Note: On the login screen, click any of the 4 quick demo buttons for 1-click role authentication.*

---

## 📂 Project Architecture & Directory Structure

```
Full_Stack_Devloper_Case_Study/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database entities & ENUM definitions
│   │   └── seed.ts             # Demo data seeder script
│   ├── src/
│   │   ├── config/             # DB & Environment variables config
│   │   ├── controllers/        # Auth, Customer, Product, Challan, Report handlers
│   │   ├── middlewares/        # JWT auth & RBAC role checkers
│   │   ├── routes/             # Express API route endpoints
│   │   └── index.ts            # Server entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios API client with bearer token interceptor
│   │   ├── components/         # Navbar, Sidebar, Layout wrappers
│   │   ├── context/            # AuthContext for session & RBAC rules
│   │   ├── pages/              # Dashboard, Customers, CustomerDetail, Inventory, Movements, Challans, ChallanCreate, ChallanDetail
│   │   ├── types/              # Shared TypeScript data models
│   │   ├── App.tsx             # React Router with ProtectedRoute
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   └── vite.config.ts
├── implementation_plan.md
└── README.md
```

---

## 🛠️ Local Setup & Installation

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL installed locally or a PostgreSQL database URL (e.g. Supabase, Neon, Render Postgres)

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env and set your DATABASE_URL
cp .env.example .env

# Generate Prisma Client & Run Migrations
npx prisma generate
npx prisma migrate dev --name init

# Seed Database with Demo Users & Sample Data
npx prisma db seed

# Start Development Server (runs on http://localhost:5000)
npm run dev
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite React Dev Server (runs on http://localhost:3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the portal.

---

## 🌐 Deployment Instructions

### Backend (Render / Railway / Fly.io)
1. Create a PostgreSQL instance on **Supabase** or **Neon**.
2. Connect your GitHub repository to **Render** as a Web Service.
3. Set root directory to `backend`.
4. Build command: `npm install && npx prisma generate && npm run build`
5. Start command: `npm start`
6. Set environment variables: `DATABASE_URL`, `JWT_SECRET`, `PORT=5000`, `NODE_ENV=production`.

### Frontend (Vercel / Netlify / Render Static Site)
1. Connect repository to **Vercel** or **Netlify**.
2. Set root directory to `frontend`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Configure API proxy or update Axios base URL to point to live backend service.

---

## 💡 Key Business Logic & Edge Case Mitigations

1. **Negative Stock Prevention & Concurrency**:
   - Stock deduction occurs inside atomic database transactions (`prisma.$transaction`).
   - If stock for any item is less than requested quantity upon confirmation, the transaction rolls back and returns HTTP `400 Bad Request` with an explicit message detailing available vs requested units.
2. **Historical Data Integrity (Product Snapshots)**:
   - When a sales challan is generated, product name, SKU, and unit price are copied into `SalesChallanItem` snapshot fields.
   - Future catalog price changes or product updates will not alter historical challan totals.
3. **Challan Cancellation & Inventory Restocking**:
   - If an accounts manager or admin cancels a confirmed challan, inventory is automatically restored (`StockMovementType.IN`) and an audit trail entry is logged.
