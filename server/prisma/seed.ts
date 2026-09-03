import { prisma } from '../src/config/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

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
      update: { passwordHash, role: u.role, name: u.name },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      },
    });
  }

  // 2. Seed sample customers
  const customer1 = await prisma.customer.upsert({
    where: { id: 'cust-101' },
    update: {},
    create: {
      id: 'cust-101',
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

  const customer2 = await prisma.customer.upsert({
    where: { id: 'cust-102' },
    update: {},
    create: {
      id: 'cust-102',
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
  const product1 = await prisma.product.upsert({
    where: { sku: 'TOOL-DRL-800' },
    update: {},
    create: {
      name: 'Heavy Duty Power Drill 800W',
      sku: 'TOOL-DRL-800',
      category: 'Power Tools',
      unitPrice: 3499.0,
      currentStock: 45,
      minimumStock: 10,
      warehouseLocation: 'Rack A-12',
    },
  });

  const product2 = await prisma.product.upsert({
    where: { sku: 'ELEC-MSO-020' },
    update: {},
    create: {
      name: 'Wireless Ergonomic Mouse X20',
      sku: 'ELEC-MSO-020',
      category: 'Electronics',
      unitPrice: 899.0,
      currentStock: 5, // Below minimum stock trigger!
      minimumStock: 15,
      warehouseLocation: 'Bin E-04',
    },
  });

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
