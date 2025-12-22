import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, string>): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
    });
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string, webhookSecret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  async createCheckoutSession(amount: number, currency: string, orderId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: 'Fake Order' },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: 'http://localhost:3000/payments/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/payments/cancel',
      metadata: {
        orderId,
      },
    });
  }

  async createRefund(paymentIntentId: string, amount: number, reason?: string): Promise<Stripe.Refund> {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason: 'requested_by_customer' as Stripe.RefundCreateParams.Reason,
    });
  }
}