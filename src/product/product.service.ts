import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { StripeService } from '../stripe/stripe.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private stripeService: StripeService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Tạo product trên Stripe
    const stripeProduct = await this.stripeService.createProduct(
      createProductDto.name,
      createProductDto.description,
    );

    // Tạo price trên Stripe
    const stripePrice = await this.stripeService.createPrice(
      stripeProduct.id,
      createProductDto.price,
      createProductDto.currency,
    );

    // Lưu vào database với Stripe IDs
    const product = this.productRepository.create({
      ...createProductDto,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
    });

    return this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find();
  }

  async findOne(id: string): Promise<Product> {
    return this.productRepository.findOne({ where: { id } });
  }
}