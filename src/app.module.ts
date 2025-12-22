import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { OrderModule } from './order/order.module';
import { StripeModule } from './stripe/stripe.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '123456',
      database: 'nestjs_stripe',
      autoLoadEntities: true,
      synchronize: true,
    }),
    OrderModule,
    StripeModule,
    PaymentModule,
  ],
  controllers: [AppController],
})
export class AppModule {}