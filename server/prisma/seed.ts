import { PrismaClient, Role, CustomerType, CustomerStatus, StockMovementType, ChallanStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database for Mini ERP + CRM Portal...');

  // 1. Clean existing records (Optional for clean re-seeds)
  await prisma.salesChallanItem.deleteMany();
  await prisma.salesChallan.deleteMany();
  await prisma.stockMovementLog.deleteMany();
  await prisma.product.deleteMany();
  await prisma.followUpNote.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Password Hashes
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const salesPasswordHash = await bcrypt.hash('sales123', 10);
  const warehousePasswordHash = await bcrypt.hash('warehouse123', 10);
  const accountsPasswordHash = await bcrypt.hash('accounts123', 10);

  // 3. Seed Users
  const adminUser = await prisma.user.create({
    data: {
      name: 'Alex Rivera (Admin)',
      email: 'admin@company.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Sarah Connor (Sales)',
      email: 'sales@company.com',
      passwordHash: salesPasswordHash,
      role: Role.SALES,
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      name: 'Marcus Vance (Warehouse)',
      email: 'warehouse@company.com',
      passwordHash: warehousePasswordHash,
      role: Role.WAREHOUSE,
    },
  });

  const accountsUser = await prisma.user.create({
    data: {
      name: 'Rachel Zane (Accounts)',
      email: 'accounts@company.com',
      passwordHash: accountsPasswordHash,
      role: Role.ACCOUNTS,
    },
  });

  console.log('✅ Users created: Admin, Sales, Warehouse, Accounts');

  // 4. Seed Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Rajesh Kumar',
      mobile: '+91 9876543210',
      email: 'rajesh@apexwholesalers.com',
      businessName: 'Apex Wholesalers Pvt Ltd',
      gstNumber: '07AAAAA0000A1Z5',
      type: CustomerType.DISTRIBUTOR,
      address: 'Plot 45, Industrial Area Phase II, New Delhi',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
      notes: 'Key distributor for Northern Region. Bulk buyer.',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Priya Sharma',
      mobile: '+91 9811223344',
      email: 'priya@sharmaretail.com',
      businessName: 'Sharma Superstore Chain',
      gstNumber: '27BBBCA1111B1Z2',
      type: CustomerType.WHOLESALE,
      address: 'Shop 12-14, Main Market, Connaught Place, New Delhi',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 86400000 * 1), // Tomorrow
      notes: 'Interested in new electronic item catalogue.',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Anil Gupta',
      mobile: '+91 9711002233',
      email: 'gupta.hardware@gmail.com',
      businessName: 'Gupta Hardware Mart',
      gstNumber: null,
      type: CustomerType.RETAIL,
      address: '42, Hardware Bazaar, Old City',
      status: CustomerStatus.LEAD,
      followUpDate: new Date(Date.now() + 86400000 * 5),
      notes: 'New lead interested in sample challan quotes.',
    },
  });

  console.log('✅ Customers created');

  // 5. Seed Customer Follow-up Notes
  await prisma.followUpNote.createMany({
    data: [
      {
        customerId: customer1.id,
        userId: salesUser.id,
        note: 'Discussed Q3 bulk discount rates. Client requested revised quote.',
      },
      {
        customerId: customer2.id,
        userId: salesUser.id,
        note: 'Product demonstration completed. Client satisfied with pricing.',
      },
      {
        customerId: customer3.id,
        userId: adminUser.id,
        note: 'Initial phone call inquiry handled. Sent digital catalogue.',
      },
    ],
  });

  // 6. Seed Products
  const product1 = await prisma.product.create({
    data: {
      name: 'Heavy Duty Power Drill 800W',
      sku: 'PWR-DRL-800',
      category: 'Power Tools',
      unitPrice: 3499.00,
      currentStock: 120,
      minStockAlertQty: 15,
      location: 'Warehouse A - Bay 04',
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Wireless Ergonomic Mouse X20',
      sku: 'ACC-MSE-X20',
      category: 'Electronics',
      unitPrice: 899.00,
      currentStock: 8, // LOW STOCK TRIGGER
      minStockAlertQty: 20,
      location: 'Warehouse B - Shelf 12',
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Industrial Safety Helmet - Yellow',
      sku: 'SFY-HLM-YLW',
      category: 'Safety Equipment',
      unitPrice: 450.00,
      currentStock: 250,
      minStockAlertQty: 50,
      location: 'Warehouse A - Bay 01',
    },
  });

  const product4 = await prisma.product.create({
    data: {
      name: 'High Precision Digital Caliper 150mm',
      sku: 'TST-CLP-150',
      category: 'Measurement Tools',
      unitPrice: 1250.00,
      currentStock: 5, // LOW STOCK TRIGGER
      minStockAlertQty: 10,
      location: 'Warehouse B - Cabinet 03',
    },
  });

  console.log('✅ Products created with low stock triggers');

  // 7. Seed Stock Movement Logs
  await prisma.stockMovementLog.createMany({
    data: [
      {
        productId: product1.id,
        quantity: 150,
        movementType: StockMovementType.IN,
        reason: 'Initial Vendor Shipment PO-9041',
        createdById: warehouseUser.id,
      },
      {
        productId: product2.id,
        quantity: 50,
        movementType: StockMovementType.IN,
        reason: 'Initial Stock Entry',
        createdById: warehouseUser.id,
      },
      {
        productId: product3.id,
        quantity: 300,
        movementType: StockMovementType.IN,
        reason: 'Bulk Factory Receipt',
        createdById: warehouseUser.id,
      },
    ],
  });

  // 8. Seed Sales Challan (Confirmed & Draft)
  // Challan 1: Confirmed
  const challan1 = await prisma.salesChallan.create({
    data: {
      challanNumber: 'SCH-2026-0001',
      customerId: customer1.id,
      status: ChallanStatus.CONFIRMED,
      totalQuantity: 30,
      totalAmount: 3499.00 * 30,
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: product1.id,
            snapshotName: product1.name,
            snapshotSku: product1.sku,
            snapshotPrice: product1.unitPrice,
            quantity: 30,
            subtotal: 3499.00 * 30,
          },
        ],
      },
    },
  });

  // Log stock out for confirmed challan 1
  await prisma.stockMovementLog.create({
    data: {
      productId: product1.id,
      quantity: 30,
      movementType: StockMovementType.OUT,
      reason: 'Sales Challan Confirmation (SCH-2026-0001)',
      createdById: salesUser.id,
    },
  });

  // Challan 2: Draft
  await prisma.salesChallan.create({
    data: {
      challanNumber: 'SCH-2026-0002',
      customerId: customer2.id,
      status: ChallanStatus.DRAFT,
      totalQuantity: 15,
      totalAmount: (899.00 * 10) + (450.00 * 5),
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: product2.id,
            snapshotName: product2.name,
            snapshotSku: product2.sku,
            snapshotPrice: product2.unitPrice,
            quantity: 10,
            subtotal: 899.00 * 10,
          },
          {
            productId: product3.id,
            snapshotName: product3.name,
            snapshotSku: product3.sku,
            snapshotPrice: product3.unitPrice,
            quantity: 5,
            subtotal: 450.00 * 5,
          },
        ],
      },
    },
  });

  console.log('✅ Sales Challans seeded');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
