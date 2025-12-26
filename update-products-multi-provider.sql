-- =========================================
-- DATABASE UPDATE FOR MULTI-PROVIDER PRODUCT SYNC
-- Adds support for syncing products to multiple payment providers
-- =========================================

-- Add PayPal fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS paypal_product_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS paypal_price_id VARCHAR(255);

-- Add comments for new columns
COMMENT ON COLUMN products.paypal_product_id IS 'PayPal product ID for synced products';
COMMENT ON COLUMN products.paypal_price_id IS 'PayPal price ID for synced products';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_stripe_product_id ON products(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_products_paypal_product_id ON products(paypal_product_id);

-- =========================================
-- VERIFICATION QUERIES
-- =========================================

-- Check the updated products table structure
/*
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
*/

-- Check existing products sync status
/*
SELECT
    id,
    name,
    price,
    currency,
    stripe_product_id,
    stripe_price_id,
    paypal_product_id,
    paypal_price_id,
    CASE
        WHEN stripe_product_id IS NOT NULL AND stripe_price_id IS NOT NULL THEN 'Synced to Stripe'
        ELSE 'Not synced to Stripe'
    END as stripe_status,
    CASE
        WHEN paypal_product_id IS NOT NULL AND paypal_price_id IS NOT NULL THEN 'Synced to PayPal'
        ELSE 'Not synced to PayPal'
    END as paypal_status
FROM products
ORDER BY created_at DESC;
*/

-- Count products by sync status
/*
SELECT
    COUNT(*) as total_products,
    COUNT(stripe_product_id) as synced_to_stripe,
    COUNT(paypal_product_id) as synced_to_paypal,
    COUNT(*) - COUNT(stripe_product_id) as not_synced_to_stripe,
    COUNT(*) - COUNT(paypal_product_id) as not_synced_to_paypal
FROM products;
*/
