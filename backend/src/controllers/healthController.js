const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');

/**
 * Health Check Controller - Monitors system health and performance metrics
 * @module controllers/healthController
 * @requires mongoose
 * @requires ../config
 * @requires ../utils/logger
 * @requires ../models/Invoice
 * @requires ../models/Client
 */

// Cache for health check results to reduce database load
let healthCache = {
  data: null,
  lastUpdated: null,
  isUpdating: false
};

class HealthController {
  /**
   * Get comprehensive system health status with caching
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with health status
   */
  static async getHealth(req, res) {
    try {
      const cacheMs = config.health.cacheMs || 30000;
      
      // Return cached data if available and not expired
      if (healthCache.data && healthCache.lastUpdated && 
          Date.now() - healthCache.lastUpdated < cacheMs) {
        return res.status(200).json(healthCache.data);
      }

      // If update is already in progress, return current cache
      if (healthCache.isUpdating) {
        return res.status(200).json(healthCache.data || await HealthController.getBasicHealth());
      }

      // Update health data
      healthCache.isUpdating = true;
      const healthData = await HealthController.generateHealthData();
      
      healthCache.data = healthData;
      healthCache.lastUpdated = Date.now();
      healthCache.isUpdating = false;

      res.status(200).json(healthData);
    } catch (error) {
      logger.error('Health check error:', error);
      healthCache.isUpdating = false;
      
      // Return basic health data even if detailed check fails
      const basicHealth = await HealthController.getBasicHealth();
      basicHealth.status = 'degraded';
      basicHealth.error = error.message;
      
      res.status(200).json(basicHealth);
    }
  }

  /**
   * Generate comprehensive health data with parallel checks
   * @returns {Object} Complete health status object
   */
  static async generateHealthData() {
    const startTime = Date.now();
    
    // Parallel health checks for performance
    const [dbHealth, systemHealth, businessMetrics, servicesHealth] = await Promise.all([
      HealthController.checkDatabase(),
      HealthController.checkSystem(),
      HealthController.getBusinessMetrics(),
      HealthController.checkServices()
    ]);

    const responseTime = Date.now() - startTime;

    // Determine overall status based on critical components
    let overallStatus = 'healthy';
    if (dbHealth.status !== 'connected' || servicesHealth.email !== 'operational') {
      overallStatus = 'degraded';
    }
    if (dbHealth.status === 'disconnected') {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      responseTime: `${responseTime}ms`,
      
      database: dbHealth,
      system: systemHealth,
      services: servicesHealth,
      business_metrics: businessMetrics,
      
      cache: {
        cached: healthCache.data !== null,
        lastUpdated: healthCache.lastUpdated,
        nextUpdate: healthCache.lastUpdated ? healthCache.lastUpdated + (config.health.cacheMs || 30000) : null
      }
    };
  }

