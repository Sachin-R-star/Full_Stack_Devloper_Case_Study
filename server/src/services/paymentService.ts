import crypto from 'crypto';
import { prisma } from '../config/db';
import { SubscriptionService, PlanTier } from './subscriptionService';

const KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_AntigravityDemo2026';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_AntigravityDemo2026KeySecret';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_AntigravityDemo2026WebhookSecret';

export interface CheckoutOrderResponse {
  orderId: string;
  amount: number; // in paise
  amountRupees: number;
  currency: string;
  keyId: string;
  plan: PlanTier;
}

export class PaymentService {
  /**
   * Generates a signed payment checkout order from the backend
   */
  static async createCheckoutOrder(
    organizationId: string,
    plan: PlanTier
  ): Promise<CheckoutOrderResponse> {
    if (plan === 'FREE') {
      const err: any = new Error('Cannot checkout for FREE tier. Use downgrade API instead.');
      err.statusCode = 400;
      throw err;
    }

    const priceMap: Record<string, number> = {
      PRO: 1999,
      BUSINESS: 4999,
    };

    const priceRupees = priceMap[plan] || 1999;
    const amountPaise = priceRupees * 100;
    const orderId = `order_${crypto.randomBytes(12).toString('hex')}`;

    // Store transient external checkout intent on organization's subscription
    await prisma.subscription.upsert({
      where: { organizationId },
      update: {
        lastPaymentStatus: 'PENDING_CHECKOUT',
      },
      create: {
        organizationId,
        plan: 'FREE',
        status: 'ACTIVE',
        lastPaymentStatus: 'PENDING_CHECKOUT',
      },
    });

    return {
      orderId,
      amount: amountPaise,
      amountRupees: priceRupees,
      currency: 'INR',
      keyId: KEY_ID,
      plan,
    };
  }

  /**
   * Verifies payment HMAC signature and activates subscription upon checkout success
   */
  static async verifyPaymentAndActivate(
    organizationId: string,
    orderId: string,
    paymentId: string,
    signature: string,
    plan: PlanTier
  ) {
    // Generate expected HMAC SHA-256 signature
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(text)
      .digest('hex');

    // Perform constant-time string comparison or strict equality
    const isValid = signature === expectedSignature;

    if (!isValid) {
      const err: any = new Error('Invalid payment signature verification failed. Untrusted request.');
      err.statusCode = 400;
      throw err;
    }

    // Atomic database update for verified payment success
    const priceMap: Record<string, number> = { PRO: 1999, BUSINESS: 4999 };
    const amountRupees = priceMap[plan] || 1999;

    const [subscription, invoice] = await prisma.$transaction([
      prisma.subscription.upsert({
        where: { organizationId },
        update: {
          plan,
          status: 'ACTIVE',
          lastPaymentId: paymentId,
          lastPaymentStatus: 'PAID',
          externalSubscriptionId: orderId,
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days renewal
          updatedAt: new Date(),
        },
        create: {
          organizationId,
          plan,
          status: 'ACTIVE',
          lastPaymentId: paymentId,
          lastPaymentStatus: 'PAID',
          externalSubscriptionId: orderId,
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.invoice.create({
        data: {
          organizationId,
          amount: amountRupees,
          currency: 'INR',
          status: 'PAID',
          plan,
          paymentId,
          orderId,
          receiptUrl: `https://nexus-erp.saas/invoices/inv_${paymentId.substring(0, 10)}`,
        },
      }),
    ]);

    return {
      success: true,
      subscription,
      invoice,
    };
  }

  /**
   * Validates Razorpay Webhook HMAC-SHA256 signature header
   */
  static verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature) return false;
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Idempotently processes webhook events
   */
  static async processWebhookEvent(eventId: string, eventType: string, payload: any) {
    // 1. Idempotency Check
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      return { alreadyProcessed: true, event: existingEvent };
    }

    // Record Event for Idempotency
    const webhookRecord = await prisma.webhookEvent.create({
      data: {
        eventId,
        eventType,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      },
    });

    // 2. Process Event
    const orgId = payload?.organizationId || payload?.notes?.organizationId;
    const plan = (payload?.plan || payload?.notes?.plan || 'PRO') as PlanTier;

    if (orgId) {
      if (['payment.captured', 'order.paid', 'subscription.activated'].includes(eventType)) {
        await prisma.subscription.upsert({
          where: { organizationId: orgId },
          update: {
            plan,
            status: 'ACTIVE',
            lastPaymentStatus: 'PAID',
            lastPaymentId: payload?.id || payload?.paymentId || 'pay_wh_' + eventId.substring(0, 8),
            updatedAt: new Date(),
          },
          create: {
            organizationId: orgId,
            plan,
            status: 'ACTIVE',
            lastPaymentStatus: 'PAID',
            lastPaymentId: payload?.id || payload?.paymentId || 'pay_wh_' + eventId.substring(0, 8),
          },
        });

        // Add Invoice record if organizationId present
        await prisma.invoice.create({
          data: {
            organizationId: orgId,
            amount: payload?.amount ? payload.amount / 100 : 1999,
            currency: 'INR',
            status: 'PAID',
            plan,
            paymentId: payload?.id || payload?.paymentId || 'pay_wh_' + eventId.substring(0, 8),
            orderId: payload?.orderId || 'ord_wh_' + eventId.substring(0, 8),
          },
        });
      } else if (['payment.failed', 'subscription.charged_failed'].includes(eventType)) {
        await prisma.subscription.updateMany({
          where: { organizationId: orgId },
          data: {
            status: 'PAST_DUE',
            lastPaymentStatus: 'FAILED',
            updatedAt: new Date(),
          },
        });
      } else if (['subscription.cancelled', 'subscription.completed'].includes(eventType)) {
        await prisma.subscription.updateMany({
          where: { organizationId: orgId },
          data: {
            status: 'CANCELED',
            updatedAt: new Date(),
          },
        });
      }
    }

    return { alreadyProcessed: false, event: webhookRecord };
  }

  /**
   * Retrieves billing invoices / payment history for an organization
   */
  static async getOrganizationInvoices(organizationId: string) {
    return prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { paidAt: 'desc' },
    });
  }
}
