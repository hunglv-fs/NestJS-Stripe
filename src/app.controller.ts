import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHome() {
    return {
      name: 'NestJS Stripe Payment System',
      version: '0.0.1',
      description: 'A payment processing system built with NestJS and Stripe',
      endpoints: {
        orders: 'POST /orders - Create new order',
        createIntent: 'POST /payments/create-intent - Create payment intent',
        createCheckout: 'POST /payments/create-checkout-session - Create checkout session',
        requestRefund: 'POST /payments/request-refund - Request refund',
        webhook: 'POST /payments/webhook - Stripe webhook handler'
      },
      status: 'running'
    };
  }
}