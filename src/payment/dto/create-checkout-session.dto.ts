import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { PaymentMethod } from '../interfaces/payment-provider.interface';

export class CreateCheckoutSessionDto {
  @IsUUID()
  orderId: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
