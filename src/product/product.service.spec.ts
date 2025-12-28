import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { PaymentProviderFactory } from '../payment/payment-provider.factory';
import { PaymentMethod } from '../payment/interfaces/payment-provider.interface';
import { LoggerService } from '../logger/logger.service';
import { CreateProductDto } from './dto/create-product.dto';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: jest.Mocked<Repository<Product>>;
  let paymentProviderFactory: jest.Mocked<PaymentProviderFactory>;
  let loggerService: jest.Mocked<LoggerService>;

  const baseMockProduct = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    price: 100,
    currency: 'usd',
  };

  const mockProduct = baseMockProduct as any;

  const mockProvider = {
    createProduct: jest.fn(),
    createPrice: jest.fn(),
  };

  beforeEach(async () => {
    const mockProductRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockPaymentProviderFactory = {
      getProvider: jest.fn(),
      getAvailableProviders: jest.fn(),
    };

    const mockLoggerService = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepo,
        },
        {
          provide: PaymentProviderFactory,
          useValue: mockPaymentProviderFactory,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepository = module.get(getRepositoryToken(Product));
    paymentProviderFactory = module.get(PaymentProviderFactory);
    loggerService = module.get(LoggerService);
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

    it('should create product successfully', async () => {
      productRepository.create.mockReturnValue(mockProduct);
      productRepository.save.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(productRepository.create).toHaveBeenCalledWith(createProductDto);
      expect(productRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      const products = [mockProduct];
      productRepository.find.mockResolvedValue(products);

      const result = await service.findAll();

      expect(productRepository.find).toHaveBeenCalled();
      expect(result).toEqual(products);
    });
  });

  describe('findOne', () => {
    it('should return product by id', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne('1');

      expect(productRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(mockProduct);
    });
  });

  describe('syncToProviders', () => {
    const providers = [PaymentMethod.STRIPE];

    it('should throw error when product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.syncToProviders('1', providers)).rejects.toThrow('Product not found');
    });

    it('should sync product to providers successfully', async () => {
      const freshProduct = { ...baseMockProduct } as any;
      const updatedProduct = { ...freshProduct, stripeProductId: 'prod_test', stripePriceId: 'price_test' };
      productRepository.findOne.mockResolvedValue(freshProduct);
      paymentProviderFactory.getProvider.mockReturnValue(mockProvider as any);
      mockProvider.createProduct.mockResolvedValue({ id: 'prod_test', name: 'Test Product' });
      mockProvider.createPrice.mockResolvedValue({ id: 'price_test', product: 'prod_test', unit_amount: 100, currency: 'usd' });
      productRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.syncToProviders('1', providers);

      expect(paymentProviderFactory.getProvider).toHaveBeenCalledWith(PaymentMethod.STRIPE);
      expect(mockProvider.createProduct).toHaveBeenCalledWith('Test Product', 'Test Description');
      expect(mockProvider.createPrice).toHaveBeenCalledWith('prod_test', 100, 'usd');
      expect(productRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        product: updatedProduct,
        successfulSyncs: [PaymentMethod.STRIPE],
        failedSyncs: [],
      });
    });

    it('should handle sync failures', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      paymentProviderFactory.getProvider.mockReturnValue(mockProvider as any);
      mockProvider.createProduct.mockRejectedValue(new Error('Provider error'));
      productRepository.save.mockResolvedValue(mockProduct);

      const result = await service.syncToProviders('1', providers);

      expect(loggerService.error).toHaveBeenCalled();
      expect(result).toEqual({
        product: mockProduct,
        successfulSyncs: [],
        failedSyncs: [{ provider: PaymentMethod.STRIPE, error: 'Provider error' }],
      });
    });
  });

  describe('getSyncStatus', () => {
    it('should throw error when product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.getSyncStatus('1')).rejects.toThrow('Product not found');
    });

    it('should return sync status for product with stripe sync', async () => {
      const syncedProduct = { ...mockProduct, stripeProductId: 'prod_test', stripePriceId: 'price_test' };
      productRepository.findOne.mockResolvedValue(syncedProduct);
      paymentProviderFactory.getAvailableProviders.mockReturnValue([PaymentMethod.STRIPE, PaymentMethod.PAYPAL]);

      const result = await service.getSyncStatus('1');

      expect(result).toEqual({
        product: syncedProduct,
        syncedProviders: [PaymentMethod.STRIPE],
        availableProviders: [PaymentMethod.STRIPE, PaymentMethod.PAYPAL],
      });
    });

    it('should return sync status for product with paypal sync', async () => {
      const paypalSyncedProduct = {
        ...baseMockProduct,
        paypalProductId: 'prod_test',
        paypalPriceId: 'price_test'
      } as any;
      productRepository.findOne.mockResolvedValue(paypalSyncedProduct);
      paymentProviderFactory.getAvailableProviders.mockReturnValue([PaymentMethod.STRIPE, PaymentMethod.PAYPAL]);

      const result = await service.getSyncStatus('1');

      expect(result).toEqual({
        product: paypalSyncedProduct,
        syncedProviders: [PaymentMethod.PAYPAL],
        availableProviders: [PaymentMethod.STRIPE, PaymentMethod.PAYPAL],
      });
    });
  });
});
