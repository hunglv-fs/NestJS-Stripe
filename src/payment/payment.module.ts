import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentProviderFactory } from './payment-provider.factory';
import { Order } from '../order/entities/order.entity';
import { StripeModule } from '../stripe/stripe.module';
import { PaypalModule } from '../paypal/paypal.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), StripeModule, PaypalModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentProviderFactory],
  exports: [PaymentService, PaymentProviderFactory],
})
export class PaymentModule {}
