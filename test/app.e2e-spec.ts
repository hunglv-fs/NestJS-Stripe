import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { createTestDatabaseModule } from './utils/database';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        createTestDatabaseModule(),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) - should return app info', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('name', 'NestJS Stripe Payment System');
        expect(res.body).toHaveProperty('version', '0.0.1');
        expect(res.body).toHaveProperty('status', 'running');
        expect(res.body).toHaveProperty('endpoints');
        expect(Array.isArray(res.body.endpoints)).toBe(false); // Should be an object
      });
  });

  it('/health (GET) - should return health status', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
      });
  });

  it('/auth/register (POST) - should validate input', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: '',
        email: 'invalid-email',
        password: '123',
      })
      .expect(400);
  });

  it('/auth/login (POST) - should validate input', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'invalid-email',
        password: '',
      })
      .expect(400);
  });

  it('/products (GET) - should be publicly accessible', () => {
    return request(app.getHttpServer())
      .get('/products')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/users (GET) - should require authentication', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(401);
  });

  it('/orders (POST) - should require authentication', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({
        amount: 100,
        currency: 'usd',
      })
      .expect(401);
  });

  it('/products (POST) - should require authentication', () => {
    return request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'Test Product',
        price: 100,
        currency: 'usd',
      })
      .expect(401);
  });

  it('/payments/create-intent (POST) - should require authentication', () => {
    return request(app.getHttpServer())
      .post('/payments/create-intent')
      .send({
        orderId: 'test-order-id',
      })
      .expect(401);
  });
});
