#!/usr/bin/env node

/**
 * Database Setup Guide - QuickBill Desk
 * @description Interactive database configuration helper
 * @version 1.0.0
 */

console.log(`
QuickBill Desk - Database Setup Guide
=====================================

Current database mode: In-memory (data lost on restart)

To enable persistent data storage, configure one of the following options:

Option 1: Local MongoDB Installation
------------------------------------
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Restart application
4. Data persistence enabled

Option 2: Docker MongoDB Container
----------------------------------
1. Install Docker runtime
2. Restart application  
3. Automatic container initialization
4. Data persists in Docker volume

Option 3: MongoDB Atlas Cloud Service
-------------------------------------
1. Create MongoDB Atlas account
2. Provision free cluster
3. Configure connection string
4. Update environment configuration:
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quickbill
5. Restart application
6. Cloud data persistence enabled

Option 4: Custom MongoDB Deployment
-----------------------------------
Update environment configuration:
MONGODB_URI=mongodb://your-server:27017/quickbill

For additional assistance, refer to system documentation.
`);
