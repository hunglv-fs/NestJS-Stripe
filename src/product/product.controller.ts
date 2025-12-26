import { Controller, Get, Post, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { PaymentMethod } from '../payment/interfaces/payment-provider.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Using permission-based access for now
// TODO: Replace with proper permission guards when implemented
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createProductDto: CreateProductDto) {
    // TODO: Add permission check for 'product:create'
    return this.productService.create(createProductDto);
  }

  @Get()
  async findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post(':id/sync')
  @UseGuards(JwtAuthGuard)
  async syncToProviders(
    @Param('id') productId: string,
    @Body() { providers }: { providers: PaymentMethod[] }
  ) {
    // TODO: Add permission check for 'product:update'
    const result = await this.productService.syncToProviders(productId, providers);

    // If any sync failed, throw an error with detailed information
    if (result.failedSyncs.length > 0) {
      const errorMessage = `Product sync failed for providers: ${result.failedSyncs.map(f => `${f.provider} (${f.error})`).join(', ')}`;
      throw new BadRequestException({
        message: errorMessage,
        successfulSyncs: result.successfulSyncs,
        failedSyncs: result.failedSyncs,
        partialSuccess: result.successfulSyncs.length > 0,
      });
    }

    // All syncs successful
    return {
      success: true,
      message: `Product synced successfully to all providers: ${result.successfulSyncs.join(', ')}`,
      product: result.product,
      successfulSyncs: result.successfulSyncs,
      failedSyncs: result.failedSyncs,
    };
  }

  @Get(':id/sync-status')
  @UseGuards(JwtAuthGuard)
  async getSyncStatus(@Param('id') productId: string) {
    return this.productService.getSyncStatus(productId);
  }
}
