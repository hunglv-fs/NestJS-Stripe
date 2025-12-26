import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('integer')
  price: number;

  @Column()
  currency: string;

  @Column({ name: 'stripe_product_id', nullable: true })
  stripeProductId: string;

  @Column({ name: 'stripe_price_id', nullable: true })
  stripePriceId: string;

  @Column({ name: 'paypal_product_id', nullable: true })
  paypalProductId: string;

  @Column({ name: 'paypal_price_id', nullable: true })
  paypalPriceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
