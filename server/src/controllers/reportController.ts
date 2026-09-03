import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const getDashboardSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const organizationId = req.user.organizationId;
    const orgWhere = { organizationId };

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
      prisma.customer.count({ where: orgWhere }),
      prisma.customer.count({ where: { ...orgWhere, status: 'LEAD' } }),
      prisma.customer.count({ where: { ...orgWhere, status: 'ACTIVE' } }),
      prisma.product.count({ where: orgWhere }),
      prisma.product.findMany({
        where: orgWhere,
        select: { id: true, currentStock: true, minimumStock: true },
      }),
      prisma.challan.count({ where: orgWhere }),
      prisma.challan.count({ where: { ...orgWhere, status: 'DRAFT' } }),
      prisma.challan.count({ where: { ...orgWhere, status: 'CONFIRMED' } }),
      prisma.stockMovement.findMany({
        where: orgWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          createdBy: { select: { name: true } },
        },
      }),
    ]);

    const lowStockCount = allProducts.filter((p) => p.currentStock <= p.minimumStock).length;

    const confirmedTotalSum = await prisma.challan.aggregate({
      where: { ...orgWhere, status: 'CONFIRMED' },
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
    next(error);
  }
};
