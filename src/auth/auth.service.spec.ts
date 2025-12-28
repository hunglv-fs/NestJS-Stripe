import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { RbacService } from '../rbac/rbac.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let rbacService: jest.Mocked<RbacService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
  };

  const mockRole = {
    id: 'role1',
    name: 'Registered User',
  };

  beforeEach(async () => {
    const mockUserService = {
      findByEmail: jest.fn(),
      updateLastLogin: jest.fn(),
      create: jest.fn(),
    };

    const mockRbacService = {
      ensureRegisteredUserRole: jest.fn(),
      assignRoleToUser: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: RbacService,
          useValue: mockRbacService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    rbacService = module.get(RbacService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      userService.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should return null when user not found', async () => {
      userService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      userService.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password',
    };

    it('should return access token and user when login is successful', async () => {
      const userWithoutPassword = { id: '1', email: 'test@example.com', name: 'Test User' };
      jest.spyOn(service, 'validateUser').mockResolvedValue(userWithoutPassword);
      userService.updateLastLogin.mockResolvedValue(undefined);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(service.validateUser).toHaveBeenCalledWith('test@example.com', 'password');
      expect(userService.updateLastLogin).toHaveBeenCalledWith('1');
      expect(jwtService.sign).toHaveBeenCalledWith({ email: 'test@example.com', sub: '1' });
      expect(result).toEqual({
        access_token: 'jwt-token',
        user: userWithoutPassword,
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '+84123456789',
    };

    it('should register user successfully and return access token', async () => {
      jest.spyOn(service, 'hashPassword').mockResolvedValue('hashedPassword');
      userService.create.mockResolvedValue(mockUser as any);
      rbacService.ensureRegisteredUserRole.mockResolvedValue(mockRole as any);
      rbacService.assignRoleToUser.mockResolvedValue({} as any);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register(registerDto);

      expect(service.hashPassword).toHaveBeenCalledWith('password123');
      expect(userService.create).toHaveBeenCalledWith({
        ...registerDto,
        password: 'hashedPassword',
      });
      expect(rbacService.ensureRegisteredUserRole).toHaveBeenCalled();
      expect(rbacService.assignRoleToUser).toHaveBeenCalledWith('1', 'role1');
      expect(jwtService.sign).toHaveBeenCalledWith({ email: 'test@example.com', sub: '1' });
      expect(result).toEqual({
        access_token: 'jwt-token',
        user: mockUser,
      });
    });
  });

  describe('hashPassword', () => {
    it('should hash password with salt rounds', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await service.hashPassword('password');

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(result).toBe('hashedPassword');
    });
  });
});
