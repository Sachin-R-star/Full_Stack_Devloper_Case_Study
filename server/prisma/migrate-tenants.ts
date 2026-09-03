import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function migrateExistingRecordsToDefaultOrganization() {
  console.log('🔄 Checking default Organization migration...');

  try {
    // 1. Ensure default Organization exists
    let defaultOrg = await prisma.organization.findFirst({
      where: { name: 'Acme Corp' },
    });

    if (!defaultOrg) {
      defaultOrg = await prisma.organization.create({
        data: {
          name: 'Acme Corp',
        },
      });
      console.log(`✅ Default Organization created: Acme Corp (${defaultOrg.id})`);
    } else {
      console.log(`ℹ️ Existing Default Organization found: Acme Corp (${defaultOrg.id})`);
    }

    const orgId = defaultOrg.id;

    // 2. Update unassigned Users
    const updatedUsers = await prisma.user.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId },
    });
    console.log(`✅ Migrated ${updatedUsers.count} Users to Organization '${defaultOrg.name}'`);

    // 3. Update unassigned Customers
    const updatedCustomers = await prisma.customer.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId },
    });
    console.log(`✅ Migrated ${updatedCustomers.count} Customers to Organization '${defaultOrg.name}'`);

    // 4. Update unassigned FollowUpNotes
    const updatedFollowUps = await prisma.followUpNote.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId },
    });
    console.log(`✅ Migrated ${updatedFollowUps.count} FollowUpNotes to Organization '${defaultOrg.name}'`);

    // 5. Update unassigned Products
    const updatedProducts = await prisma.product.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId },
    });
    console.log(`✅ Migrated ${updatedProducts.count} Products to Organization '${defaultOrg.name}'`);

    // 6. Update unassigned StockMovements
    const updatedMovements = await prisma.stockMovement.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId },
    });
    console.log(`✅ Migrated ${updatedMovements.count} StockMovements to Organization '${defaultOrg.name}'`);

    // 7. Update unassigned Challans
    const updatedChallans = await prisma.challan.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId },
    });
    console.log(`✅ Migrated ${updatedChallans.count} Challans to Organization '${defaultOrg.name}'`);

    console.log('🎉 Data migration completed successfully with zero data loss!\n');
    return defaultOrg;
  } catch (error) {
    console.error('❌ Migration script error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  migrateExistingRecordsToDefaultOrganization();
}
