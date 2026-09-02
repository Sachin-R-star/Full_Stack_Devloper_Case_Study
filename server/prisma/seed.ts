import { PrismaClient, Role, CustomerType, CustomerStatus, StockMovementType, ChallanStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Phase 2 Database Seeding...');

  // Clear existing records
  await prisma.challanItem.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.followUpNote.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // Create password hashes
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const salesPasswordHash = await bcrypt.hash('sales123', 10);
  const warehousePasswordHash = await bcrypt.hash('warehouse123', 10);
  const accountsPasswordHash = await bcrypt.hash('accounts123', 10);

  // 1. Seed One User for each Role
  const admin = await prisma.user.create({
    data: {
      name: 'Alex Rivera (Admin)',
      email: 'admin@company.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const sales = await prisma.user.create({
    data: {
      name: 'Sarah Connor (Sales)',
      email: 'sales@company.com',
      passwordHash: salesPasswordHash,
      role: Role.SALES,
    },
  });

  const warehouse = await prisma.user.create({
    data: {
      name: 'Marcus Vance (Warehouse)',
      email: 'warehouse@company.com',
      passwordHash: warehousePasswordHash,
      role: Role.WAREHOUSE,
    },
  });

  const accounts = await prisma.user.create({
    data: {
      name: 'Rachel Zane (Accounts)',
      email: 'accounts@company.com',
      passwordHash: accountsPasswordHash,
      role: Role.ACCOUNTS,
    },
  });

  console.log('✅ Users created for all 4 roles: Admin, Sales, Warehouse, Accounts');

  // 2. Seed Sample Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Rajesh Kumar',
      mobile: '+91 9876543210',
      email: 'rajesh@apexwholesalers.com',
      businessName: 'Apex Wholesalers Pvt Ltd',
      gstNumber: '07AAAAA0000A1Z5',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Plot 45, Industrial Area Phase II, New Delhi',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 86400000 * 3),
      notes: 'Key distributor for Northern Region.',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Priya Sharma',
      mobile: '+91 9811223344',
      email: 'priya@sharmaretail.com',
      businessName: 'Sharma Superstore Chain',
      gstNumber: '27BBBCA1111B1Z2',
      customerType: CustomerType.WHOLESALE,
      address: 'Shop 12-14, Main Market, New Delhi',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 86400000 * 1),
      notes: 'Interested in electronic item catalogue.',
    },
  });

  console.log('✅ Sample Customers created');

  // 3. Seed Sample Products
  const product1 = await prisma.product.create({
    data: {
      name: 'Heavy Duty Power Drill 800W',
      sku: 'PWR-DRL-800',
      category: 'Power Tools',
      unitPrice: 3499.00,
      currentStock: 120,
      minimumStock: 15,
      warehouseLocation: 'Warehouse A - Bay 04',
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Wireless Ergonomic Mouse X20',
      sku: 'ACC-MSE-X20',
      category: 'Electronics',
      unitPrice: 899.00,
      currentStock: 8,
      minimumStock: 20,
      warehouseLocation: 'Warehouse B - Shelf 12',
    },
  });

  console.log('✅ Sample Products created');
  console.log('🎉 Phase 2 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
