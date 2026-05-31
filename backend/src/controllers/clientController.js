const asyncHandler = require('../middleware/asyncHandler');
const Client = require('../models/Client');
const { clientValidation } = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Client Controller - Handles all client-related operations
 * @module controllers/clientController
 * @requires ../middleware/asyncHandler
 * @requires ../models/Client
 * @requires ../utils/validation
 */
class ClientController {
  /**
   * Get all clients with optional search filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with clients array
   */
  static async getClients(req, res) {
    const { search } = req.query;
    
    let query = {};
    
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const clients = await Client.find(query).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients
    });
  }

  /**
   * Get single client by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with client data
   */
  static async getClient(req, res) {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: client
    });
  }

  /**
   * Create a new client
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with created client data
   */
  static async createClient(req, res) {
    // Validate request body
    const { error } = clientValidation.create.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const client = await Client.create(req.body);
    
    res.status(201).json({
      success: true,
      data: client
    });
  }

  /**
   * Update existing client
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with updated client data
   */
  static async updateClient(req, res) {
    // Validate request body
    const { error } = clientValidation.update.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    let client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: client
    });
  }

		/**
		 * Delete client if no invoices exist
		 * @param {Object} req - Express request object
		 * @param {Object} res - Express response object
		 * @returns {Object} JSON response with deletion result
		 */
		static async deleteClient(req, res) {
		  try {
		    const client = await Client.findById(req.params.id);
		    
		    if (!client) {
		      return res.status(404).json({
		        success: false,
		        message: 'Client not found'
		      });
		    }

		    // Check if client has invoices
		    const Invoice = require('../models/Invoice');
		    const invoiceCount = await Invoice.countDocuments({ clientId: req.params.id });
		    
		    if (invoiceCount > 0) {
		      return res.status(400).json({
		        success: false,
		        message: 'Cannot delete client with existing invoices',
		        errorCode: 'CLIENT_HAS_INVOICES',
		        invoiceCount: invoiceCount
		      });
		    }

		    await Client.findByIdAndDelete(req.params.id);
		    
		    res.status(200).json({
		      success: true,
		      message: 'Client deleted successfully'
		    });
		  } catch (error) {
		    console.error('Client deletion failed:', error);
		    res.status(500).json({
		      success: false,
		      message: 'Failed to delete client',
		      error: error.message
		    });
		  }
		}
}

module.exports = ClientController;
