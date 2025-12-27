-- =========================================
-- MASTER DATA SEEDING FOR NESTJS STRIPE
-- Roles, permissions, and sample data
-- =========================================

-- =========================================
-- INSERT DEFAULT ROLES
-- =========================================
INSERT INTO roles (name, description) VALUES
('ADMIN', 'Administrator with full system access'),
('STAFF', 'Staff with limited business operations access'),
('REGISTERED USER', 'Default role for registered users with basic shopping permissions')
ON CONFLICT (name) DO NOTHING;

-- =========================================
-- INSERT PERMISSIONS FOR EACH MODULE
-- =========================================
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

-- ADMIN role gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- STAFF role gets LIMITED permissions (business operations)
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

-- REGISTERED USER role gets BASIC permissions (shopping only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    -- Product: view only
    (p.module = 'product' AND p.action = 'view')
    -- Order: create, view (for own orders)
    OR (p.module = 'order' AND p.action IN ('create', 'view'))
    -- Payment: create, view (for own payments)
    OR (p.module = 'payment' AND p.action IN ('create', 'view'))
    -- User: view, update (own profile only)
    OR (p.module = 'user' AND p.action IN ('view', 'update'))
)
WHERE r.name = 'REGISTERED USER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =========================================
-- SAMPLE PRODUCTS FOR TESTING
-- =========================================
INSERT INTO products (name, description, price, currency) VALUES
('Basic Plan', 'Basic subscription plan with essential features', 999, 'USD'),
('Premium Plan', 'Premium subscription plan with advanced features', 2999, 'USD'),
('Enterprise Plan', 'Enterprise subscription plan with all features', 9999, 'USD'),
('Test Product', 'Sample product for testing purposes', 499, 'USD')
ON CONFLICT DO NOTHING;

-- =========================================
-- DATABASE INITIALIZATION COMPLETE
-- =========================================

-- Data seeding completed successfully
-- Use the following queries to verify:

-- Check data seeding completion:
-- SELECT 'Data seeded!' as status, (SELECT COUNT(*) FROM roles) as roles, (SELECT COUNT(*) FROM permissions) as permissions, (SELECT COUNT(*) FROM products) as products;

-- Show role permissions:
-- SELECT r.name, p.module, p.action FROM roles r JOIN role_permissions rp ON r.id = rp.role_id JOIN permissions p ON rp.permission_id = p.id ORDER BY r.name, p.module;
