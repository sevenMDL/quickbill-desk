# Quick Start Guide

## 🚀 One-Command Setup

QuickBill Desk includes an automated startup script that handles all dependencies and services:

```bash
# Make the script executable
chmod +x start-quickbill.sh

# Start all services
./start-quickbill.sh

🛠️ What the Startup Script Does

1. Prerequisite Checks

Verifies Docker installation

Checks required ports (27017, 3001, 8080)

Ensures tmux is available for process management



2. Environment Setup

Creates necessary configuration files

Installs all dependencies (npm packages)

Sets up default environment variables



3. Service Orchestration

Starts MongoDB in Docker container

Launches Backend API server (Node.js/Express)

Starts Frontend development server (Vite/React)



4. Process Management

Runs each service in separate tmux sessions

Provides easy log viewing capabilities

Includes graceful shutdown script




📊 Service Endpoints

ServiceURLPurpose

Frontendhttp://localhost:8080Main application interface
Backend APIhttp://localhost:3001REST API and business logic
MongoDBhttp://localhost:27017Database administration


🔍 Verification

Check if services are running properly:

# Test backend health
curl http://localhost:3001/api/health

# Expected response:
{"status":"healthy","timestamp":"2025-11-15T18:00:11.000Z"}

📝 Management Commands

# View service logs
tmux attach -t quickbill_mongodb    # MongoDB logs
tmux attach -t quickbill_backend    # Backend API logs  
tmux attach -t quickbill_frontend   # Frontend logs

# Stop all services
./stop-quickbill.sh

# Restart specific service
tmux kill-session -t quickbill_backend
tmux new-session -d -s quickbill_backend 'cd backend && npm run start'

⚠️ Troubleshooting

Port Conflicts: Ensure ports 27017, 3001, and 8080 are available

Docker Issues: Verify Docker is running and accessible

Permission Errors: Run startup script with appropriate permissions


🎯 Next Steps

1. Access the application at http://localhost:8080


2. Use default admin credentials (configured in environment)


3. Explore the dashboard and create your first invoice


4. Configure your business settings


5. Add client information



🔒 Production Deployment

For production deployment, refer to the Deployment Guide which covers:

Environment configuration

Database setup

SSL certificate installation

Monitoring and backup strategies
