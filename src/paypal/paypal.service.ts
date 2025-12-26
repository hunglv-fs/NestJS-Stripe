import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentMethod } from '../payment/interfaces/payment-provider.interface';
import { Client, Environment, OrdersController, PaymentsController, CheckoutPaymentIntent } from '@paypal/paypal-server-sdk';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class PaypalService implements PaymentProvider {
  private client: Client;
  private ordersController: OrdersController;
  private paymentsController: PaymentsController;

  constructor(private logger: LoggerService) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    // Validate PayPal credentials
    if (!clientId || !clientSecret) {
      this.logger.warn('PayPal credentials not configured', {
        message: 'Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env',
        service: 'PayPal',
        requiredEnvVars: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET']
      });
    }

    const environment = process.env.NODE_ENV === 'production'
      ? Environment.Production
      : Environment.Sandbox;

    this.client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
      },
      environment: environment,
    });

    this.ordersController = new OrdersController(this.client);
    this.paymentsController = new PaymentsController(this.client);
  }

  getProviderName(): string {
    return PaymentMethod.PAYPAL;
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>): Promise<{
    id: string;
    client_secret?: string;
    approval_url?: string;
  }> {
    const orderRequest = {
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: currency.toUpperCase(),
              value: (amount / 100).toFixed(2), // PayPal expects amount in dollars, not cents
            },
            custom_id: metadata?.orderId,
          },
        ],
        applicationContext: {
          returnUrl: 'http://localhost:3000/payments/paypal/success',
          cancelUrl: 'http://localhost:3000/payments/paypal/cancel',
        },
      },
    };

    try {
      const response = await this.ordersController.createOrder(orderRequest);
      const approvalUrl = response.result.links?.find((link: any) => link.rel === 'approve')?.href;

      return {
        id: response.result.id,
        approval_url: approvalUrl,
      };
    } catch (error) {
      console.error('PayPal order creation failed:', error);
      throw new Error(`PayPal order creation failed: ${error.message}`);
    }
  }

  async createCheckoutSession(amount: number, currency: string, orderId: string): Promise<{
    url: string;
    id: string;
  }> {
    // For PayPal, checkout session is the same as payment intent
    const result = await this.createPaymentIntent(amount, currency, { orderId });
    if (!result.approval_url) {
      throw new Error('Failed to create PayPal approval URL');
    }

    return {
      url: result.approval_url,
      id: result.id,
    };
  }

  async createRefund(paymentId: string, amount?: number, reason?: string): Promise<{
    id: string;
    status: string;
  }> {
    const refundRequest = {
      captureId: paymentId,
      body: {
        amount: amount ? {
          value: (amount / 100).toFixed(2),
          currencyCode: 'USD', // This should be dynamic based on original payment
        } : undefined,
        reason: reason || 'Customer requested refund',
      },
    };

    try {
      const response = await this.paymentsController.refundCapturedPayment(refundRequest);
      return {
        id: response.result.id,
        status: response.result.status,
      };
    } catch (error) {
      console.error('PayPal refund failed:', error);
      throw new Error(`PayPal refund failed: ${error.message}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verifyWebhook(rawBody: Buffer | string, _signature: string): any {
    // PayPal webhook verification is more complex than Stripe
    // For now, we'll implement basic verification
    // In production, you should verify the webhook signature properly
    try {
      const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString());
      return body;
    } catch {
      throw new Error('Invalid webhook payload');
    }
  }

  async capturePayment(orderId: string): Promise<any> {
    const captureRequest = {
      id: orderId,
      body: {},
    };

    try {
      const response = await this.ordersController.captureOrder(captureRequest);
      return response.result;
    } catch (error) {
      console.error('PayPal capture failed:', error);
      throw new Error(`PayPal capture failed: ${error.message}`);
    }
  }

  async createProduct(name: string, description?: string): Promise<{
    id: string;
    name: string;
    description?: string;
  }> {
    // PayPal doesn't have a direct "product" concept like Stripe
    // We'll create a simple product representation for consistency
    // In a real implementation, you might want to store products in PayPal's catalog
    // or just return a placeholder since PayPal handles products inline with orders

    const productId = `paypal_prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: productId,
      name: name,
      description: description,
    };
  }

  async createPrice(productId: string, amount: number, currency: string): Promise<{
    id: string;
    product: string;
    unit_amount: number;
    currency: string;
  }> {
    // PayPal doesn't have separate "price" objects like Stripe
    // Prices are handled inline with orders/purchase units
    // We'll create a placeholder price ID for consistency

    const priceId = `paypal_price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: priceId,
      product: productId,
      unit_amount: amount,
      currency: currency.toUpperCase(),
    };
  }
}
