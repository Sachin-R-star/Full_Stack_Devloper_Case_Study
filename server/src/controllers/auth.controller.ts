import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';
import { LoginInput, RegisterInput } from '../schemas/auth.schema';

export const register = async (
  req: Request<{}, {}, RegisterInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, companyName, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return next(new AppError('An account with this email address already exists.', 400));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { organization, user } = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: companyName.trim(),
        },
      });

      const newUser = await tx.user.create({
        data: {
          organizationId: org.id,
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: 'ADMIN', // Public registration ALWAYS assigns ADMIN role to owner
        },
      });

      return { organization: org, user: newUser };
    });

    const payload = {
      id: user.id,
      organizationId: organization.id,
      email: user.email,
      name: user.name,
      role: 'ADMIN' as const,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });

    return res.status(201).json({
      status: 'success',
      message: 'Organization and Admin account created successfully',
      token,
      user: {
        id: user.id,
        organizationId: organization.id,
        name: user.name,
        email: user.email,
        role: 'ADMIN',
        organizationName: organization.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request<{}, {}, LoginInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return next(new AppError('Invalid email or password credentials.', 401));
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return next(new AppError('Invalid email or password credentials.', 401));
    }

    const payload = {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });

    return res.json({
      status: 'success',
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        organizationId: user.organizationId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return next(new AppError('User profile not found', 404));
    }

    return res.json({
      status: 'success',
      user,
    });
  } catch (error) {
    next(error);
  }
};
