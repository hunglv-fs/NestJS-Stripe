import { Module } from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [PaypalService],
  exports: [PaypalService],
})
export class PaypalModule {}
