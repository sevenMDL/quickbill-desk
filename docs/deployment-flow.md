# 🚀 Deployment Guide

A complete guide to deploying **QuickBill Desk** on your own server. This document reflects the **actual** requirements and setup process of your application.

---

## 🏁 Getting Started with Your Codebase

### ✅ What’s Included in This Repo
- Complete source code (backend + frontend)
- Open source under MIT license
- Self‑host anywhere

---

## 🎯 Deployment Requirements

### 🧪 Development Environment (Local Testing)

**Mandatory:**
- Node.js **18+**
- npm (comes with Node.js)
- MongoDB (choose one):
  - Docker MongoDB (**recommended**, included in scripts)
  - Local MongoDB installation
  - MongoDB Atlas (free cloud database)

**Setup Time:** *10–30 minutes*

### 🏭 Production Deployment (Live Use)

**Minimum Requirements:**
- VPS or Cloud Server (**$5–10/month**)
- Node.js **18+**
- MongoDB database (Atlas, Docker, or local)
- Domain name (recommended for HTTPS)

---

## ⚙️ Configuration Requirements

### 🔐 Mandatory Configuration
*(The app WILL NOT run without these)*

**Database Connection** (Choose ONE):
```bash
# Option 1: MongoDB Atlas (Recommended)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quickbill

# Option 2: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/quickbill

# Option 3: Docker MongoDB (Development)
MONGODB_URI=mongodb://localhost:27017/quickbill
```

Authentication:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
JWT_SECRET=min_32_character_long_secret_generate_secure_one
```

📨 Optional (But Recommended)

```bash
# Email Settings (for invoice delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=invoices@yourdomain.com

# CORS Settings
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

---

🗄️ Database Options (Choose Based on Skill Level)

1️⃣ MongoDB Atlas — Recommended

· Free 512MB tier
· Automatic backups
· Zero maintenance
· Setup time: 5 minutes

2️⃣ Docker MongoDB — Development

· Included docker-compose
· Easiest for local testing
· Data stored in Docker volumes

3️⃣ Self-Hosted MongoDB — Advanced

· Full control
· Requires manual backups
· For experienced users

---

🚀 Deployment Options

Option 1: VPS Deployment (Recommended)

1. Buy a VPS (DigitalOcean, Linode, Vultr)
2. Upload the code (SFTP or Git)
3. Configure environment file (backend/.env)
4. Start services: ./scripts/start-quickbill.sh
5. Point domain DNS to your server

Option 2: Shared Hosting

· Requires Node.js support
· Use MongoDB Atlas
· Limited but possible

Option 3: Local Server

· For internal network use only
· No internet required
· Perfect for testing

---

🔧 Configuration Steps

Step 1: Environment Setup

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Step 2: Required Variables

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/quickbill
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_secure_password
JWT_SECRET=generate_32_character_minimum_secret_here

# Optional
SMTP_HOST=smtp.gmail.com
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password
```

Step 3: Start Services

Development:

```bash
./scripts/start-quickbill.sh
```

Production:

```bash
cd backend
npm start
```

---


🛠️ Required Skills

Essential

· Terminal basics
· Using SFTP or Git
· Editing .env files
· Starting Node.js apps

Required for Deployment

· MongoDB connection management
· Generating secure credentials
· Basic server administration

---

Included in the Codebase

✔ Production-ready backend & frontend
✔ API + database models
✔ Development scripts
✔ Example .env config
✔ Full documentation

Limitations

· Single-company installation
· Admin-created users only
· JWT auth only (no Google OAuth)
· Not a hosted SaaS service
· No multi-tenant separation

---

🔍 Deployment Checklist

Before Going Live

· MongoDB connection correct
· Secure admin credentials set
· JWT secret 32+ characters
· SMTP configured (optional)
· Domain DNS setup
· SSL installed
· Backup strategy ready

After Deployment

· Login works
· Create/view invoices
· Client management functional
· PDF generation works
· Email sending works

---

💡 Support & Next Steps

If Issues Arise:

· Double-check .env
· Verify MongoDB connection
· Inspect server logs
· Confirm services are running
