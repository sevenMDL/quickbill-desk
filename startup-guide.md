#QuickBill Desk - Deployment Guide

##🚀 Automated Setup (Recommended)

###Prerequisites

· Docker and Docker Compose installed
· Node.js 18+ (for development)
· Git

###One-Command Deployment

```bash
# Clone the repository
git clone <repository-url>
cd quickbill-desk

# Run automated setup
./setup.sh
```

###What the Setup Script Does

1. Environment Validation

· Verifies Docker installation and permissions
· Checks available ports (3000, 3001, 27017)
· Validates system resources

2. Configuration Setup

· Generates environment files with secure defaults
· Sets up necessary directories with proper permissions
· Configures database initialization

3. Service Deployment

· Starts MongoDB with persistent storage
· Launches backend API with health checks
· Deploys frontend with production build

##🛠️ Manual Installation

###Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev

# Or production server
npm start
```

###Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev

# Or production build
npm run build
npm run preview
```

###Database Setup

```bash
# Using Docker (recommended)
docker run -d \
  --name quickbill-mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest

# Or install MongoDB locally
# Follow official MongoDB installation guide
```

###📊 Service Configuration

##Environment Variables

Backend (.env)

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/quickbill
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

Frontend (.env)

```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=QuickBill Desk
```

##🔧 Production Deployment

Using Docker Compose (Recommended for Production)

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=secure-password

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:secure-password@mongodb:27017/quickbill
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

Deploy with:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

##🔍 Health Verification

Check Service Status

```bash
# Backend health check
curl http://localhost:3001/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "memory": "healthy"
  }
}

# Frontend status
curl -I http://localhost:3000
```

###Monitor Logs

```bash
# Docker Compose logs
docker-compose logs -f

# Individual service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

##⚙️ Configuration Management

###Security Checklist

· Change default passwords in production
· Configure SSL certificates
· Set up firewall rules
· Enable database authentication
· Configure backup strategy

###Performance Optimization

· Enable gzip compression
· Configure CDN for static assets
· Set up database indexes
· Configure caching headers
· Optimize frontend build

##🚨 Troubleshooting

Common Issues

Port Conflicts

```bash
# Check what's using ports
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :27017

# Kill process if needed
sudo kill -9 <PID>
```

Database Connection Issues

```bash
# Test MongoDB connection
mongosh "mongodb://localhost:27017/quickbill"

# Check if containers are running
docker ps

# Restart services
docker-compose restart
```

Permission Issues

```bash
# Fix file permissions
chmod +x *.sh
chown -R $USER:$USER .

# Docker permission fix
sudo usermod -aG docker $USER
```

📈 Monitoring & Maintenance

Backup Strategy

```bash
# Database backup
docker exec quickbill-mongodb mongodump --out /backup/$(date +%Y%m%d)

# Application data backup
tar -czf quickbill-backup-$(date +%Y%m%d).tar.gz ./data
```


Emergency Recovery

```bash
# Complete restart
./stop-services.sh
./start-services.sh

# Database recovery
docker-compose exec mongodb mongorestore /backup/latest/
```
