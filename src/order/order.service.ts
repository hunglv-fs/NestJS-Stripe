import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async createFakeOrder(amount: number, currency: string): Promise<Order> {
    const order = this.orderRepository.create({
      amount,
      currency,
      status: 'pending',
    });

    return this.orderRepository.save(order);
  }
}