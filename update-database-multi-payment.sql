-- =========================================
-- DATABASE UPDATE FOR MULTI-PAYMENT PROVIDER SUPPORT
-- Adds support for multiple payment methods (Stripe, PayPal, etc.)
-- =========================================

-- Add new columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS payment_method_id VARCHAR(255);

-- Update existing records to have the correct payment provider
UPDATE orders
SET payment_provider = 'stripe'
WHERE payment_provider IS NULL;

-- Rename existing columns for clarity (optional - for backward compatibility)
-- ALTER TABLE orders RENAME COLUMN stripe_payment_intent_id TO payment_intent_id;
-- ALTER TABLE orders RENAME COLUMN stripe_checkout_session_id TO checkout_session_id;

-- Add check constraint for payment provider values
ALTER TABLE orders
ADD CONSTRAINT chk_payment_provider
CHECK (payment_provider IN ('stripe', 'paypal'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_provider ON orders(payment_provider);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_id ON orders(payment_method_id);

-- Update comments
COMMENT ON COLUMN orders.payment_provider IS 'Payment provider used (stripe, paypal, etc.)';
COMMENT ON COLUMN orders.payment_method_id IS 'Provider-specific payment method ID';
COMMENT ON COLUMN orders.stripe_payment_intent_id IS 'Legacy Stripe payment intent ID (use payment_method_id instead)';
COMMENT ON COLUMN orders.stripe_checkout_session_id IS 'Legacy Stripe checkout session ID (use payment_method_id instead)';

-- =========================================
-- VERIFICATION QUERIES
-- =========================================

-- Check the updated orders table structure
/*
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
*/

-- Check existing data migration
/*
SELECT
    id,
    payment_provider,
    payment_method_id,
    stripe_payment_intent_id,
    stripe_checkout_session_id,
    status
FROM orders
LIMIT 10;
*/

-- Count orders by payment provider
/*
SELECT payment_provider, COUNT(*) as order_count
FROM orders
GROUP BY payment_provider;
*/
