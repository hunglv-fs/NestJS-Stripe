import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { StripeService } from '../stripe/stripe.service';
import { LoggerService } from '../logger/logger.service';
import { CreateUserDto } from './dto/create-user.dto';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;
  let stripeService: jest.Mocked<StripeService>;
  let loggerService: jest.Mocked<LoggerService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    phone: '+84123456789',
    stripeCustomerId: 'cus_test123',
    is_active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const mockUserRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockStripeService = {
      createCustomer: jest.fn(),
    };

    const mockLoggerService = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
    stripeService = module.get(StripeService);
    loggerService = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '+84123456789',
    };

    it('should create user successfully', async () => {
      userRepository.findOne.mockResolvedValue(null);
      stripeService.createCustomer.mockResolvedValue({ id: 'cus_test123' } as any);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(stripeService.createCustomer).toHaveBeenCalledWith('Test User', 'test@example.com', '+84123456789');
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        stripeCustomerId: 'cus_test123',
      });
      expect(loggerService.info).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockUser);
    });

    it('should throw error when user already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.create(createUserDto)).rejects.toThrow('User with this email already exists');

      expect(loggerService.warn).toHaveBeenCalled();
    });

    it('should handle errors during creation', async () => {
      userRepository.findOne.mockResolvedValue(null);
      stripeService.createCustomer.mockRejectedValue(new Error('Stripe error'));

      await expect(service.create(createUserDto)).rejects.toThrow('Stripe error');

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [mockUser];
      userRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(userRepository.find).toHaveBeenCalled();
      expect(loggerService.info).toHaveBeenCalledTimes(2);
      expect(result).toEqual(users);
    });

    it('should handle errors during findAll', async () => {
      userRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll()).rejects.toThrow('Database error');

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(loggerService.info).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('1');

      expect(loggerService.warn).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle errors during findOne', async () => {
      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne('1')).rejects.toThrow('Database error');

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(loggerService.info).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('test@example.com');

      expect(loggerService.warn).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle errors during findByEmail', async () => {
      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findByEmail('test@example.com')).rejects.toThrow('Database error');

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateLastLogin('1');

      expect(userRepository.update).toHaveBeenCalledWith('1', expect.any(Object));
      expect(loggerService.info).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during updateLastLogin', async () => {
      userRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(service.updateLastLogin('1')).rejects.toThrow('Database error');

      expect(loggerService.error).toHaveBeenCalled();
    });
  });
});
