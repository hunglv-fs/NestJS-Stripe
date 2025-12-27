# Database Setup Guide - NestJS Stripe with RBAC

## 📋 Overview

This guide explains how to set up the clean database schema for the NestJS Stripe application with Role-Based Access Control (RBAC) system using separate schema and data files.

## 🗄️ Database Schema

The clean schema includes **7 tables** with proper relationships and indexes:

### Core Business Tables
1. **`users`** - System users with authentication and RBAC
2. **`products`** - Products/services with multi-provider payment support
3. **`orders`** - Customer orders with multi-payment provider support

### RBAC System Tables
4. **`roles`** - System roles (ADMIN, STAFF, REGISTERED USER)
5. **`permissions`** - Granular permissions by module and action
6. **`user_roles`** - Many-to-many: Users ↔ Roles
7. **`role_permissions`** - Many-to-many: Roles ↔ Permissions

## 🚀 Quick Setup

### Option 1: Docker Compose (Recommended)

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Docker will automatically:**
   - Create all tables from `schema.sql`
   - Insert master data from `data.sql`
   - Set up relationships and indexes

### Option 2: Manual SQL Setup

1. **Run schema first:**
   ```bash
   psql -h localhost -p 15432 -U postgres -d nestjs_stripe -f .docker/db/schema.sql
   ```

2. **Then run data:**
   ```bash
   psql -h localhost -p 15432 -U postgres -d nestjs_stripe -f .docker/db/data.sql
   ```

### Option 3: TypeORM Migration (Development)

1. **Start the application:**
   ```bash
   npm run start:dev
   ```

2. **TypeORM will automatically create tables** (when `synchronize: true` in config)

## 📊 Master Data Included

### Default Roles
- **`ADMIN`** - Full system access (all permissions)
- **`STAFF`** - Limited business operations access

### Permissions Matrix

| Module | Action | ADMIN | STAFF | Description |
|--------|--------|-------|-------|-------------|
| **product** | view | ✅ | ✅ | View products |
| **product** | create | ✅ | ✅ | Create products |
| **product** | update | ✅ | ✅ | Update products |
| **product** | delete | ✅ | ❌ | Delete products |
| **order** | view | ✅ | ✅ | View orders |
| **order** | create | ✅ | ✅ | Create orders |
| **order** | update | ✅ | ✅ | Update orders |
| **user** | view | ✅ | ✅ | View users |
| **user** | create | ✅ | ❌ | Create users |
| **user** | update | ✅ | ❌ | Update users |
| **user** | delete | ✅ | ❌ | Delete users |
| **payment** | view | ✅ | ✅ | View payments |
| **payment** | create | ✅ | ✅ | Create payments |
| **payment** | refund | ✅ | ❌ | Process refunds |

## 🔍 Verification Queries

### Check Table Creation
```sql
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
```

Expected results:
- Users: 0 (empty initially)
- Products: 3 (sample products)
- Orders: 0
- Payments: 0
- Roles: 2 (ADMIN, STAFF)
- Permissions: 13 (4+3+4+2)
- User Roles: 0
- Role Permissions: 16 (13+7)

### Check Role Permissions
```sql
-- ADMIN permissions
SELECT r.name as role, p.module, p.action, p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'ADMIN'
ORDER BY p.module, p.action;

-- STAFF permissions
SELECT r.name as role, p.module, p.action, p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'STAFF'
ORDER BY p.module, p.action;
```

## 🧪 Testing the Setup

### 1. Create Admin User
```bash
# Register a user
POST /auth/register
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123",
  "phone": "0123456789"
}

# Login to get token
POST /auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### 2. Assign Admin Role (via Database)
```sql
-- Assign ADMIN role to the user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'admin@example.com'
  AND r.name = 'ADMIN';
```

### 3. Test Permissions
```bash
# Should work (admin has all permissions)
GET /users (with admin token)

# Should work (public endpoint)
GET /products

# Should fail (staff-only or no token)
POST /users (without admin token)
```

## 🔧 Permission Checking Query

```sql
-- Check if user has specific permission
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
```

## 📁 Files Structure

```
.docker/db/
├── schema.sql           # Clean database structure (tables, indexes, constraints)
├── data.sql             # Master data (roles, permissions, sample products)
└── DATABASE-README.md   # This guide
```

## ⚠️ Important Notes

1. **Foreign Keys**: All relationships use proper foreign keys with CASCADE/SET NULL
2. **Indexes**: Performance optimized with strategic indexes
3. **Unique Constraints**: Prevents duplicate role/permission assignments
4. **Audit Trail**: `assigned_by` and `granted_by` fields for tracking
5. **Safe Updates**: `ON CONFLICT DO NOTHING` prevents duplicate data

## 🚨 Production Considerations

1. **Backup**: Always backup before running schema changes
2. **Migrations**: Consider using proper migration tools for production
3. **Environment**: Test in staging before production deployment
4. **Security**: Regular audit of role/permission assignments

## 🆘 Troubleshooting

### Schema Sync Issues
- Stop the app
- Drop conflicting tables manually
- Restart the app to let TypeORM recreate

### Permission Issues
- Check user_roles and role_permissions tables
- Verify user is active and roles are active
- Use the permission checking query above

### Connection Issues
- Verify PostgreSQL is running
- Check connection string in `.env`
- Ensure database exists

---

**🎯 The database is now fully configured with RBAC!**
