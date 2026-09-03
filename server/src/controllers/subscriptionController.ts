import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/db';
import { SubscriptionService, PLAN_LIMITS, PlanTier } from '../services/subscriptionService';
import { PaymentService } from '../services/paymentService';

export const getSubscriptionDetails = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const subscription = await SubscriptionService.getOrCreateSubscription(organizationId);
    const usage = await SubscriptionService.getSubscriptionUsage(organizationId);
    const plan = (subscription.plan as PlanTier) || 'FREE';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

    return res.status(200).json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        renewalDate: subscription.renewalDate,
        trialEndsAt: subscription.trialEndsAt,
        externalSubscriptionId: subscription.externalSubscriptionId,
        lastPaymentId: subscription.lastPaymentId,
        lastPaymentStatus: subscription.lastPaymentStatus,
      },
      limits,
      usage,
    });
  } catch (error: any) {
    console.error('Error fetching subscription details:', error);
    return res.status(500).json({ message: 'Internal server error fetching subscription' });
  }
};

export const updateSubscriptionPlan = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Only ADMIN users can manage subscription plans' });
    }

    const { plan } = req.body;
    if (!plan || !['FREE', 'PRO', 'BUSINESS'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan choice. Must be FREE, PRO, or BUSINESS' });
    }

    const updated = await prisma.subscription.upsert({
      where: { organizationId },
      update: {
        plan,
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        plan,
        status: 'ACTIVE',
      },
    });

    const usage = await SubscriptionService.getSubscriptionUsage(organizationId);
    const limits = PLAN_LIMITS[plan as PlanTier];

    return res.status(200).json({
      message: `Subscription successfully updated to ${plan} plan`,
      subscription: updated,
      limits,
      usage,
    });
  } catch (error: any) {
    console.error('Error updating subscription plan:', error);
    return res.status(500).json({ message: 'Internal server error updating subscription plan' });
  }
};

export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Only ADMIN users can initiate plan checkout' });
    }

    const { plan } = req.body;
    if (!plan || !['PRO', 'BUSINESS'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan choice for checkout. Must be PRO or BUSINESS.' });
    }

    const order = await PaymentService.createCheckoutOrder(organizationId, plan);
    return res.status(200).json({
      status: 'success',
      order,
    });
  } catch (error: any) {
    console.error('Error creating checkout order:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error creating checkout session' });
  }
};

export const verifyCheckoutPayment = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { orderId, paymentId, signature, plan } = req.body;
    if (!orderId || !paymentId || !signature || !plan) {
      return res.status(400).json({ message: 'Missing required payment verification parameters (orderId, paymentId, signature, plan)' });
    }

    const result = await PaymentService.verifyPaymentAndActivate(
      organizationId,
      orderId,
      paymentId,
      signature,
      plan
    );

    return res.status(200).json({
      status: 'success',
      message: `Payment verified! Subscription upgraded to ${plan}.`,
      subscription: result.subscription,
      invoice: result.invoice,
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return res.status(error.statusCode || 400).json({ message: error.message || 'Payment signature verification failed' });
  }
};

export const getSubscriptionInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const invoices = await PaymentService.getOrganizationInvoices(organizationId);
    return res.status(200).json({
      status: 'success',
      invoices,
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({ message: 'Error fetching billing invoices' });
  }
};
