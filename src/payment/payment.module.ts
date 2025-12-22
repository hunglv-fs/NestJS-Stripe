import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Order } from '../order/entities/order.entity';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), StripeModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}