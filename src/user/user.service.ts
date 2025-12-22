import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { StripeService } from '../stripe/stripe.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private stripeService: StripeService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
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

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ where: { email } });
  }
}