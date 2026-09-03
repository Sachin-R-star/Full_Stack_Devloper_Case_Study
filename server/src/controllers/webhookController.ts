import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Verify Webhook Signature if signature header is provided
    if (signature) {
      const isValid = PaymentService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        return res.status(400).json({ status: 'error', message: 'Invalid webhook signature' });
      }
    }

    const payload = req.body || {};
    const eventId = payload.event_id || payload.id || `evt_${Date.now()}`;
    const eventType = payload.event || 'payment.captured';
    const eventData = payload.payload?.payment?.entity || payload.entity || payload;

    const result = await PaymentService.processWebhookEvent(eventId, eventType, eventData);

    return res.status(200).json({
      status: 'success',
      received: true,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ status: 'error', message: 'Webhook processing failed' });
  }
};
