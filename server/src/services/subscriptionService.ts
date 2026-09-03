import { prisma } from '../config/db';

export type PlanTier = 'FREE' | 'PRO' | 'BUSINESS';

export interface PlanLimits {
  maxUsers: number;
  maxCustomers: number;
  maxProducts: number;
  maxChallansMonth: number;
  advancedReports: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    maxUsers: 2,
    maxCustomers: 10,
    maxProducts: 20,
    maxChallansMonth: 50,
    advancedReports: false,
  },
  PRO: {
    maxUsers: 10,
    maxCustomers: 250,
    maxProducts: 500,
    maxChallansMonth: 1000,
    advancedReports: true,
  },
  BUSINESS: {
    maxUsers: 100,
    maxCustomers: 10000,
    maxProducts: 50000,
    maxChallansMonth: 100000,
    advancedReports: true,
  },
};

export class SubscriptionService {
  /**
   * Retrieves or auto-creates a default FREE subscription for an organization
   */
  static async getOrCreateSubscription(organizationId: string) {
    let subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          organizationId,
          plan: 'FREE',
          status: 'ACTIVE',
          startDate: new Date(),
        },
      });
    }

    return subscription;
  }

  /**
   * Calculates current real-time usage for an organization
   */
  static async getSubscriptionUsage(organizationId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [userCount, pendingInviteCount, customerCount, productCount, monthlyChallanCount] =
      await Promise.all([
        prisma.user.count({ where: { organizationId } }),
        prisma.invitation.count({
          where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
        }),
        prisma.customer.count({ where: { organizationId } }),
        prisma.product.count({ where: { organizationId } }),
        prisma.challan.count({
          where: {
            organizationId,
            createdAt: { gte: startOfMonth },
          },
        }),
      ]);

    const activeTeamTotal = userCount + pendingInviteCount;

    return {
      users: activeTeamTotal,
      activeUsersOnly: userCount,
      pendingInvitations: pendingInviteCount,
      customers: customerCount,
      products: productCount,
      monthlyChallans: monthlyChallanCount,
    };
  }

  /**
   * Checks whether an organization can perform an action based on plan limits
   */
  static async checkEntitlement(
    organizationId: string,
    feature: keyof PlanLimits
  ): Promise<{ allowed: boolean; current: number | boolean; limit: number | boolean; plan: PlanTier }> {
    const subscription = await this.getOrCreateSubscription(organizationId);
    const plan = (subscription.plan as PlanTier) || 'FREE';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

    const usage = await this.getSubscriptionUsage(organizationId);

    if (feature === 'maxUsers') {
      const allowed = usage.users < limits.maxUsers;
      return { allowed, current: usage.users, limit: limits.maxUsers, plan };
    }

    if (feature === 'maxCustomers') {
      const allowed = usage.customers < limits.maxCustomers;
      return { allowed, current: usage.customers, limit: limits.maxCustomers, plan };
    }

    if (feature === 'maxProducts') {
      const allowed = usage.products < limits.maxProducts;
      return { allowed, current: usage.products, limit: limits.maxProducts, plan };
    }

    if (feature === 'maxChallansMonth') {
      const allowed = usage.monthlyChallans < limits.maxChallansMonth;
      return { allowed, current: usage.monthlyChallans, limit: limits.maxChallansMonth, plan };
    }

    if (feature === 'advancedReports') {
      return {
        allowed: limits.advancedReports,
        current: limits.advancedReports,
        limit: limits.advancedReports,
        plan,
      };
    }

    return { allowed: true, current: 0, limit: 0, plan };
  }

  /**
   * Asserts user creation limit. Throws Error if limit reached.
   */
  static async assertCanCreateUser(organizationId: string) {
    const check = await this.checkEntitlement(organizationId, 'maxUsers');
    if (!check.allowed) {
      const err: any = new Error(
        `Plan limit reached. Your ${check.plan} plan allows up to ${check.limit} team members. Please upgrade your subscription.`
      );
      err.statusCode = 403;
      throw err;
    }
  }

  /**
   * Asserts customer creation limit. Throws Error if limit reached.
   */
  static async assertCanCreateCustomer(organizationId: string) {
    const check = await this.checkEntitlement(organizationId, 'maxCustomers');
    if (!check.allowed) {
      const err: any = new Error(
        `Plan limit reached. Your ${check.plan} plan allows up to ${check.limit} customers. Please upgrade your subscription.`
      );
      err.statusCode = 403;
      throw err;
    }
  }

  /**
   * Asserts product creation limit. Throws Error if limit reached.
   */
  static async assertCanCreateProduct(organizationId: string) {
    const check = await this.checkEntitlement(organizationId, 'maxProducts');
    if (!check.allowed) {
      const err: any = new Error(
        `Plan limit reached. Your ${check.plan} plan allows up to ${check.limit} catalog products. Please upgrade your subscription.`
      );
      err.statusCode = 403;
      throw err;
    }
  }

  /**
   * Asserts monthly challan limit. Throws Error if limit reached.
   */
  static async assertCanCreateChallan(organizationId: string) {
    const check = await this.checkEntitlement(organizationId, 'maxChallansMonth');
    if (!check.allowed) {
      const err: any = new Error(
        `Monthly challan quota reached. Your ${check.plan} plan allows up to ${check.limit} sales challans per month. Please upgrade your subscription.`
      );
      err.statusCode = 403;
      throw err;
    }
  }
}
