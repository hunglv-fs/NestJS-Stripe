import { Controller, Post, Req, Headers, HttpCode, Body, Get, Query, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { RequestRefundDto } from './dto/request-refund.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Using permission-based access for now
// TODO: Replace with proper permission guards when implemented
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    // TODO: Add permission check for 'payment:create'
    return this.paymentService.createPaymentIntent(dto.orderId);
  }

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    // TODO: Add permission check for 'payment:create'
    return this.paymentService.createCheckoutSession(dto.orderId);
  }

  @Post('request-refund')
  @UseGuards(JwtAuthGuard)
  async requestRefund(@Body() dto: RequestRefundDto) {
    // TODO: Add permission check for 'payment:refund'
    return this.paymentService.requestRefund(dto.orderId, dto.reason);
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

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<void> {
    await this.paymentService.handleWebhook(req.body, signature);
  }
}