  /**
   * Get basic system health without external dependencies
   * @returns {Object} Basic health status
   */
  static async getBasicHealth() {
    const memoryUsage = process.memoryUsage();
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      environment: config.env,
      memory_status: memoryPercentage > 85 ? 'warning' : 'healthy',
      memory_usage: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    };
  }

  /**
   * Check database connectivity and performance
   * @returns {Object} Database health status
   */
  static async checkDatabase() {
    try {
      const startTime = Date.now();
      
      // Check MongoDB connection state
      const dbState = mongoose.connection.readyState;
      let status = 'disconnected';
      let dbType = 'unknown';

      if (dbState === 1) {
        status = 'connected';
        // Determine database type
        dbType = mongoose.connection.client && mongoose.connection.client.s ? 'mongodb' : 'in-memory';
        
        // Test query performance with ping
        const testStart = Date.now();
        await mongoose.connection.db.admin().ping();
        const latency = Date.now() - testStart;

        // Get collection information
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(coll => coll.name);

        return {
          status,
          type: dbType,
          latency: `${latency}ms`,
          collections: collectionNames,
          details: {
            host: mongoose.connection.host,
            name: mongoose.connection.name,
            readyState: dbState
          }
        };
      } else if (dbState === 2) {
        status = 'connecting';
      } else if (dbState === 3) {
        status = 'disconnecting';
      }

      return {
        status,
        type: 'unknown',
        latency: null,
        collections: [],
        error: `Database connection state: ${dbState}`
      };

    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'disconnected',
        type: 'unknown',
        latency: null,
        collections: [],
        error: error.message
      };
    }
  }

  /**
   * Check system resources and environment
   * @returns {Object} System health status
   */
  static async checkSystem() {
    const memoryUsage = process.memoryUsage();
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const memoryStatus = memoryPercentage > 90 ? 'critical' : memoryPercentage > 85 ? 'warning' : 'healthy';
    
    return {
      uptime: `${Math.floor(process.uptime() / 86400)} days ${Math.floor((process.uptime() % 86400) / 3600)} hours`,
      memory_usage: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        percentage: `${memoryPercentage.toFixed(1)}%`,
        status: memoryStatus,
        threshold_warning: '85%',
        threshold_critical: '90%'
      },
      node_version: process.version,
      environment: config.env,
      pid: process.pid,
      platform: process.platform,
      arch: process.arch
    };
  }

  /**
   * Get business metrics and invoice statistics
   * @returns {Object} Business metrics data
   */
  static async getBusinessMetrics() {
    try {
      const [invoiceStats, clientCount, recentActivity] = await Promise.all([
        Invoice.aggregate([
          {
            $group: {
              _id: null,
              totalInvoices: { $sum: 1 },
              totalRevenue: { $sum: '$total' },
              unpaidAmount: {
                $sum: { $cond: [{ $in: ['$status', ['unpaid', 'overdue']] }, '$total', 0] }
              },
              draftCount: {
                $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
              }
            }
          }
        ]),
        Client.countDocuments(),
        Invoice.find()
          .sort({ updatedAt: -1 })
          .limit(5)
          .select('invoiceNumber status total updatedAt')
          .lean()
      ]);

      const stats = invoiceStats[0] || {
        totalInvoices: 0,
        totalRevenue: 0,
        unpaidAmount: 0,
        draftCount: 0
      };

      return {
        total_invoices: stats.totalInvoices,
        total_clients: clientCount,
        total_revenue: Math.round(stats.totalRevenue * 100) / 100,
        unpaid_amount: Math.round(stats.unpaidAmount * 100) / 100,
        draft_invoices: stats.draftCount,
        recent_activity: recentActivity.map(inv => ({
          invoice_number: inv.invoiceNumber,
          status: inv.status,
          amount: inv.total,
          last_updated: inv.updatedAt
        }))
      };
    } catch (error) {
      logger.error('Business metrics check failed:', error);
      return {
        total_invoices: 0,
        total_clients: 0,
        total_revenue: 0,
        unpaid_amount: 0,
        draft_invoices: 0,
        recent_activity: [],
        error: error.message
      };
    }
  }

		/**
		 * Check external service connectivity
		 * @returns {Object} Services health status
		 */
		static async checkServices() {
		  const services = {
		    email: 'operational',
		    pdf_generation: 'operational',
		    backup: 'operational'
		  };

		  // Email service health check
		  if (config.smtp.isConfigured) {
		    try {
		      const nodemailer = require('nodemailer');
		      const transporter = nodemailer.createTransport({
		        host: config.smtp.host,
		        port: config.smtp.port,
		        secure: config.smtp.port === 465,
		        auth: {
		          user: config.smtp.user,
		          pass: config.smtp.pass
		        }
		      });
		      await transporter.verify();
		    } catch (error) {
		      services.email = 'degraded';
		      logger.warn('Email service health check failed:', error.message);
		    }
		  } else {
		    services.email = 'not_configured';
		  }

		  // Backup service health check
		  try {
		    const AutoBackupService = require('../services/AutoBackupService');
		    const backupStatus = AutoBackupService.getStatus();
		    services.backup = backupStatus.running ? 'operational' : 'degraded';
		  } catch (error) {
		    services.backup = 'degraded';
		    logger.warn('Backup service health check failed:', error.message);
		  }

		  return services;
		}

  /**
   * Manually refresh health data cache (admin function)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with refreshed health data
   */
  static async refreshHealthData(req, res) {
    healthCache.data = null;
    healthCache.lastUpdated = null;
    
    logger.info('Health cache manually refreshed by admin', { 
      username: req.user?.username 
    });
    
    const newHealthData = await HealthController.generateHealthData();
    
    res.status(200).json({
      success: true,
      message: 'Health data refreshed successfully',
      data: newHealthData
    });
  }
}

module.exports = HealthController;
