# Docker Setup for NestJS Stripe Application

This guide explains how to run the NestJS Stripe application using Docker Compose with PostgreSQL, Redis, and Nginx.

## Architecture

The docker-compose setup includes the following services:

- **postgres**: PostgreSQL 15 database
- **redis**: Redis 7 cache/session store
- **web**: NestJS application (built from source)
- **nginx**: Reverse proxy and load balancer

## Prerequisites

- Docker Desktop installed and running
- At least 4GB RAM allocated to Docker
- Ports 80, 3000, 5432, 6379 available on host machine

## Quick Start

1. **Ensure Docker Desktop is running**

2. **Start all services:**
   ```bash
   docker-compose up -d --build
   ```

3. **Check service status:**
   ```bash
   docker-compose ps
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f web
   ```

5. **Access the application:**
   - Main app: http://localhost (via nginx)
   - Direct app: http://localhost:3000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

## Services Details

### PostgreSQL (postgres)
- **Image**: postgres:15-alpine
- **Database**: nestjs_stripe
- **Username**: postgres
- **Password**: 123456
- **Port**: 5432
- **Volume**: postgres_data (persistent storage)
- **Init script**: complete-database-schema.sql

### Redis (redis)
- **Image**: redis:7-alpine
- **Port**: 6379
- **Health check**: redis-cli ping

### NestJS App (web)
- **Build**: Custom Dockerfile (Node.js 18 Alpine)
- **Port**: 3000
- **Environment**: Configured for Docker networking
- **Dependencies**: Waits for postgres and redis to be healthy

### Nginx (nginx)
- **Image**: nginx:alpine
- **Port**: 80
- **Config**: Custom nginx.conf with reverse proxy
- **Features**:
  - Load balancing to web service
  - Special handling for Stripe webhooks
  - Security headers
  - Gzip compression

## Environment Variables

The application uses the following environment variables (configured in docker-compose.yml):

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=123456
DB_NAME=nestjs_stripe

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

## Database Initialization

The PostgreSQL container automatically runs `complete-database-schema.sql` on first startup, which:

- Creates all tables (users, products, orders, payments, roles, permissions, etc.)
- Sets up relationships and indexes
- Inserts master data (roles and permissions)
- Adds sample products

## Useful Commands

### Development
```bash
# Start services
docker-compose up -d

# Rebuild and restart
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ destroys data)
docker-compose down -v
```

### Debugging
```bash
# Check service health
docker-compose ps

# Connect to database
docker-compose exec postgres psql -U postgres -d nestjs_stripe

# Connect to redis
docker-compose exec redis redis-cli

# View web app logs
docker-compose logs web

# Restart specific service
docker-compose restart web
```

### Database Management
```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres nestjs_stripe > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres nestjs_stripe < backup.sql

# Reset database (⚠️ destroys data)
docker-compose down -v
docker-compose up -d postgres
```

## API Endpoints

Once running, the application provides:

- **Authentication**: `/auth/login`, `/auth/register`
- **Products**: `/products`
- **Orders**: `/orders`
- **Payments**: `/payments`
- **Users**: `/users` (admin only)
- **Health Check**: `/health`

## Security Notes

- Change default passwords in production
- Use environment variables for secrets
- Configure proper SSL/TLS certificates for nginx
- Set up proper firewall rules
- Regular security updates for base images

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 80, 3000, 5432, 6379 are available
2. **Memory issues**: Increase Docker Desktop memory allocation
3. **Database connection**: Check postgres health with `docker-compose ps`
4. **Build failures**: Clear Docker cache with `docker system prune`

### Service Dependencies

Services start in this order:
1. postgres & redis (independent)
2. web (waits for postgres & redis to be healthy)
3. nginx (waits for web)

### Logs and Monitoring

```bash
# All logs
docker-compose logs

# Specific service logs
docker-compose logs postgres
docker-compose logs web

# Follow logs in real-time
docker-compose logs -f web
```

## Production Considerations

For production deployment:

1. **Use Docker secrets** instead of environment variables
2. **Configure SSL/TLS** in nginx
3. **Set up proper logging** and monitoring
4. **Use managed databases** (AWS RDS, Google Cloud SQL)
5. **Implement backup strategies**
6. **Configure resource limits** in docker-compose.yml
7. **Use Docker Swarm or Kubernetes** for scaling

## File Structure

```
.
├── docker-compose.yml              # Main orchestration file (root level)
├── .docker/
│   ├── Dockerfile                  # NestJS app build instructions
│   ├── nginx.conf                  # Nginx reverse proxy config
│   ├── .env.docker                 # Environment variables for Docker
│   └── db/
│       ├── complete-database-schema.sql    # Database initialization
│       ├── DATABASE-README.md              # Database setup guide
│       ├── reset-database.sql              # Database reset script
│       ├── update-database-multi-payment.sql
│       └── update-products-multi-provider.sql
└── src/                           # Application source code
```

## Support

If you encounter issues:

1. Check Docker Desktop is running
2. Verify ports are available
3. Check service logs with `docker-compose logs`
4. Ensure sufficient system resources
5. Try rebuilding with `docker-compose up -d --build`
