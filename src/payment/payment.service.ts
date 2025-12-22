import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private stripeService: StripeService,
  ) {}

  async createPaymentIntent(orderId: string): Promise<{ client_secret: string }> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const paymentIntent = await this.stripeService.createPaymentIntent(
      order.amount,
      order.currency,
      { orderId },
    );

    order.paymentIntentId = paymentIntent.id;
    order.status = 'PAYMENT_INTENT_CREATED';
    await this.orderRepository.save(order);

    return { client_secret: paymentIntent.client_secret };
  }

  async createCheckoutSession(orderId: string): Promise<{ url: string }> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const session = await this.stripeService.createCheckoutSession(
      order.amount,
      order.currency,
      orderId,
    );

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

    // Nếu không có paymentIntentId hoặc là fake ID, không thể refund
    if (!order.paymentIntentId || order.paymentIntentId.startsWith('pi_' + orderId.substring(0, 8))) {
      throw new Error('Cannot refund: No valid payment intent found');
    }

    try {
      const refund = await this.stripeService.createRefund(
        order.paymentIntentId,
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

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const event = this.stripeService.verifyWebhookSignature(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    if (event.type === 'payment_intent.succeeded') {
      await this.updateOrderStatus(event.data.object.id, 'PAYMENT_SUCCEEDED');
    } else if (event.type === 'payment_intent.payment_failed') {
      await this.updateOrderStatus(event.data.object.id, 'PAYMENT_FAILED');
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      // Lấy PaymentIntent ID thật từ session và cập nhật vào order
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