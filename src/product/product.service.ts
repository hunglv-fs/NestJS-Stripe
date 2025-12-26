import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaymentProviderFactory } from '../payment/payment-provider.factory';
import { PaymentMethod } from '../payment/interfaces/payment-provider.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private paymentProviderFactory: PaymentProviderFactory,
    private logger: LoggerService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Create product in local database only (no auto-sync)
    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find();
  }

  async findOne(id: string): Promise<Product> {
    return this.productRepository.findOne({ where: { id } });
  }

  async syncToProviders(productId: string, providers: PaymentMethod[]): Promise<{
    product: Product;
    successfulSyncs: PaymentMethod[];
    failedSyncs: { provider: PaymentMethod; error: string }[];
  }> {
    const product = await this.findOne(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const successfulSyncs: PaymentMethod[] = [];
    const failedSyncs: { provider: PaymentMethod; error: string }[] = [];

    // Sync to each requested provider with error handling
    for (const providerName of providers) {
      try {
        this.logger.info(`🔄 Syncing product ${productId} to ${providerName}...`, {
          productId,
          provider: providerName,
          productName: product.name
        });

        const provider = this.paymentProviderFactory.getProvider(providerName);

        // Create product in the provider
        const providerProduct = await provider.createProduct(
          product.name,
          product.description,
        );
        this.logger.info(`✅ Created product in ${providerName}`, {
          productId,
          provider: providerName,
          providerProductId: providerProduct.id,
          localProductName: product.name
        });

        // Create price in the provider
        const providerPrice = await provider.createPrice(
          providerProduct.id,
          product.price,
          product.currency,
        );
        this.logger.info(`✅ Created price in ${providerName}`, {
          productId,
          provider: providerName,
          providerPriceId: providerPrice.id,
          amount: product.price,
          currency: product.currency
        });

        // Update product with provider IDs
        switch (providerName) {
          case PaymentMethod.STRIPE:
            product.stripeProductId = providerProduct.id;
            product.stripePriceId = providerPrice.id;
            break;
          case PaymentMethod.PAYPAL:
            product.paypalProductId = providerProduct.id;
            product.paypalPriceId = providerPrice.id;
            break;
        }

        successfulSyncs.push(providerName);
        this.logger.info(`🎉 Successfully synced product to ${providerName}`, {
          productId,
          provider: providerName,
          successfulSyncs: successfulSyncs.length
        });

      } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        this.logger.error(`❌ Failed to sync product to ${providerName}`, {
          productId,
          provider: providerName,
          error: errorMessage,
          stack: error.stack
        });

        failedSyncs.push({
          provider: providerName,
          error: errorMessage,
        });
      }
    }

    // Save product with successful syncs
    const updatedProduct = await this.productRepository.save(product);

    this.logger.info(`📊 Sync Summary for product ${productId}`, {
      productId,
      totalProviders: providers.length,
      successfulSyncs: successfulSyncs.length,
      failedSyncs: failedSyncs.length,
      successfulProviders: successfulSyncs,
      failedProviders: failedSyncs.map(f => ({ provider: f.provider, error: f.error }))
    });

    return {
      product: updatedProduct,
      successfulSyncs,
      failedSyncs,
    };
  }

  async getSyncStatus(productId: string): Promise<{
    product: Product;
    syncedProviders: PaymentMethod[];
    availableProviders: PaymentMethod[];
  }> {
    const product = await this.findOne(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const syncedProviders: PaymentMethod[] = [];
    const availableProviders = this.paymentProviderFactory.getAvailableProviders();

    if (product.stripeProductId && product.stripePriceId) {
      syncedProviders.push(PaymentMethod.STRIPE);
    }

    if (product.paypalProductId && product.paypalPriceId) {
      syncedProviders.push(PaymentMethod.PAYPAL);
    }

    return {
      product,
      syncedProviders,
      availableProviders,
    };
  }
}
