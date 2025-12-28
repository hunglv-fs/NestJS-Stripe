import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { RequestRefundDto } from './dto/request-refund.dto';
import { PaymentMethod } from './interfaces/payment-provider.interface';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: jest.Mocked<PaymentService>;

  const mockPaymentService = {
    createPaymentIntent: jest.fn(),
    createCheckoutSession: jest.fn(),
    requestRefund: jest.fn(),
    handleWebhook: jest.fn(),
    getAvailablePaymentMethods: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    paymentService = module.get(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    const dto: CreatePaymentIntentDto = {
      orderId: 'order1',
      paymentMethod: PaymentMethod.STRIPE,
    };

    it('should create payment intent', async () => {
      const result = { client_secret: 'secret' };
      paymentService.createPaymentIntent.mockResolvedValue(result);

      const response = await controller.createPaymentIntent(dto);

      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith('order1', PaymentMethod.STRIPE);
      expect(response).toEqual(result);
    });

    it('should use default payment method when not specified', async () => {
      const dtoWithoutMethod = { orderId: 'order1' };
      const result = { client_secret: 'secret' };
      paymentService.createPaymentIntent.mockResolvedValue(result);

      await controller.createPaymentIntent(dtoWithoutMethod as any);

      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith('order1', PaymentMethod.STRIPE);
    });
  });

  describe('createCheckoutSession', () => {
    const dto: CreateCheckoutSessionDto = {
      orderId: 'order1',
      paymentMethod: PaymentMethod.PAYPAL,
    };

    it('should create checkout session', async () => {
      const result = { url: 'https://checkout.paypal.com' };
      paymentService.createCheckoutSession.mockResolvedValue(result);

      const response = await controller.createCheckoutSession(dto);

      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith('order1', PaymentMethod.PAYPAL);
      expect(response).toEqual(result);
    });
  });

  describe('requestRefund', () => {
    const dto: RequestRefundDto = {
      orderId: 'order1',
      reason: 'Customer request',
    };

    it('should request refund', async () => {
      const result = { id: 'rf_test', status: 'succeeded', message: 'Refund requested successfully' };
      paymentService.requestRefund.mockResolvedValue(result);

      const response = await controller.requestRefund(dto);

      expect(paymentService.requestRefund).toHaveBeenCalledWith('order1', 'Customer request');
      expect(response).toEqual(result);
    });
  });

  describe('getAvailablePaymentMethods', () => {
    it('should return available payment methods', async () => {
      const methods = [PaymentMethod.STRIPE, PaymentMethod.PAYPAL];
      paymentService.getAvailablePaymentMethods.mockReturnValue(methods);

      const response = await controller.getAvailablePaymentMethods();

      expect(paymentService.getAvailablePaymentMethods).toHaveBeenCalled();
      expect(response).toEqual({ methods });
    });
  });

  describe('handleStripeWebhook', () => {
    it('should handle Stripe webhook', async () => {
      const mockReq = { body: Buffer.from('test') };
      paymentService.handleWebhook.mockResolvedValue(undefined);

      await controller.handleStripeWebhook(mockReq as any, 'signature');

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(Buffer.from('test'), 'signature', PaymentMethod.STRIPE);
    });
  });

  describe('handlePaypalWebhook', () => {
    it('should handle PayPal webhook', async () => {
      const mockReq = { body: Buffer.from('test') };
      paymentService.handleWebhook.mockResolvedValue(undefined);

      await controller.handlePaypalWebhook(mockReq as any, 'signature');

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(Buffer.from('test'), 'signature', PaymentMethod.PAYPAL);
    });
  });
});
