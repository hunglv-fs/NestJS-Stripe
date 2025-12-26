export interface PaymentProvider {
  createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>): Promise<{
    id: string;
    client_secret?: string;
    approval_url?: string;
  }>;

  createCheckoutSession(amount: number, currency: string, orderId: string): Promise<{
    url: string;
    id: string;
  }>;

  createRefund(paymentId: string, amount?: number, reason?: string): Promise<{
    id: string;
    status: string;
  }>;

  verifyWebhook(rawBody: Buffer | string, signature: string): any;

  getProviderName(): string;

  createProduct(name: string, description?: string): Promise<{
    id: string;
    name: string;
    description?: string;
  }>;

  createPrice(productId: string, amount: number, currency: string): Promise<{
    id: string;
    product: string;
    unit_amount: number;
    currency: string;
  }>;
}

export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  // Future: VNPAY = 'vnpay', MOMO = 'momo', etc.
}
