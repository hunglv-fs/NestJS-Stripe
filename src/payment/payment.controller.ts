import { Controller, Post, Req, Headers, HttpCode, Body, Get, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { RequestRefundDto } from './dto/request-refund.dto';
import { Request } from 'express';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentService.createPaymentIntent(dto.orderId);
  }

  @Post('create-checkout-session')
  async createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.paymentService.createCheckoutSession(dto.orderId);
  }

  @Post('request-refund')
  async requestRefund(@Body() dto: RequestRefundDto) {
    return this.paymentService.requestRefund(dto.orderId, dto.reason);
  }

  @Get('success')
  async paymentSuccess(@Query('session_id') sessionId: string) {
    return { message: 'Payment successful', sessionId };
  }

  @Get('cancel')
  async paymentCancel() {
    return { message: 'Payment cancelled' };
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<void> {
    await this.paymentService.handleWebhook(req.body, signature);
  }
}