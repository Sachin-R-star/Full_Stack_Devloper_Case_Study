import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth';

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalCustomers,
      leadCustomers,
      activeCustomers,
      totalProducts,
      allProducts,
      totalChallans,
      draftChallans,
      confirmedChallans,
      recentMovements,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'LEAD' } }),
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count(),
      prisma.product.findMany({ select: { id: true, currentStock: true, minStockAlertQty: true } }),
      prisma.salesChallan.count(),
      prisma.salesChallan.count({ where: { status: 'DRAFT' } }),
      prisma.salesChallan.count({ where: { status: 'CONFIRMED' } }),
      prisma.stockMovementLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          createdBy: { select: { name: true } },
        },
      }),
    ]);

    const lowStockCount = allProducts.filter((p) => p.currentStock <= p.minStockAlertQty).length;

    // Calculate total confirmed revenue
    const confirmedTotalSum = await prisma.salesChallan.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { totalAmount: true },
    });

    return res.json({
      summary: {
        customers: {
          total: totalCustomers,
          lead: leadCustomers,
          active: activeCustomers,
        },
        inventory: {
          totalProducts,
          lowStockCount,
        },
        challans: {
          total: totalChallans,
          draft: draftChallans,
          confirmed: confirmedChallans,
          totalRevenue: confirmedTotalSum._sum.totalAmount || 0,
        },
        recentMovements,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching dashboard summary', error: error.message });
  }
};
