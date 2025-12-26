import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentProvider, PaymentMethod } from '../payment/interfaces/payment-provider.interface';

@Injectable()
export class StripeService implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  getProviderName(): string {
    return PaymentMethod.STRIPE;
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>): Promise<{
    id: string;
    client_secret?: string;
    approval_url?: string;
  }> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
    });

    return {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
    };
  }

  async createCheckoutSession(amount: number, currency: string, orderId: string): Promise<{
    url: string;
    id: string;
  }> {
    const session = await this.stripe.checkout.sessions.create({
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

    return {
      url: session.url,
      id: session.id,
    };
  }

  async createRefund(paymentId: string, amount?: number, reason?: string): Promise<{
    id: string;
    status: string;
  }> {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentId,
      amount,
      reason: reason ? (reason as Stripe.RefundCreateParams.Reason) : 'requested_by_customer',
    });

    return {
      id: refund.id,
      status: refund.status,
    };
  }

  verifyWebhook(rawBody: Buffer | string, signature: string): any {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  async createProduct(name: string, description?: string): Promise<{
    id: string;
    name: string;
    description?: string;
  }> {
    const product = await this.stripe.products.create({
      name,
      description,
    });

    return {
      id: product.id,
      name: product.name,
      description: product.description,
    };
  }

  async createPrice(productId: string, amount: number, currency: string): Promise<{
    id: string;
    product: string;
    unit_amount: number;
    currency: string;
  }> {
    const price = await this.stripe.prices.create({
      product: productId,
      unit_amount: amount,
      currency,
    });

    return {
      id: price.id,
      product: typeof price.product === 'string' ? price.product : price.product.id,
      unit_amount: price.unit_amount,
      currency: price.currency,
    };
  }

  async createCustomer(name: string, email: string, phone?: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      name,
      email,
      phone,
    });
  }
}
