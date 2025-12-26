import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentMethod } from './interfaces/payment-provider.interface';
import { StripeService } from '../stripe/stripe.service';
import { PaypalService } from '../paypal/paypal.service';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private stripeService: StripeService,
    private paypalService: PaypalService,
  ) {}

  getProvider(paymentMethod: PaymentMethod): PaymentProvider {
    switch (paymentMethod) {
      case PaymentMethod.STRIPE:
        return this.stripeService;
      case PaymentMethod.PAYPAL:
        return this.paypalService;
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
  }

  getAvailableProviders(): PaymentMethod[] {
    return [PaymentMethod.STRIPE, PaymentMethod.PAYPAL];
  }
}
