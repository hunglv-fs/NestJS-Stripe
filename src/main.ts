import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as express from 'express';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use('/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
}
bootstrap();