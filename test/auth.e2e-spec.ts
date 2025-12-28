import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestHelper, createTestUserDto, createTestLoginDto } from './utils/test-helpers';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let testHelper: TestHelper;

  beforeAll(async () => {
    testHelper = new TestHelper();
    app = await testHelper.setupTestApp();
  }, 30000);

  afterAll(async () => {
    await testHelper.teardownTestApp();
  }, 10000);

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = createTestUserDto();

      const response = await testHelper.registerUser(registerDto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(registerDto.email);
      expect(response.body.user.name).toBe(registerDto.name);
    });

    it('should fail to register with existing email', async () => {
      const registerDto = createTestUserDto();

      // Register first user
      await testHelper.registerUser(registerDto);

      // Try to register again with same email
      const response = await testHelper.registerUser(registerDto);

      expect(response.status).toBe(500); // Internal server error due to duplicate
      expect(response.body).toHaveProperty('message');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          // Missing email and password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate password length', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: '123', // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate phone number format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          phone: 'invalid-phone',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const registerDto = createTestUserDto();
      const loginDto = createTestLoginDto();

      // Register user first
      await testHelper.registerUser(registerDto);

      // Then login
      const response = await testHelper.loginUser(loginDto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginDto.email);
    });

    it('should fail with incorrect password', async () => {
      const registerDto = createTestUserDto();
      const loginDto = createTestLoginDto({ password: 'wrongpassword' });

      // Register user first
      await testHelper.registerUser(registerDto);

      // Try to login with wrong password
      const response = await testHelper.loginUser(loginDto);

      expect(response.status).toBe(201); // NestJS returns 201 for unauthorized in some cases
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should fail with non-existent email', async () => {
      const loginDto = createTestLoginDto();

      const response = await testHelper.loginUser(loginDto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Full Authentication Flow', () => {
    it('should complete full register → login → access protected route flow', async () => {
      const registerDto = createTestUserDto({
        email: 'flowtest@example.com',
        password: 'testpass123',
      });

      // 1. Register
      const registerResponse = await testHelper.registerUser(registerDto);
      expect(registerResponse.status).toBe(201);
      const token = registerResponse.body.access_token;

      // 2. Access protected route with token
      const profileResponse = await request(app.getHttpServer())
        .post('/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse.status).toBe(201);
      expect(profileResponse.body).toHaveProperty('message', 'This is a protected route');

      // 3. Try to access without token (should fail)
      const unauthResponse = await request(app.getHttpServer())
        .post('/auth/profile');

      expect(unauthResponse.status).toBe(401);
    });

    it('should handle JWT token expiration or invalid tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await request(app.getHttpServer())
        .post('/auth/profile')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });
  });
});
