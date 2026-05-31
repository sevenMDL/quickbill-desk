const stripe = require('stripe');
const config = require('../config');
const Invoice = require('../models/Invoice');

/**
 * Stripe Payment Service
 * @module services/stripeService
 */
class StripeService {
  constructor() {
    this.stripe = stripe(config.stripe.secretKey);
    this.webhookSecret = config.stripe.webhookSecret;
  }

  /**
   * Create a payment intent for an invoice
   * @param {Object} invoice - Invoice document
   * @returns {Promise<Object>} Stripe payment intent
		   */
		async createPaymentIntent(invoice) {
		  try {
		    console.log('🔄 Creating Payment Intent for invoice:', {
		      invoiceId: invoice._id,
		      amount: invoice.total,
		      currency: invoice.currency,
		      clientEmail: invoice.clientEmail
		    });

		    // Validate invoice
		    if (!invoice || !invoice.total || invoice.total <= 0) {
		      throw new Error('Invalid invoice amount: ' + (invoice?.total || 'undefined'));
		    }

		    // ✅ ENSURE PROPER AMOUNT FORMAT (cents)
		    const amountInCents = Math.round(invoice.total * 100);
		    console.log('💰 Amount conversion:', invoice.total, '→', amountInCents, 'cents');

		    // Create payment intent
		    const paymentIntent = await this.stripe.paymentIntents.create({
		      amount: amountInCents,
		      currency: (invoice.currency || 'usd').toLowerCase(),
		      metadata: {
		        invoiceId: invoice._id?.toString() || invoice.id,
		        invoiceNumber: invoice.invoiceNumber,
		        clientEmail: invoice.clientEmail
		      },
		      automatic_payment_methods: {
		        enabled: true,
		      },
		      description: `Payment for invoice ${invoice.invoiceNumber}`,
		      // ✅ FIXED: Remove statement_descriptor and use statement_descriptor_suffix instead
		      statement_descriptor_suffix: `INV${invoice.invoiceNumber?.substring(0, 10)}`, // Max 10 chars
		      receipt_email: invoice.clientEmail
		    });

		    console.log('✅ Payment Intent created successfully:', {
		      id: paymentIntent.id,
		      status: paymentIntent.status,
		      client_secret: paymentIntent.client_secret ? '***present***' : 'MISSING!',
		      amount: paymentIntent.amount,
		      currency: paymentIntent.currency
		    });

		    return {
		      id: paymentIntent.id,
		      client_secret: paymentIntent.client_secret, // ✅ CRITICAL: This must be present
		      status: paymentIntent.status,
		      amount: paymentIntent.amount,
		      currency: paymentIntent.currency
		    };
		  } catch (error) {
		    console.error('❌ Stripe payment intent creation failed:', error);
		    console.error('Stripe error details:', error.raw ? error.raw : 'No raw error');
		    throw new Error(`Payment processing failed: ${error.message}`);
		  }
		}

  /**
   * Handle Stripe webhook events
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Stripe signature
   * @returns {Promise<Object>} Webhook processing result
   */
  async handleWebhook(payload, signature) {
    try {
      // Verify webhook signature
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      console.log(`🔔 Stripe webhook received: ${event.type}`);

      let invoiceId;
      let paymentStatus;
      let transactionId;

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          invoiceId = event.data.object.metadata.invoiceId;
          paymentStatus = 'paid';
          transactionId = event.data.object.id;
          break;

        case 'payment_intent.payment_failed':
          invoiceId = event.data.object.metadata.invoiceId;
          paymentStatus = 'failed';
          transactionId = event.data.object.id;
          break;

        case 'payment_intent.canceled':
          invoiceId = event.data.object.metadata.invoiceId;
          paymentStatus = 'failed';
          transactionId = event.data.object.id;
          break;

        default:
          console.log(`🤷 Unhandled event type: ${event.type}`);
          return { success: true, handled: false };
      }

      if (!invoiceId) {
        console.error('❌ No invoice ID found in webhook');
        return { success: false, error: 'No invoice ID found' };
      }

      // Update invoice in database
      const updateData = {
        paymentStatus,
        paymentMethod: 'stripe',
        paymentGateway: 'stripe',
        transactionId
      };

      if (paymentStatus === 'paid') {
        updateData.status = 'paid';
        updateData.paymentDate = new Date();
      }

      const updatedInvoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        updateData,
        { new: true, runValidators: true }
      ).populate('clientId');

      if (!updatedInvoice) {
        console.error(`❌ Invoice not found: ${invoiceId}`);
        return { success: false, error: 'Invoice not found' };
      }

      console.log(`✅ Updated invoice ${updatedInvoice.invoiceNumber} to ${paymentStatus}`);

      // TODO: Send payment confirmation email (we'll implement in Step 6)

      return { 
        success: true, 
        handled: true,
        invoice: updatedInvoice,
        status: paymentStatus 
      };

    } catch (error) {
      console.error('❌ Stripe webhook processing failed:', error);
      throw new Error(`Webhook processing failed: ${error.message}`);
    }
  }

  /**
   * Check payment intent status
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Object>} Payment intent status
   */
  async checkPaymentStatus(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        client_secret: paymentIntent.client_secret,
        invoiceId: paymentIntent.metadata.invoiceId
      };
    } catch (error) {
      console.error('❌ Stripe payment status check failed:', error);
      throw new Error(`Payment status check failed: ${error.message}`);
    }
  }

  /**
   * Check if Stripe is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return config.stripe.isConfigured;
  }
}

module.exports = new StripeService();
