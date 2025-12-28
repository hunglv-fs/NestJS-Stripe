import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: jest.Mocked<Repository<Order>>;

  const mockOrder = {
    id: '1',
    amount: 100,
    currency: 'usd',
    status: 'pending',
  } as Order;

  beforeEach(async () => {
    const mockOrderRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepo,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get(getRepositoryToken(Order));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFakeOrder', () => {
    it('should create a fake order successfully', async () => {
      orderRepository.create.mockReturnValue(mockOrder);
      orderRepository.save.mockResolvedValue(mockOrder);

      const result = await service.createFakeOrder(100, 'usd');

      expect(orderRepository.create).toHaveBeenCalledWith({
        amount: 100,
        currency: 'usd',
        status: 'pending',
      });
      expect(orderRepository.save).toHaveBeenCalledWith(mockOrder);
      expect(result).toEqual(mockOrder);
    });
  });
});
