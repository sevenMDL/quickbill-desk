const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  paymentIntentId: {
    type: String
  },
  status: {
    type: String,
    enum: ['processed', 'duplicate', 'failed'],
    default: 'processed'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for faster lookups
webhookLogSchema.index({ eventId: 1 });
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 * 30 }); // 30 days TTL

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
