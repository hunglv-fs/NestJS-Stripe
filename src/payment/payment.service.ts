import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import { PaymentProviderFactory } from './payment-provider.factory';
import { PaymentMethod } from './interfaces/payment-provider.interface';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private paymentProviderFactory: PaymentProviderFactory,
  ) {}

  async createPaymentIntent(orderId: string, paymentMethod: PaymentMethod = PaymentMethod.STRIPE): Promise<{ client_secret?: string; approval_url?: string }> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const provider = this.paymentProviderFactory.getProvider(paymentMethod);
    const paymentIntent = await provider.createPaymentIntent(
      order.amount,
      order.currency,
      { orderId },
    );

    // Update order with payment method and IDs
    order.paymentProvider = paymentMethod;
    order.paymentIntentId = paymentIntent.id;
    order.paymentMethodId = paymentIntent.id; // Store the provider-specific ID
    order.status = 'PAYMENT_INTENT_CREATED';
    await this.orderRepository.save(order);

    return {
      client_secret: paymentIntent.client_secret,
      approval_url: paymentIntent.approval_url,
    };
  }

  async createCheckoutSession(orderId: string, paymentMethod: PaymentMethod = PaymentMethod.STRIPE): Promise<{ url: string }> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const provider = this.paymentProviderFactory.getProvider(paymentMethod);
    const session = await provider.createCheckoutSession(
      order.amount,
      order.currency,
      orderId,
    );

    // Update order with payment method and IDs
    order.paymentProvider = paymentMethod;
    order.paymentIntentId = session.id;
    order.paymentMethodId = session.id;
    order.status = 'CHECKOUT_SESSION_CREATED';
    await this.orderRepository.save(order);

    return { url: session.url };
  }

  async requestRefund(orderId: string, reason?: string): Promise<{ message: string }> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PAYMENT_SUCCEEDED') {
      throw new Error('Order must be paid to request refund');
    }

    if (!order.paymentMethodId) {
      throw new Error('Cannot refund: No valid payment method ID found');
    }

    const provider = this.paymentProviderFactory.getProvider(order.paymentProvider);

    try {
      const refund = await provider.createRefund(
        order.paymentMethodId,
        order.amount,
        reason,
      );

      order.status = 'REFUND_REQUESTED';
      await this.orderRepository.save(order);

      return { message: 'Refund requested successfully' };
    } catch (err) {
      console.error('Refund creation failed:', err);
      throw new Error(`Refund creation failed: ${err.message}`);
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string, paymentMethod: PaymentMethod = PaymentMethod.STRIPE): Promise<void> {
    const provider = this.paymentProviderFactory.getProvider(paymentMethod);
    const event = provider.verifyWebhook(rawBody, signature);

    // Handle webhook based on payment method
    if (paymentMethod === PaymentMethod.STRIPE) {
      await this.handleStripeWebhook(event);
    } else if (paymentMethod === PaymentMethod.PAYPAL) {
      await this.handlePaypalWebhook(event);
    }
  }

  private async handleStripeWebhook(event: any): Promise<void> {
    if (event.type === 'payment_intent.succeeded') {
      await this.updateOrderStatus(event.data.object.id, 'PAYMENT_SUCCEEDED');
    } else if (event.type === 'payment_intent.payment_failed') {
      await this.updateOrderStatus(event.data.object.id, 'PAYMENT_FAILED');
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata.orderId;
      const paymentIntentId = session.payment_intent;

      await this.orderRepository.update(
        { id: orderId },
        {
          status: 'PAYMENT_SUCCEEDED',
          paymentIntentId: paymentIntentId
        }
      );
    }
  }

  private async handlePaypalWebhook(event: any): Promise<void> {
    // PayPal webhook handling - this would need to be implemented based on PayPal's webhook events
    // For now, we'll leave it as a placeholder
    console.log('PayPal webhook received:', event);
  }

  getAvailablePaymentMethods(): PaymentMethod[] {
    return this.paymentProviderFactory.getAvailableProviders();
  }

  private async updateOrderStatus(paymentIntentId: string, status: string): Promise<void> {
    await this.orderRepository.update(
      { paymentIntentId },
      { status },
    );
  }

  private async updateOrderStatusByOrderId(orderId: string, status: string): Promise<void> {
    await this.orderRepository.update(
      { id: orderId },
      { status },
    );
  }
}
