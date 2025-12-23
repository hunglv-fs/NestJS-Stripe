import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { StripeService } from '../stripe/stripe.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private stripeService: StripeService,
    private loggerService: LoggerService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.loggerService.info('Creating new user', { email: createUserDto.email });

    try {
      // Check if user with this email already exists
      const existingUser = await this.findByEmail(createUserDto.email);
      if (existingUser) {
        this.loggerService.warn('Attempted to create user with existing email', {
          email: createUserDto.email,
          existingUserId: existingUser.id
        });
        throw new Error('User with this email already exists');
      }

      // Tạo customer trên Stripe
      const stripeCustomer = await this.stripeService.createCustomer(
        createUserDto.name,
        createUserDto.email,
        createUserDto.phone,
      );

      // Lưu vào database với Stripe customer ID
      const user = this.userRepository.create({
        ...createUserDto,
        stripeCustomerId: stripeCustomer.id,
      });

      const savedUser = await this.userRepository.save(user);
      this.loggerService.info('User created successfully', {
        userId: savedUser.id,
        email: savedUser.email,
        stripeCustomerId: savedUser.stripeCustomerId
      });

      return savedUser;
    } catch (error) {
      this.loggerService.error('Failed to create user', {
        email: createUserDto.email,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    this.loggerService.info('Fetching all users');
    try {
      const users = await this.userRepository.find();
      this.loggerService.info('Fetched all users', { count: users.length });
      return users;
    } catch (error) {
      this.loggerService.error('Failed to fetch all users', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async findOne(id: string): Promise<User> {
    this.loggerService.info('Fetching user by ID', { userId: id });
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (user) {
        this.loggerService.info('User found', { userId: id, email: user.email });
      } else {
        this.loggerService.warn('User not found', { userId: id });
      }
      return user;
    } catch (error) {
      this.loggerService.error('Failed to fetch user by ID', {
        userId: id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User> {
    this.loggerService.info('Fetching user by email', { email });
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (user) {
        this.loggerService.info('User found by email', { userId: user.id, email });
      } else {
        this.loggerService.warn('User not found by email', { email });
      }
      return user;
    } catch (error) {
      this.loggerService.error('Failed to fetch user by email', {
        email,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
