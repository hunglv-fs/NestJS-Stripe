import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../src/user/entities/user.entity';
import { Role } from '../../src/rbac/entities/role.entity';
import { Permission } from '../../src/rbac/entities/permission.entity';
import { UserRole } from '../../src/rbac/entities/user-role.entity';
import { RolePermission } from '../../src/rbac/entities/role-permission.entity';
import { Product } from '../../src/product/entities/product.entity';
import { Order } from '../../src/order/entities/order.entity';

export function createTestDatabaseModule() {
  return TypeOrmModule.forRoot({
    type: 'sqlite',
    database: ':memory:',
    entities: [User, Role, Permission, UserRole, RolePermission, Product, Order],
    synchronize: true,
    dropSchema: true,
    logging: false,
    extra: {
      // Handle enum types for SQLite
      enum: 'string',
    },
  });
}

export function createTestTypeOrmModule() {
  return TypeOrmModule.forFeature([
    User,
    Role,
    Permission,
    UserRole,
    RolePermission,
    Product,
    Order,
  ]);
}
