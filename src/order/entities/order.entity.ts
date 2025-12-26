import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PaymentMethod } from '../../payment/interfaces/payment-provider.interface';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('integer')
  amount: number;

  @Column()
  currency: string;

  @Column()
  status: string;

  @Column({ name: 'payment_provider', type: 'enum', enum: PaymentMethod, default: PaymentMethod.STRIPE })
  paymentProvider: PaymentMethod;

  @Column({ name: 'payment_intent_id', nullable: true })
  paymentIntentId: string;

  @Column({ name: 'payment_method_id', nullable: true })
  paymentMethodId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
