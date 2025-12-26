import { Controller, Post, Req, Headers, HttpCode, Body, Get, Query, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { RequestRefundDto } from './dto/request-refund.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentMethod } from './interfaces/payment-provider.interface';

// Using permission-based access for now
// TODO: Replace with proper permission guards when implemented
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    // TODO: Add permission check for 'payment:create'
    const paymentMethod = dto.paymentMethod || PaymentMethod.STRIPE;
    return this.paymentService.createPaymentIntent(dto.orderId, paymentMethod);
  }

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    // TODO: Add permission check for 'payment:create'
    const paymentMethod = dto.paymentMethod || PaymentMethod.STRIPE;
    return this.paymentService.createCheckoutSession(dto.orderId, paymentMethod);
  }

  @Post('request-refund')
  @UseGuards(JwtAuthGuard)
  async requestRefund(@Body() dto: RequestRefundDto) {
    // TODO: Add permission check for 'payment:refund'
    return this.paymentService.requestRefund(dto.orderId, dto.reason);
  }

  @Get('methods')
  @UseGuards(JwtAuthGuard)
  async getAvailablePaymentMethods() {
    return {
      methods: this.paymentService.getAvailablePaymentMethods()
    };
  }

  @Get('success')
  @UseGuards(JwtAuthGuard)
  async paymentSuccess(@Query('session_id') sessionId: string) {
    return { message: 'Payment successful', sessionId };
  }

  @Get('cancel')
  @UseGuards(JwtAuthGuard)
  async paymentCancel() {
    return { message: 'Payment cancelled' };
  }

  @Post('webhook/stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<void> {
    await this.paymentService.handleWebhook(req.body, signature, PaymentMethod.STRIPE);
  }

  @Post('webhook/paypal')
  @HttpCode(200)
  async handlePaypalWebhook(
    @Req() req: Request,
    @Headers('paypal-signature') signature: string,
  ): Promise<void> {
    await this.paymentService.handleWebhook(req.body, signature, PaymentMethod.PAYPAL);
  }

  @Get('paypal/success')
  @UseGuards(JwtAuthGuard)
  async paypalPaymentSuccess(@Query('token') token: string, @Query('PayerID') payerId: string) {
    return { message: 'PayPal payment successful', token, payerId };
  }

  @Get('paypal/cancel')
  @UseGuards(JwtAuthGuard)
  async paypalPaymentCancel() {
    return { message: 'PayPal payment cancelled' };
  }
}
