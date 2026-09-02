import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const { search, type, status, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
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

    if (type) {
      where.customerType = type;
    }

    if (status) {
      where.status = status;
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
      data: customers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response) => {
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
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json({ customer });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching customer details', error: error.message });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      mobile,
      email,
      businessName,
      gstNumber,
      customerType,
      type,
      address,
      status = 'LEAD',
      followUpDate,
      notes,
    } = req.body;

    if (!name || !mobile || !businessName || !address) {
      return res.status(400).json({ message: 'Name, mobile, business name, and address are required.' });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        mobile,
        email: email || null,
        businessName,
        gstNumber: gstNumber || null,
        customerType: customerType || type || 'RETAIL',
        address,
        status,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes || null,
      },
    });

    return res.status(201).json({ message: 'Customer created successfully', customer });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error creating customer', error: error.message });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      mobile,
      email,
      businessName,
      gstNumber,
      customerType,
      type,
      address,
      status,
      followUpDate,
      notes,
    } = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const cType = customerType || type;

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(mobile !== undefined && { mobile }),
        ...(email !== undefined && { email: email || null }),
        ...(businessName !== undefined && { businessName }),
        ...(gstNumber !== undefined && { gstNumber: gstNumber || null }),
        ...(cType !== undefined && { customerType: cType }),
        ...(address !== undefined && { address }),
        ...(status !== undefined && { status }),
        ...(followUpDate !== undefined && { followUpDate: followUpDate ? new Date(followUpDate) : null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return res.json({ message: 'Customer updated successfully', customer: updatedCustomer });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating customer', error: error.message });
  }
};

export const addFollowUpNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { note, nextFollowUpDate } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ message: 'Follow-up note content is required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
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

    return res.status(201).json({ message: 'Follow-up note added', followUpNote });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error adding follow-up note', error: error.message });
  }
};
