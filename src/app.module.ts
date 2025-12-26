import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { OrderModule } from './order/order.module';
import { StripeModule } from './stripe/stripe.module';
import { PaypalModule } from './paypal/paypal.module';
import { PaymentModule } from './payment/payment.module';
import { ProductModule } from './product/product.module';
import { UserModule } from './user/user.module';
import { LoggerModule } from './logger/logger.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'nestjs_stripe',
      entities: [
        // Import all entities explicitly for better control
        'dist/**/*.entity{.ts,.js}',
      ],
      autoLoadEntities: true,
      synchronize: false, // Re-enable auto-sync with complete schema
    }),
    LoggerModule,
    AuthModule,
    RbacModule,
    OrderModule,
    StripeModule,
    PaypalModule,
    PaymentModule,
    ProductModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
