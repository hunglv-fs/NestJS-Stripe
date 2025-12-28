import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../src/auth/auth.module';
import { UserModule } from '../src/user/user.module';
import { RbacModule } from '../src/rbac/rbac.module';
import { ProductModule } from '../src/product/product.module';
import { OrderModule } from '../src/order/order.module';
import { PaymentModule } from '../src/payment/payment.module';
import { LoggerModule } from '../src/logger/logger.module';
import { User } from '../src/user/entities/user.entity';
import { Role } from '../src/rbac/entities/role.entity';
import { Permission } from '../src/rbac/entities/permission.entity';
import { UserRole } from '../src/rbac/entities/user-role.entity';
import { RolePermission } from '../src/rbac/entities/role-permission.entity';
import { Product } from '../src/product/entities/product.entity';
import { Order } from '../src/order/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      username: process.env.TEST_DB_USERNAME || 'testuser',
      password: process.env.TEST_DB_PASSWORD || 'testpass',
      database: process.env.TEST_DB_NAME || 'nestjs_stripe_test',
      entities: [User, Role, Permission, UserRole, RolePermission, Product, Order],
      synchronize: true,
      dropSchema: true,
      logging: false,
    }),
    AuthModule,
    UserModule,
    RbacModule,
    ProductModule,
    OrderModule,
    PaymentModule,
    LoggerModule,
  ],
})
export class TestAppModule {}
