import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';
import { CustomerType, CustomerStatus } from '@prisma/client';

export const getCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, customerType, status, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      const query = (search as string).trim();
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { businessName: { contains: query, mode: 'insensitive' } },
        { mobile: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (customerType) {
      where.customerType = customerType as CustomerType;
    }

    if (status) {
      where.status = status as CustomerStatus;
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { followUps: true, challans: true },
          },
        },
      }),
    ]);

    return res.json({
      status: 'success',
      data: customers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUps: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        challans: {
          select: {
            id: true,
            challanNumber: true,
            status: true,
            totalQuantity: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return next(new AppError('Customer record not found', 404));
    }

    return res.json({ status: 'success', customer });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      mobile,
      email,
      businessName,
      gstNumber,
      customerType = 'RETAIL',
      address,
      status = 'LEAD',
      followUpDate,
      notes,
    } = req.body;

    const customer = await prisma.customer.create({
      data: {
        name,
        mobile,
        email: email || null,
        businessName,
        gstNumber: gstNumber || null,
        customerType: customerType as CustomerType,
        address,
        status: status as CustomerStatus,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes || null,
      },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Customer created successfully',
      customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError('Customer record not found', 404));
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.followUpDate !== undefined && {
          followUpDate: updateData.followUpDate ? new Date(updateData.followUpDate) : null,
        }),
      },
    });

    return res.json({
      status: 'success',
      message: 'Customer updated successfully',
      customer: updatedCustomer,
    });
  } catch (error) {
    next(error);
  }
};

export const addFollowUpNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { note, nextFollowUpDate } = req.body;

    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return next(new AppError('Customer record not found', 404));
    }

    const [followUpNote] = await prisma.$transaction([
      prisma.followUpNote.create({
        data: {
          customerId: id,
          userId: req.user.id,
          note: note.trim(),
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.customer.update({
        where: { id },
        data: {
          ...(nextFollowUpDate && { followUpDate: new Date(nextFollowUpDate) }),
          updatedAt: new Date(),
        },
      }),
    ]);

    return res.status(201).json({
      status: 'success',
      message: 'Follow-up note logged successfully',
      followUpNote,
    });
  } catch (error) {
    next(error);
  }
};
