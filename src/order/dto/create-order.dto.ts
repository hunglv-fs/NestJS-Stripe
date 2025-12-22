import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;
}