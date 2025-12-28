import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisterDto } from '../../src/auth/dto/register.dto';
import { LoginDto } from '../../src/auth/dto/login.dto';

// Import all modules
import { AuthModule } from '../../src/auth/auth.module';
import { UserModule } from '../../src/user/user.module';
import { RbacModule } from '../../src/rbac/rbac.module';
import { ProductModule } from '../../src/product/product.module';
import { OrderModule } from '../../src/order/order.module';
import { PaymentModule } from '../../src/payment/payment.module';
import { LoggerModule } from '../../src/logger/logger.module';

// Import entities
import { User } from '../../src/user/entities/user.entity';
import { Role } from '../../src/rbac/entities/role.entity';
import { Permission } from '../../src/rbac/entities/permission.entity';
import { UserRole } from '../../src/rbac/entities/user-role.entity';
import { RolePermission } from '../../src/rbac/entities/role-permission.entity';
import { Product } from '../../src/product/entities/product.entity';
import { Order } from '../../src/order/entities/order.entity';

export class TestHelper {
  private app: INestApplication;
  private authToken: string;
  private postgresContainer: StartedPostgreSqlContainer | null = null;

  async setupTestApp(): Promise<INestApplication> {
    // Start PostgreSQL container for this test
    this.postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('testuser')
      .withPassword('testpass')
      .withExposedPorts(5432)
      .start();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Database module with TestContainer
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: this.postgresContainer.getHost(),
          port: this.postgresContainer.getPort(),
          username: this.postgresContainer.getUsername(),
          password: this.postgresContainer.getPassword(),
          database: this.postgresContainer.getDatabase(),
          entities: [User, Role, Permission, UserRole, RolePermission, Product, Order],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        // All application modules
        AuthModule,
        UserModule,
        RbacModule,
        ProductModule,
        OrderModule,
        PaymentModule,
        LoggerModule,
      ],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    await this.app.init();
    return this.app;
  }

  async teardownTestApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }

    // Stop PostgreSQL container
    if (this.postgresContainer) {
      await this.postgresContainer.stop();
      this.postgresContainer = null;
    }
  }

  getHttpServer() {
    return this.app.getHttpServer();
  }

  getApp() {
    return this.app;
  }

  async registerUser(registerDto: RegisterDto): Promise<request.Response> {
    return request(this.app.getHttpServer())
      .post('/auth/register')
      .send(registerDto);
  }

  async loginUser(loginDto: LoginDto): Promise<request.Response> {
    return request(this.app.getHttpServer())
      .post('/auth/login')
      .send(loginDto);
  }

  async authenticateUser(email: string, password: string): Promise<string> {
    const loginResponse = await this.loginUser({ email, password });
    expect(loginResponse.status).toBe(201);
    const token = loginResponse.body.access_token;
    this.authToken = token;
    return token;
  }

  getAuthToken(): string {
    return this.authToken;
  }

  async makeAuthenticatedRequest(method: 'get' | 'post' | 'put' | 'delete' | 'patch', url: string, data?: any): Promise<request.Test> {
    let req = request(this.app.getHttpServer())[method](url);

    if (this.authToken) {
      req = req.set('Authorization', `Bearer ${this.authToken}`);
    }

    if (data && (method === 'post' || method === 'put' || method === 'patch')) {
      req = req.send(data);
    }

    return req;
  }

  async createTestUser(email: string = 'test@example.com', password: string = 'password123'): Promise<string> {
    const registerDto: RegisterDto = {
      name: 'Test User',
      email,
      password,
      phone: '+84123456789',
    };

    const registerResponse = await this.registerUser(registerDto);
    expect(registerResponse.status).toBe(201);

    return await this.authenticateUser(email, password);
  }

  async createTestProduct(name: string = 'Test Product', price: number = 100): Promise<string> {
    const createProductDto = {
      name,
      description: 'Test product description',
      price,
      currency: 'usd',
    };

    const response = await this.makeAuthenticatedRequest('post', '/products', createProductDto);
    expect(response.status).toBe(201);
    return response.body.id;
  }

  async createTestOrder(amount: number = 100, currency: string = 'usd'): Promise<string> {
    const createOrderDto = {
      amount,
      currency,
    };

    const response = await this.makeAuthenticatedRequest('post', '/orders', createOrderDto);
    expect(response.status).toBe(201);
    return response.body.id;
  }
}

export function createTestUserDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
  return {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    phone: '+84123456789',
    ...overrides,
  };
}

export function createTestLoginDto(overrides: Partial<LoginDto> = {}): LoginDto {
  return {
    email: 'test@example.com',
    password: 'password123',
    ...overrides,
  };
}
