import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';
import { SubscriptionService } from '../services/subscriptionService';
import {
  InviteUserInput,
  UpdateMemberRoleInput,
  AcceptInvitationInput,
} from '../schemas/team.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const getTeamMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const organizationId = req.user.organizationId;

    const [members, pendingInvitations] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.invitation.findMany({
        where: {
          organizationId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          expiresAt: true,
          invitedBy: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      status: 'success',
      members,
      pendingInvitations,
    });
  } catch (error) {
    next(error);
  }
};

export const createInvitation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const organizationId = req.user.organizationId;
    
    // Enforce Plan Entitlement Limits
    await SubscriptionService.assertCanCreateUser(organizationId);

    const { email, role } = req.body as InviteUserInput;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return next(new AppError(`User with email '${normalizedEmail}' already has an active account.`, 400));
    }

    // Clean up previous pending invitations for this email in this org if any
    await prisma.invitation.deleteMany({
      where: {
        organizationId,
        email: normalizedEmail,
        acceptedAt: null,
      },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const invitation = await prisma.invitation.create({
      data: {
        organizationId,
        email: normalizedEmail,
        role,
        tokenHash,
        expiresAt,
        invitedById: req.user.id,
      },
    });

    return res.status(201).json({
      status: 'success',
      message: `Invitation issued for ${normalizedEmail}`,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        rawToken, // Provided once to admin so link can be copied/sent
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { role } = req.body as UpdateMemberRoleInput;

    if (id === req.user.id) {
      return next(new AppError('You cannot modify your own role.', 400));
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId },
    });
    if (!targetUser) {
      return next(new AppError('Team member not found in your organization.', 404));
    }

    // Last-Admin Protection
    if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { organizationId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return next(
          new AppError('Action denied: Cannot demote the last remaining ADMIN user of this organization.', 400)
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return res.json({
      status: 'success',
      message: `Role for ${updatedUser.name} updated to ${updatedUser.role}`,
      member: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const organizationId = req.user.organizationId;

    if (id === req.user.id) {
      return next(new AppError('You cannot remove yourself from the organization.', 400));
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId },
    });
    if (!targetUser) {
      return next(new AppError('Team member not found in your organization.', 404));
    }

    // Last-Admin Protection
    if (targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { organizationId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return next(
          new AppError('Action denied: Cannot delete the last remaining ADMIN user of this organization.', 400)
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    return res.json({
      status: 'success',
      message: `Member ${targetUser.name} removed from organization.`,
    });
  } catch (error) {
    next(error);
  }
};

export const revokeInvitation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const invitation = await prisma.invitation.findFirst({
      where: { id, organizationId },
    });
    if (!invitation) {
      return next(new AppError('Invitation record not found.', 404));
    }

    await prisma.invitation.delete({ where: { id } });

    return res.json({
      status: 'success',
      message: `Invitation for ${invitation.email} revoked.`,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvitationByToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invitation = await prisma.invitation.findFirst({
      where: {
        tokenHash,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    if (!invitation) {
      return next(new AppError('Invalid or expired invitation token.', 404));
    }

    return res.json({
      status: 'success',
      invitation: {
        email: invitation.email,
        role: invitation.role,
        organizationName: invitation.organization.name,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const acceptInvitation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token, name, password } = req.body as AcceptInvitationInput;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findFirst({
        where: {
          tokenHash,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { organization: true },
      });

      if (!invitation) {
        throw new AppError('Invalid or expired invitation token.', 404);
      }

      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email },
      });
      if (existingUser) {
        throw new AppError('An account with this email address already exists.', 400);
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await tx.user.create({
        data: {
          organizationId: invitation.organizationId,
          name: name.trim(),
          email: invitation.email,
          passwordHash,
          role: invitation.role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      const authToken = jwt.sign(
        {
          id: user.id,
          organizationId: user.organizationId,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return { user, authToken, organizationName: invitation.organization.name };
    });

    return res.status(201).json({
      status: 'success',
      message: `Welcome to ${result.organizationName}! Account created successfully.`,
      token: result.authToken,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};
