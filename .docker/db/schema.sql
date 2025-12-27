-- =========================================
-- CLEAN DATABASE SCHEMA FOR NESTJS STRIPE
-- Generated from TypeORM entities
-- =========================================

-- =========================================
-- 1. USERS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    phone VARCHAR(20),
    stripe_customer_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 2. PRODUCTS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- Price in cents
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    paypal_product_id VARCHAR(255),
    paypal_price_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 3. ORDERS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    payment_provider VARCHAR(50) DEFAULT 'stripe',
    payment_intent_id VARCHAR(255),
    payment_method_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- RBAC SYSTEM TABLES
-- =========================================

-- =========================================
-- 4. ROLES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 5. PERMISSIONS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module, action)
);

-- =========================================
-- 6. USER_ROLES TABLE (Many-to-Many: Users ↔ Roles)
-- =========================================
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, role_id)
);

-- =========================================
-- 7. ROLE_PERMISSIONS TABLE (Many-to-Many: Roles ↔ Permissions)
-- =========================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(role_id, permission_id)
);

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_provider ON orders(payment_provider);
CREATE INDEX IF NOT EXISTS idx_products_stripe_product_id ON products(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_products_paypal_product_id ON products(paypal_product_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_module_action ON permissions(module, action);

-- =========================================
-- CHECK CONSTRAINTS
-- =========================================
ALTER TABLE orders ADD CONSTRAINT chk_payment_provider CHECK (payment_provider IN ('stripe', 'paypal'));
ALTER TABLE products ADD CONSTRAINT chk_currency_length CHECK (length(currency) = 3);

-- =========================================
-- TABLE COMMENTS
-- =========================================
COMMENT ON TABLE users IS 'System users with authentication and RBAC';
COMMENT ON TABLE products IS 'Products/services with multi-provider payment support';
COMMENT ON TABLE orders IS 'Customer orders with multi-payment provider support';
COMMENT ON TABLE roles IS 'RBAC roles (ADMIN, STAFF, REGISTERED USER)';
COMMENT ON TABLE permissions IS 'Granular permissions by module and action';
COMMENT ON TABLE user_roles IS 'Many-to-many relationship between users and roles';
COMMENT ON TABLE role_permissions IS 'Many-to-many relationship between roles and permissions';

COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN products.stripe_product_id IS 'Stripe product ID for synced products';
COMMENT ON COLUMN products.stripe_price_id IS 'Stripe price ID for synced products';
COMMENT ON COLUMN products.paypal_product_id IS 'PayPal product ID for synced products';
COMMENT ON COLUMN products.paypal_price_id IS 'PayPal price ID for synced products';
COMMENT ON COLUMN orders.payment_provider IS 'Payment provider used (stripe, paypal)';
COMMENT ON COLUMN orders.payment_intent_id IS 'Provider-specific payment intent ID';
COMMENT ON COLUMN orders.payment_method_id IS 'Provider-specific payment method ID';
COMMENT ON COLUMN permissions.module IS 'Module name (product, order, user, payment)';
COMMENT ON COLUMN permissions.action IS 'Action name (view, create, update, delete, refund)';
COMMENT ON COLUMN user_roles.assigned_by IS 'User who assigned this role (for audit)';
COMMENT ON COLUMN role_permissions.granted_by IS 'User who granted this permission (for audit)';
