-- =========================================
-- COMPLETE DATABASE SCHEMA FOR NESTJS STRIPE
-- Includes all tables + RBAC system + master data
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
    stripe_payment_intent_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 4. PAYMENTS TABLE (if needed for additional payment tracking)
-- =========================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- RBAC SYSTEM TABLES
-- =========================================

-- =========================================
-- 5. ROLES TABLE
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
-- 6. PERMISSIONS TABLE
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
-- 7. USER_ROLES TABLE (Many-to-Many: Users <-> Roles)
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
-- 8. ROLE_PERMISSIONS TABLE (Many-to-Many: Roles <-> Permissions)
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
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_module_action ON permissions(module, action);

-- =========================================
-- MASTER DATA SEEDING
-- =========================================

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('ADMIN', 'Administrator with full system access'),
('STAFF', 'Staff with limited access to business operations')
ON CONFLICT (name) DO NOTHING;

-- Insert permissions for each module
INSERT INTO permissions (module, action, description) VALUES
-- Product permissions
('product', 'view', 'View products'),
('product', 'create', 'Create new products'),
('product', 'update', 'Update existing products'),
('product', 'delete', 'Delete products'),

-- Order permissions
('order', 'view', 'View orders'),
('order', 'create', 'Create new orders'),
('order', 'update', 'Update existing orders'),

-- User permissions
('user', 'view', 'View users'),
('user', 'create', 'Create new users'),
('user', 'update', 'Update existing users'),
('user', 'delete', 'Delete users'),

-- Payment permissions
('payment', 'view', 'View payments'),
('payment', 'create', 'Create payments'),
('payment', 'refund', 'Process refunds')
ON CONFLICT (module, action) DO NOTHING;

-- =========================================
-- ASSIGN PERMISSIONS TO ROLES
-- =========================================

-- Get role IDs and assign permissions
-- ADMIN role gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- STAFF role gets LIMITED permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    -- Product: view, create, update (no delete)
    (p.module = 'product' AND p.action IN ('view', 'create', 'update'))
    -- Order: view, create, update
    OR (p.module = 'order' AND p.action IN ('view', 'create', 'update'))
    -- User: view only
    OR (p.module = 'user' AND p.action = 'view')
    -- Payment: view, create (no refund)
    OR (p.module = 'payment' AND p.action IN ('view', 'create'))
)
WHERE r.name = 'STAFF'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =========================================
-- SAMPLE DATA (Optional - for testing)
-- =========================================

-- Insert sample products
INSERT INTO products (name, description, price, currency) VALUES
('Basic Plan', 'Basic subscription plan', 999, 'USD'),
('Premium Plan', 'Premium subscription plan', 2999, 'USD'),
('Enterprise Plan', 'Enterprise subscription plan', 9999, 'USD')
ON CONFLICT DO NOTHING;

-- =========================================
-- USEFUL QUERIES FOR VERIFICATION
-- =========================================

-- Check database setup
/*
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Products:', COUNT(*) FROM products
UNION ALL
SELECT 'Orders:', COUNT(*) FROM orders
UNION ALL
SELECT 'Payments:', COUNT(*) FROM payments
UNION ALL
SELECT 'Roles:', COUNT(*) FROM roles
UNION ALL
SELECT 'Permissions:', COUNT(*) FROM permissions
UNION ALL
SELECT 'User Roles:', COUNT(*) FROM user_roles
UNION ALL
SELECT 'Role Permissions:', COUNT(*) FROM role_permissions;
*/

-- Check permission assignments
/*
-- Show ADMIN permissions
SELECT r.name as role, p.module, p.action, p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'ADMIN'
ORDER BY p.module, p.action;

-- Show STAFF permissions
SELECT r.name as role, p.module, p.action, p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'STAFF'
ORDER BY p.module, p.action;
*/

-- Check if user has specific permission
/*
SELECT DISTINCT 1 as has_permission
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.id = :userId
  AND p.module = :module
  AND p.action = :action
  AND u.is_active = TRUE
  AND r.is_active = TRUE
  AND p.is_active = TRUE;
*/

-- =========================================
-- COMMENTS
-- =========================================
COMMENT ON TABLE users IS 'System users with authentication and RBAC';
COMMENT ON TABLE products IS 'Products/services offered by the system';
COMMENT ON TABLE orders IS 'Customer orders and transactions';
COMMENT ON TABLE payments IS 'Payment records and transactions';
COMMENT ON TABLE roles IS 'RBAC roles (ADMIN, STAFF, etc.)';
COMMENT ON TABLE permissions IS 'Granular permissions by module and action';
COMMENT ON TABLE user_roles IS 'Many-to-many relationship between users and roles';
COMMENT ON TABLE role_permissions IS 'Many-to-many relationship between roles and permissions';

COMMENT ON COLUMN permissions.module IS 'Module name (product, order, user, payment)';
COMMENT ON COLUMN permissions.action IS 'Action name (view, create, update, delete, refund)';
COMMENT ON COLUMN user_roles.assigned_by IS 'User who assigned this role (for audit)';
COMMENT ON COLUMN role_permissions.granted_by IS 'User who granted this permission (for audit)';
