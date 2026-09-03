import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';
import { UpdateOrganizationInput } from '../schemas/organization.schema';

export const getMyOrganization = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            products: true,
            challans: true,
          },
        },
      },
    });

    if (!organization) {
      return next(new AppError('Organization not found', 404));
    }

    return res.json({
      status: 'success',
      organization,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyOrganization = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { name } = req.body as UpdateOrganizationInput;

    const organization = await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: {
        name: name.trim(),
      },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            products: true,
            challans: true,
          },
        },
      },
    });

    return res.json({
      status: 'success',
      message: 'Organization workspace details updated successfully',
      organization,
    });
  } catch (error) {
    next(error);
  }
};
