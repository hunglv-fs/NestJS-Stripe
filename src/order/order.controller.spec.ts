import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: jest.Mocked<OrderService>;

  const mockOrder = {
    id: '1',
    amount: 100,
    currency: 'usd',
    status: 'pending',
  };

  const mockOrderService = {
    createFakeOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const createOrderDto: CreateOrderDto = {
      amount: 100,
      currency: 'usd',
    };

    it('should create an order', async () => {
      orderService.createFakeOrder.mockResolvedValue(mockOrder as any);

      const result = await controller.createOrder(createOrderDto);

      expect(orderService.createFakeOrder).toHaveBeenCalledWith(100, 'usd');
      expect(result).toEqual(mockOrder);
    });
  });
});
