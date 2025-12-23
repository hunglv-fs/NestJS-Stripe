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

## API Endpoints (cURL Commands)

### Home
```bash
curl -X GET http://localhost:3000/
```

### Users

**Create User**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }'
```

**Get All Users**
```bash
curl -X GET http://localhost:3000/users
```

**Get User by ID**
```bash
curl -X GET http://localhost:3000/users/{userId}
```

### Products

**Create Product**
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Plan",
    "description": "Monthly hosting plan",
    "price": 2000,
    "currency": "usd"
  }'
```

**Get All Products**
```bash
curl -X GET http://localhost:3000/products
```

**Get Product by ID**
```bash
curl -X GET http://localhost:3000/products/{productId}
```

### Orders

**Create Order**
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000,
    "currency": "usd"
  }'
```

### Payments

**Create Payment Intent**
```bash
curl -X POST http://localhost:3000/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-id-here"
  }'
```

**Create Checkout Session**
```bash
curl -X POST http://localhost:3000/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-id-here"
  }'
```

**Request Refund**
```bash
curl -X POST http://localhost:3000/payments/request-refund \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-id-here",
    "reason": "Customer request"
  }'
```

**Payment Success Callback**
```bash
curl -X GET "http://localhost:3000/payments/success?session_id=cs_test_your_session_id"
```

**Payment Cancel Callback**
```bash
curl -X GET http://localhost:3000/payments/cancel
```

**Stripe Webhook**
```bash
curl -X POST http://localhost:3000/payments/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: your-stripe-signature-here" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_payment_intent_id",
        "status": "succeeded",
        "amount": 2000,
        "currency": "usd",
        "metadata": {
          "orderId": "your-order-id-here"
        }
      }
    }
  }'
```

## Example Usage Flow

### 1. Complete Payment Flow

```bash
# Step 1: Create a user
USER_RESPONSE=$(curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }')

echo "User created: $USER_RESPONSE"

# Step 2: Create a product
PRODUCT_RESPONSE=$(curl -s -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Plan",
    "description": "Monthly hosting plan",
    "price": 2000,
    "currency": "usd"
  }')

echo "Product created: $PRODUCT_RESPONSE"

# Step 3: Create an order
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000,
    "currency": "usd"
  }')

echo "Order created: $ORDER_RESPONSE"

# Extract order ID (you'll need to parse this from the response)
ORDER_ID="your-order-id-here"

# Step 4: Create checkout session
CHECKOUT_RESPONSE=$(curl -s -X POST http://localhost:3000/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -d "{\"orderId\": \"$ORDER_ID\"}")

echo "Checkout session created: $CHECKOUT_RESPONSE"
```

### 2. Payment Intent Flow

```bash
# Create a payment intent (for direct payment processing)
PAYMENT_INTENT_RESPONSE=$(curl -s -X POST http://localhost:3000/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-id-here"
  }')

echo "Payment intent created: $PAYMENT_INTENT_RESPONSE"
```

### 3. Refund Flow

```bash
# Request a refund for an order
REFUND_RESPONSE=$(curl -s -X POST http://localhost:3000/payments/request-refund \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-id-here",
    "reason": "Customer requested refund"
  }')

echo "Refund requested: $REFUND_RESPONSE"
```

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

## Webhook Events

The system handles the following Stripe webhook events:

- `payment_intent.succeeded` - Updates order status to PAYMENT_SUCCEEDED
- `payment_intent.payment_failed` - Updates order status to PAYMENT_FAILED
- `checkout.session.completed` - Updates order status to PAYMENT_SUCCEEDED

## Testing Checklist

1. ✅ Create user: `POST /users`
2. ✅ Create product: `POST /products`
3. ✅ Create order: `POST /orders`
4. ✅ Create checkout session: `POST /payments/create-checkout-session`
5. ✅ Complete payment via Stripe Checkout
6. ✅ Webhook automatically updates order status
7. ✅ Request refund: `POST /payments/request-refund`

## Notes

- Replace `your-order-id-here`, `your-user-id-here`, etc. with actual IDs from responses
- The webhook endpoint requires a valid Stripe signature header
- Payment amounts are in cents (e.g., 2000 = $20.00 USD)
- Default server URL assumes `http://localhost:3000`
- Ensure your `.env` file has valid Stripe test keys for testing
