/**
 * Client Model - MongoDB schema for client management
 * @module models/Client
 * @requires mongoose
 */

const mongoose = require('mongoose');

/**
 * Client schema definition
 * @typedef {Object} ClientSchema
 * @property {string} name - Client name (required)
 * @property {string} email - Client email (required, lowercase)
 * @property {string} address - Client address (required)
 * @property {string} phone - Client phone number (optional)
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */
const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Client email is required'],
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    required: [true, 'Client address is required']
  },
  phone: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Add index for better search performance
clientSchema.index({ name: 'text', email: 'text' });

module.exports = mongoose.model('Client', clientSchema);
