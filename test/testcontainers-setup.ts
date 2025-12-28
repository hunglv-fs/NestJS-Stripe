import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../src/user/entities/user.entity';
import { Role } from '../src/rbac/entities/role.entity';
import { Permission } from '../src/rbac/entities/permission.entity';
import { UserRole } from '../src/rbac/entities/user-role.entity';
import { RolePermission } from '../src/rbac/entities/role-permission.entity';
import { Product } from '../src/product/entities/product.entity';
import { Order } from '../src/order/entities/order.entity';

let postgresContainer: StartedPostgreSqlContainer | null = null;

export async function startPostgresContainer() {
  if (!postgresContainer) {
    postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('nestjs_stripe_test')
      .withUsername('testuser')
      .withPassword('testpass')
      .withExposedPorts(5432)
      .start();

    // Set environment variables for tests to use
    process.env.TEST_DB_HOST = postgresContainer.getHost();
    process.env.TEST_DB_PORT = postgresContainer.getPort().toString();
    process.env.TEST_DB_USERNAME = postgresContainer.getUsername();
    process.env.TEST_DB_PASSWORD = postgresContainer.getPassword();
    process.env.TEST_DB_NAME = postgresContainer.getDatabase();

    console.log('🗄️  PostgreSQL container started for E2E tests');
    console.log(`📍 Host: ${postgresContainer.getHost()}`);
    console.log(`🚪 Port: ${postgresContainer.getPort()}`);
    console.log(`👤 User: ${postgresContainer.getUsername()}`);
    console.log(`🔑 Password: ${postgresContainer.getPassword()}`);
    console.log(`📊 Database: ${postgresContainer.getDatabase()}`);
  }

  return postgresContainer;
}

export async function stopPostgresContainer() {
  if (postgresContainer) {
    await postgresContainer.stop();
    postgresContainer = null;
    console.log('🗄️  PostgreSQL container stopped');
  }
}

export function createTestDatabaseModule() {
  return TypeOrmModule.forRootAsync({
    useFactory: async () => {
      const container = await startPostgresContainer();

      return {
        type: 'postgres',
        host: container.getHost(),
        port: container.getPort(),
        username: container.getUsername(),
        password: container.getPassword(),
        database: container.getDatabase(),
        entities: [User, Role, Permission, UserRole, RolePermission, Product, Order],
        synchronize: true,
        dropSchema: true,
        logging: false,
      };
    },
  });
}
