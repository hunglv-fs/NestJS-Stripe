import { IsUUID, IsOptional, IsString } from 'class-validator';

export class RequestRefundDto {
  @IsUUID()
  orderId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}