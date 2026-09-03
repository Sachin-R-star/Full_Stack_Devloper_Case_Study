import { prisma } from '../src/config/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding multi-tenant database...');

  // 0. Seed default organization
  let organization = await prisma.organization.findFirst({
    where: { name: 'Acme Corp' },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'Acme Corp',
      },
    });
  }

  const organizationId = organization.id;

  // 1. Seed demo users for all 4 roles
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    { name: 'System Admin', email: 'admin@company.com', role: 'ADMIN' },
    { name: 'Sales Representative', email: 'sales@company.com', role: 'SALES' },
    { name: 'Warehouse Manager', email: 'warehouse@company.com', role: 'WAREHOUSE' },
    { name: 'Accounts Officer', email: 'accounts@company.com', role: 'ACCOUNTS' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role: u.role, name: u.name, organizationId },
      create: {
        organizationId,
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      },
    });
  }

  // 2. Seed sample customers
  await prisma.customer.upsert({
    where: { id: 'cust-101' },
    update: { organizationId },
    create: {
      id: 'cust-101',
      organizationId,
      name: 'Rajesh Sharma',
      mobile: '+91 9876543210',
      email: 'rajesh@apexwholesalers.com',
      businessName: 'Apex Wholesalers Pvt Ltd',
      gstNumber: '27AABCU9603R1ZM',
      customerType: 'DISTRIBUTOR',
      address: 'Plot 42, Industrial Area Phase 1, Mumbai, MH',
      status: 'ACTIVE',
      notes: 'Key distributor for West region',
    },
  });

  await prisma.customer.upsert({
    where: { id: 'cust-102' },
    update: { organizationId },
    create: {
      id: 'cust-102',
      organizationId,
      name: 'Priya Verma',
      mobile: '+91 9123456789',
      email: 'priya@sharmastores.in',
      businessName: 'Sharma Superstore Chain',
      gstNumber: '07BABCU9603R1ZN',
      customerType: 'WHOLESALE',
      address: 'Shop 12-15, Main Market, Connaught Place, New Delhi',
      status: 'LEAD',
      notes: 'Follow up required for bulk discount',
    },
  });

  // 3. Seed sample products
  const product1 = await prisma.product.findFirst({
    where: { organizationId, sku: 'TOOL-DRL-800' },
  });
  if (!product1) {
    await prisma.product.create({
      data: {
        organizationId,
        name: 'Heavy Duty Power Drill 800W',
        sku: 'TOOL-DRL-800',
        category: 'Power Tools',
        unitPrice: 3499.0,
        currentStock: 45,
        minimumStock: 10,
        warehouseLocation: 'Rack A-12',
      },
    });
  }

  const product2 = await prisma.product.findFirst({
    where: { organizationId, sku: 'ELEC-MSO-020' },
  });
  if (!product2) {
    await prisma.product.create({
      data: {
        organizationId,
        name: 'Wireless Ergonomic Mouse X20',
        sku: 'ELEC-MSO-020',
        category: 'Electronics',
        unitPrice: 899.0,
        currentStock: 5,
        minimumStock: 15,
        warehouseLocation: 'Bin E-04',
      },
    });
  }

  console.log('✅ Seeding completed successfully for organization:', organization.name);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
