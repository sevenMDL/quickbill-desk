QuickBill Desk - Deployment Guide

🚀 Automated Setup (Recommended)

Prerequisites

· Docker and Docker Compose installed
· Node.js 18+ (for development)
· Git

One-Command Deployment

```bash
# Download the codebase zip file
unzip quickbill-desk-v1.0.0.zip
cd quickbill-desk

# Run automated setup
bash ./setup.sh
```

What the Setup Script Does

The setup.sh script is a dedicated dependency installer that prepares the QuickBill Desk environment for immediate use.

1. Backend Dependencies

Installs all required Node.js packages for the backend

Ensures a reliable and consistent environment for API execution


2. Frontend Dependencies

Installs all frontend Node.js packages and libraries

Prepares the frontend for development or production builds


🛠️ Manual Installation

Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the  server
npm start
```

Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Or production build
npm run build
npm run preview
```

Database Setup

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

📊 Service Configuration

Environment Variables

Backend (.env)

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/quickbill
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

Frontend Configuration

The frontend does not use a .env file.
All configuration, including the backend API URL, debug mode, and mock data settings, is hardcoded in src/lib/api.ts.
To change endpoints or settings, edit this file directly. This ensures consistent behavior across all environments.

🔧 Production Deployment

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

🔍 Health Verification

Check Service Status

```bash
# Backend health check
curl http://localhost:3001/api/health

```

Monitor Logs

```bash
# Docker Compose logs
docker-compose logs -f

```

⚙️ Configuration Management

Security Checklist

· Change default passwords in production
· Configure SSL certificates
· Set up firewall rules
· Enable database authentication
· Configure backup strategy

Performance Optimization

· Enable gzip compression
· Configure CDN for static assets
· Set up database indexes
· Configure caching headers
· Optimize frontend build

🚨 Troubleshooting

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

```

🆘 Support

Emergency Recovery

```bash
# Complete restart
./stop-services.sh
./start-services.sh

# Database recovery
Use biuld in bakcup and restor system 
```

---

Need additional help? Check the docs directory.
