/**
 * Payment Routes - Handles payment processing and webhooks
 * @module routes/paymentRoutes
 * @requires express
 * @requires ../controllers/paymentController
 */

const express = require('express');
const PaymentController = require('../controllers/paymentController');

const router = express.Router();

// Webhook endpoints (no auth required - gateways call these directly)
router.route('/webhooks/stripe')
  .post(
    express.raw({ type: 'application/json' }), // Important: raw body for Stripe
    PaymentController.handleStripeWebhook
  );

// Keep the generic webhook route for other gateways
router.route('/webhooks/:gateway')
  .post(PaymentController.handleWebhook);

// Payment processing endpoints (require auth)
router.route('/invoices/:invoiceId/payment-intent')
  .post(PaymentController.createPaymentIntent);

router.route('/invoices/:invoiceId/payment-status')
  .get(PaymentController.checkPaymentStatus)
  .put(PaymentController.checkPaymentStatus); // Allow manual status updates

router.route('/invoices/:invoiceId/payment-methods')
  .get(PaymentController.getPaymentMethods);

module.exports = router;
