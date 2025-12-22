# NestJS Stripe Payment System

A payment processing system built with NestJS and Stripe integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
DATABASE_URL=postgresql://postgres:password@localhost:5432/nestjs_stripe
```

3. Start the application:
```bash
npm run dev:start
```

## API Endpoints

### Home
**GET** `/`
```json
Response:
{
  "name": "NestJS Stripe Payment System",
  "version": "0.0.1",
  "description": "A payment processing system built with NestJS and Stripe",
  "endpoints": {
    "orders": "POST /orders - Create new order",
    "createIntent": "POST /payments/create-intent - Create payment intent",
    "createCheckout": "POST /payments/create-checkout-session - Create checkout session",
    "requestRefund": "POST /payments/request-refund - Request refund",
    "webhook": "POST /payments/webhook - Stripe webhook handler"
  },
  "status": "running"
}
```

### Users

**POST** `/users`
```json
Request:
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}

Response:
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "stripeCustomerId": "cus_stripe_id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**GET** `/users`
```json
Response:
[
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "stripeCustomerId": "cus_stripe_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**GET** `/users/:id`
```json
Response:
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "stripeCustomerId": "cus_stripe_id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Products

**POST** `/products`
```json
Request:
{
  "name": "Premium Plan",
  "description": "Monthly hosting plan",
  "price": 2000,
  "currency": "usd"
}

Response:
{
  "id": "uuid",
  "name": "Premium Plan",
  "description": "Monthly hosting plan",
  "price": 2000,
  "currency": "usd",
  "stripeProductId": "prod_stripe_id",
  "stripePriceId": "price_stripe_id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**GET** `/products`
```json
Response:
[
  {
    "id": "uuid",
    "name": "Premium Plan",
    "description": "Monthly hosting plan",
    "price": 2000,
    "currency": "usd",
    "stripeProductId": "prod_stripe_id",
    "stripePriceId": "price_stripe_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**GET** `/products/:id`
```json
Response:
{
  "id": "uuid",
  "name": "Premium Plan",
  "description": "Monthly hosting plan",
  "price": 2000,
  "currency": "usd",
  "stripeProductId": "prod_stripe_id",
  "stripePriceId": "price_stripe_id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Orders

**POST** `/orders`
```json
Request:
{
  "amount": 2000,
  "currency": "usd"
}

Response:
{
  "id": "uuid",
  "amount": 2000,
  "currency": "usd",
  "status": "pending",
  "paymentIntentId": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Payments

**POST** `/payments/create-intent`
```json
Request:
{
  "orderId": "uuid"
}

Response:
{
  "client_secret": "pi_xxx_secret_xxx"
}
```

**POST** `/payments/create-checkout-session`
```json
Request:
{
  "orderId": "uuid"
}

Response:
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxx"
}
```

**POST** `/payments/request-refund`
```json
Request:
{
  "orderId": "uuid",
  "reason": "Customer request"
}

Response:
{
  "message": "Refund requested successfully"
}
```

**GET** `/payments/success?session_id=cs_xxx`
```json
Response:
{
  "message": "Payment successful",
  "sessionId": "cs_xxx"
}
```

**GET** `/payments/cancel`
```json
Response:
{
  "message": "Payment cancelled"
}
```

**POST** `/payments/webhook`
- Stripe webhook endpoint
- Handles events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.completed`
- Updates order status automatically

## Order Status Flow

1. **pending** - Order created
2. **PAYMENT_INTENT_CREATED** - PaymentIntent created
3. **PAYMENT_SUCCEEDED** - Payment completed
4. **PAYMENT_FAILED** - Payment failed
5. **REFUND_REQUESTED** - Refund initiated

## Stripe Integration

- **Auto-sync**: Users and Products automatically sync with Stripe
- **Webhooks**: Real-time payment status updates
- **Dual storage**: Data stored in both database and Stripe
- **Reference IDs**: `stripeCustomerId`, `stripeProductId`, `stripePriceId` for mapping

## Testing

1. Create user: `POST /users`
2. Create product: `POST /products`
3. Create order: `POST /orders`
4. Create checkout session: `POST /payments/create-checkout-session`
5. Complete payment via Stripe Checkout
6. Webhook automatically updates order status
7. Request refund: `POST /payments/request-refund`