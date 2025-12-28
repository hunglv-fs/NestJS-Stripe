import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Order } from '../order/entities/order.entity';
import { PaymentProviderFactory } from './payment-provider.factory';
import { PaymentMethod } from './interfaces/payment-provider.interface';

describe('PaymentService', () => {
  let service: PaymentService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let paymentProviderFactory: jest.Mocked<PaymentProviderFactory>;

  const mockOrder = {
    id: 'order1',
    amount: 100,
    currency: 'usd',
    status: 'pending',
  } as Order;

  const mockProvider = {
    createPaymentIntent: jest.fn(),
    createCheckoutSession: jest.fn(),
    createRefund: jest.fn(),
    verifyWebhook: jest.fn(),
  };

  beforeEach(async () => {
    // Suppress console outputs during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    const mockOrderRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockPaymentProviderFactory = {
      getProvider: jest.fn(),
      getAvailableProviders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepo,
        },
        {
          provide: PaymentProviderFactory,
          useValue: mockPaymentProviderFactory,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    orderRepository = module.get(getRepositoryToken(Order));
    paymentProviderFactory = module.get(PaymentProviderFactory);
  });

  afterEach(() => {
    // Restore console outputs
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.createPaymentIntent('order1')).rejects.toThrow(NotFoundException);
    });

    it('should create payment intent successfully', async () => {
      const paymentIntentResponse = { id: 'pi_test', client_secret: 'secret' };
      orderRepository.findOne.mockResolvedValue(mockOrder);
      paymentProviderFactory.getProvider.mockReturnValue(mockProvider as any);
      mockProvider.createPaymentIntent.mockResolvedValue(paymentIntentResponse);
      orderRepository.save.mockResolvedValue({ ...mockOrder } as any);

      const result = await service.createPaymentIntent('order1', PaymentMethod.STRIPE);

      expect(paymentProviderFactory.getProvider).toHaveBeenCalledWith(PaymentMethod.STRIPE);
      expect(mockProvider.createPaymentIntent).toHaveBeenCalledWith(100, 'usd', { orderId: 'order1' });
      expect(orderRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ client_secret: 'secret' });
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.createCheckoutSession('order1')).rejects.toThrow(NotFoundException);
    });

    it('should create checkout session successfully', async () => {
      const sessionResponse = { id: 'cs_test', url: 'https://checkout.stripe.com/pay/cs_test' };
      orderRepository.findOne.mockResolvedValue(mockOrder);
      paymentProviderFactory.getProvider.mockReturnValue(mockProvider as any);
      mockProvider.createCheckoutSession.mockResolvedValue(sessionResponse);
      orderRepository.save.mockResolvedValue({ ...mockOrder } as any);

      const result = await service.createCheckoutSession('order1', PaymentMethod.STRIPE);

      expect(paymentProviderFactory.getProvider).toHaveBeenCalledWith(PaymentMethod.STRIPE);
      expect(mockProvider.createCheckoutSession).toHaveBeenCalledWith(100, 'usd', 'order1');
      expect(result).toEqual({ url: 'https://checkout.stripe.com/pay/cs_test' });
    });
  });

  describe('requestRefund', () => {
    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.requestRefund('order1')).rejects.toThrow(NotFoundException);
    });

    it('should throw error when order is not paid', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(service.requestRefund('order1')).rejects.toThrow('Order must be paid to request refund');
    });

    it('should throw error when no payment method ID', async () => {
      const paidOrder = { ...mockOrder, status: 'PAYMENT_SUCCEEDED', paymentMethodId: undefined };
      orderRepository.findOne.mockResolvedValue(paidOrder as any);

      await expect(service.requestRefund('order1')).rejects.toThrow('Cannot refund: No valid payment method ID found');
    });

    it('should throw error when payment provider is not set', async () => {
      const paidOrder = {
        ...mockOrder,
        status: 'PAYMENT_SUCCEEDED',
        paymentMethodId: 'pi_test'
      };
      orderRepository.findOne.mockResolvedValue(paidOrder as any);

      await expect(service.requestRefund('order1')).rejects.toThrow('Refund creation failed');
    });

    it('should request refund successfully', async () => {
      const paidOrder = {
        ...mockOrder,
        status: 'PAYMENT_SUCCEEDED',
        paymentProvider: PaymentMethod.STRIPE,
        paymentMethodId: 'pi_test'
      };
      const refundResponse = { id: 'rf_test', status: 'succeeded' };
      orderRepository.findOne.mockResolvedValue(paidOrder as any);
      paymentProviderFactory.getProvider.mockReturnValue(mockProvider as any);
      mockProvider.createRefund.mockResolvedValue(refundResponse);
      orderRepository.save.mockResolvedValue({ ...paidOrder } as any);

      const result = await service.requestRefund('order1', 'Customer request');

      expect(mockProvider.createRefund).toHaveBeenCalledWith('pi_test', 100, 'Customer request');
      expect(result).toEqual({ ...refundResponse, message: 'Refund requested successfully' });
    });
  });

  describe('handleWebhook', () => {
    it('should handle Stripe webhook', async () => {
      const mockEvent = { type: 'payment_intent.succeeded', data: { object: { id: 'pi_test' } } };
      paymentProviderFactory.getProvider.mockReturnValue(mockProvider as any);
      mockProvider.verifyWebhook.mockReturnValue(mockEvent);
      orderRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.handleWebhook(Buffer.from('test'), 'signature', PaymentMethod.STRIPE);

      expect(mockProvider.verifyWebhook).toHaveBeenCalledWith(Buffer.from('test'), 'signature');
      expect(orderRepository.update).toHaveBeenCalledWith(
        { paymentIntentId: 'pi_test' },
        { status: 'PAYMENT_SUCCEEDED' }
      );
    });

    it('should handle PayPal webhook', async () => {
      const mockEvent = { type: 'PAYMENT.SALE.COMPLETED' };
      paymentProviderFactory.getProvider.mockReturnValue(mockProvider as any);
      mockProvider.verifyWebhook.mockReturnValue(mockEvent);

      await service.handleWebhook(Buffer.from('test'), 'signature', PaymentMethod.PAYPAL);

      expect(mockProvider.verifyWebhook).toHaveBeenCalledWith(Buffer.from('test'), 'signature');
    });
  });

  describe('getAvailablePaymentMethods', () => {
    it('should return available payment methods', () => {
      const methods = [PaymentMethod.STRIPE, PaymentMethod.PAYPAL];
      paymentProviderFactory.getAvailableProviders.mockReturnValue(methods);

      const result = service.getAvailablePaymentMethods();

      expect(paymentProviderFactory.getAvailableProviders).toHaveBeenCalled();
      expect(result).toEqual(methods);
    });
  });
});
