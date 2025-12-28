import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { PaymentMethod } from '../payment/interfaces/payment-provider.interface';

describe('ProductController', () => {
  let controller: ProductController;
  let productService: jest.Mocked<ProductService>;

  const mockProduct = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    price: 100,
    currency: 'usd',
  } as any;

  const mockProductService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    syncToProviders: jest.fn(),
    getSyncStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    productService = module.get(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = {
      name: 'Test Product',
      description: 'Test Description',
      price: 100,
      currency: 'usd',
    };

    it('should create a new product', async () => {
      productService.create.mockResolvedValue(mockProduct as any);

      const result = await controller.create(createProductDto);

      expect(productService.create).toHaveBeenCalledWith(createProductDto);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      const products = [mockProduct];
      productService.findAll.mockResolvedValue(products as any);

      const result = await controller.findAll();

      expect(productService.findAll).toHaveBeenCalled();
      expect(result).toEqual(products);
    });
  });

  describe('findOne', () => {
    it('should return product by id', async () => {
      productService.findOne.mockResolvedValue(mockProduct as any);

      const result = await controller.findOne('1');

      expect(productService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockProduct);
    });
  });

  describe('syncToProviders', () => {
    const providers = [PaymentMethod.STRIPE];
    const syncResult = {
      product: mockProduct,
      successfulSyncs: [PaymentMethod.STRIPE],
      failedSyncs: [],
    };

    it('should sync product to providers successfully', async () => {
      productService.syncToProviders.mockResolvedValue(syncResult);

      const result = await controller.syncToProviders('1', { providers });

      expect(productService.syncToProviders).toHaveBeenCalledWith('1', providers);
      expect(result).toEqual({
        success: true,
        message: 'Product synced successfully to all providers: stripe',
        product: mockProduct,
        successfulSyncs: [PaymentMethod.STRIPE],
        failedSyncs: [],
      });
    });

    it('should throw BadRequestException when sync partially fails', async () => {
      const partialResult = {
        product: mockProduct,
        successfulSyncs: [PaymentMethod.STRIPE],
        failedSyncs: [{ provider: PaymentMethod.PAYPAL, error: 'PayPal error' }],
      };
      productService.syncToProviders.mockResolvedValue(partialResult);

      await expect(controller.syncToProviders('1', { providers: [PaymentMethod.STRIPE, PaymentMethod.PAYPAL] }))
        .rejects.toThrow(BadRequestException);

      try {
        await controller.syncToProviders('1', { providers: [PaymentMethod.STRIPE, PaymentMethod.PAYPAL] });
      } catch (error) {
        expect(error.response).toEqual({
          message: 'Product sync failed for providers: paypal (PayPal error)',
          successfulSyncs: [PaymentMethod.STRIPE],
          failedSyncs: [{ provider: PaymentMethod.PAYPAL, error: 'PayPal error' }],
          partialSuccess: true,
        });
      }
    });

    it('should throw BadRequestException when sync completely fails', async () => {
      const failedResult = {
        product: mockProduct,
        successfulSyncs: [],
        failedSyncs: [{ provider: PaymentMethod.STRIPE, error: 'Stripe error' }],
      };
      productService.syncToProviders.mockResolvedValue(failedResult);

      await expect(controller.syncToProviders('1', { providers }))
        .rejects.toThrow(BadRequestException);

      try {
        await controller.syncToProviders('1', { providers });
      } catch (error) {
        expect(error.response).toEqual({
          message: 'Product sync failed for providers: stripe (Stripe error)',
          successfulSyncs: [],
          failedSyncs: [{ provider: PaymentMethod.STRIPE, error: 'Stripe error' }],
          partialSuccess: false,
        });
      }
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status for product', async () => {
      const syncStatus = {
        product: mockProduct,
        syncedProviders: [PaymentMethod.STRIPE],
        availableProviders: [PaymentMethod.STRIPE, PaymentMethod.PAYPAL],
      };
      productService.getSyncStatus.mockResolvedValue(syncStatus);

      const result = await controller.getSyncStatus('1');

      expect(productService.getSyncStatus).toHaveBeenCalledWith('1');
      expect(result).toEqual(syncStatus);
    });
  });
});
