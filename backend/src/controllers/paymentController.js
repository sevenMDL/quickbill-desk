const asyncHandler = require('../middleware/asyncHandler');
const Invoice = require('../models/Invoice');
const Settings = require('../models/Settings');
const stripeService = require('../services/stripeService');
const WebhookLog = require('../models/WebhookLog');
const EmailService = require('../services/emailService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Payment Controller - Handles payment processing and webhooks
 * @module controllers/paymentController
 */
class PaymentController {

  /**
   * Handle payment webhooks from various gateways
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async handleWebhook(req, res) {
    const gateway = req.params.gateway;
    const payload = req.body;

    try {
      console.log(`🔔 Received webhook from ${gateway}:`, payload);

      let invoiceId;
      let paymentStatus;
      let transactionId;

      // Parse webhook based on gateway
      switch (gateway) {
        case 'stripe':
          ({ invoiceId, paymentStatus, transactionId } = PaymentController.parseStripeWebhook(payload));
          break;
        case 'paypal':
          ({ invoiceId, paymentStatus, transactionId } = PaymentController.parsePayPalWebhook(payload));
          break;
        default:
          return res.status(400).json({
            success: false,
            message: `Unsupported gateway: ${gateway}`
          });
      }

      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          message: 'No invoice ID found in webhook payload'
        });
      }

      // Update invoice status
      const updateData = {
        paymentStatus,
        transactionId,
        paymentGateway: gateway
      };

      if (paymentStatus === 'paid') {
        updateData.paymentDate = new Date();
        updateData.status = 'paid'; // Also update main invoice status
      }

      const invoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!invoice) {
        console.error(`❌ Invoice not found: ${invoiceId}`);
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }

      console.log(`✅ Updated invoice ${invoice.invoiceNumber} to ${paymentStatus}`);

      // Send payment confirmation email for successful payments
      if (paymentStatus === 'paid') {
        await EmailService.sendPaymentConfirmation(invoice);
      }

      res.status(200).json({
        success: true,
        message: `Payment status updated to ${paymentStatus}`
      });

    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      res.status(500).json({
        success: false,
        message: 'Webhook processing failed',
        error: error.message
      });
    }
  }

  /**
   * Parse Stripe webhook payload
   * @param {Object} payload - Stripe webhook data
   * @returns {Object} Parsed payment data
   */
  static parseStripeWebhook(payload) {
    const event = payload;
    let invoiceId, paymentStatus, transactionId;

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

      case 'checkout.session.completed':
        invoiceId = event.data.object.metadata.invoiceId;
        paymentStatus = 'paid';
        transactionId = event.data.object.id;
        break;
    }

    return { invoiceId, paymentStatus, transactionId };
  }

  /**
   * Parse PayPal webhook payload
   * @param {Object} payload - PayPal webhook data
   * @returns {Object} Parsed payment data
   */
  static parsePayPalWebhook(payload) {
    // Placeholder for PayPal webhook parsing
    // You'll implement this when adding PayPal integration
    return {
      invoiceId: payload.resource.invoice_id || payload.resource.custom_id,
      paymentStatus: payload.event_type.includes('PAYMENT.CAPTURE.COMPLETED') ? 'paid' : 'pending',
      transactionId: payload.resource.id
    };
  }

  /**
   * Create payment intent (for Stripe)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createPaymentIntent(req, res) {
    try {
      const { invoiceId } = req.params;
      const { gateway = 'stripe' } = req.body;

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }

      // Add metadata to payment intent for webhook processing
      const paymentIntent = await stripeService.createPaymentIntent({
        ...invoice.toObject(),
        metadata: {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          clientEmail: invoice.clientEmail
        }
      });

      // Update invoice with payment processing status
      await Invoice.findByIdAndUpdate(invoiceId, {
        paymentStatus: 'processing',
        paymentMethod: 'stripe',
        paymentGateway: 'stripe', 
        transactionId: paymentIntent.id
      });

      res.status(200).json({
        success: true,
        data: paymentIntent,
        message: 'Payment intent created'
      });

    } catch (error) {
      console.error('❌ Create payment intent error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: error.message
      });
    }
  }

  /**
   * Handle Stripe webhook specifically
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async handleStripeWebhook(req, res) {
    const signature = req.headers['stripe-signature'];
    
    try {
      // 1. Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || 'whsec_ZsjcfufZzy6FvR5tiAasCkL8O0zs9KBJ' // Your hardcoded secret
      );

      console.log(`🔔 Webhook received: ${event.type}`);

      // 2. Idempotency check - prevent duplicate processing
      const existingWebhook = await WebhookLog.findOne({ eventId: event.id });
      if (existingWebhook) {
        console.log(`⏭️ Webhook already processed: ${event.id}`);
        return res.status(200).json({ received: true, handled: false });
      }

      // 3. Log the webhook immediately
      await WebhookLog.create({
        eventId: event.id,
        type: event.type,
        payload: event.data.object
      });

      // 4. Process different event types
      let result;
      switch (event.type) {
        case 'payment_intent.succeeded':
          result = await this.handlePaymentSuccess(event.data.object);
          break;
        
        case 'payment_intent.payment_failed':
          result = await this.handlePaymentFailure(event.data.object);
          break;
        
        case 'payment_intent.canceled':
          result = await this.handlePaymentCanceled(event.data.object);
          break;
        
        default:
          console.log(`🤷 Unhandled event type: ${event.type}`);
          return res.status(200).json({ received: true, handled: false });
      }

      // 5. Update webhook log with result
      await WebhookLog.findOneAndUpdate(
        { eventId: event.id },
        { 
          invoiceId: result?.invoiceId,
          paymentIntentId: event.data.object.id,
          status: result?.success ? 'processed' : 'failed'
        }
      );

      res.status(200).json({ received: true, handled: true });

    } catch (error) {
      console.error('❌ Webhook processing failed:', error);
      
      // Log failed webhook
      if (event?.id) {
        await WebhookLog.findOneAndUpdate(
          { eventId: event.id },
          { status: 'failed' }
        );
      }
      
      res.status(400).json({ error: `Webhook Error: ${error.message}` });
    }
  }

  /**
   * Check payment status manually
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async checkPaymentStatus(req, res) {
    try {
      const { invoiceId } = req.params;

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }

      // For manual/bank transfer payments, allow status updates
      if (req.method === 'PUT') {
        const { paymentStatus, transactionId } = req.body;

        const updateData = {
          paymentStatus,
          paymentMethod: invoice.paymentMethod || 'manual',
          transactionId: transactionId || invoice.transactionId
        };

        // If marking as paid, also update main invoice status and set payment date
        if (paymentStatus === 'paid') {
          updateData.status = 'paid';
          updateData.paymentDate = new Date();

          // Also update payment method if not set
          if (!invoice.paymentMethod) {
            updateData.paymentMethod = 'manual';
          }

          // Send payment confirmation email
          const updatedInvoice = await Invoice.findByIdAndUpdate(
            invoiceId,
            updateData,
            { new: true, runValidators: true }
          ).populate('clientId');

          await EmailService.sendPaymentConfirmation(updatedInvoice);

          return res.status(200).json({
            success: true,
            data: updatedInvoice,
            message: `Payment status updated to ${paymentStatus}`
          });
        }

        const updatedInvoice = await Invoice.findByIdAndUpdate(
          invoiceId,
          updateData,
          { new: true, runValidators: true }
        ).populate('clientId');

        return res.status(200).json({
          success: true,
          data: updatedInvoice,
          message: `Payment status updated to ${paymentStatus}`
        });
      }

      // For GET requests, return current status
      res.status(200).json({
        success: true,
        data: {
          paymentStatus: invoice.paymentStatus,
          transactionId: invoice.transactionId,
          paymentMethod: invoice.paymentMethod
        }
      });

    } catch (error) {
      console.error('❌ Check payment status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check payment status',
        error: error.message
      });
    }
  }

  /**
   * Get payment methods available for an invoice
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getPaymentMethods(req, res) {
    try {
      const { invoiceId } = req.params;

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }

      const settings = await Settings.getSettings();

      // Return available payment methods based on settings and invoice
      const availableMethods = [
        {
          id: 'manual',
          name: 'Manual Payment',
          description: 'Bank transfer or other manual payment method',
          requiresRedirect: false
        },
        {
          id: 'bank_transfer',
          name: 'Bank Transfer',
          description: 'Direct bank transfer',
          requiresRedirect: false
        }
      ];

      // Add Stripe if configured
      if (settings.stripeSecretKey && settings.stripePublishableKey) {
        availableMethods.push({
          id: 'stripe',
          name: 'Credit/Debit Card (Stripe)',
          description: 'Pay with credit card, debit card, or other Stripe methods',
          requiresRedirect: true
        });
      }

      // Add PayPal if configured
      if (settings.paypalClientId) {
        availableMethods.push({
          id: 'paypal',
          name: 'PayPal',
          description: 'Pay with PayPal account',
          requiresRedirect: true
        });
      }

      res.status(200).json({
        success: true,
        data: availableMethods
      });

    } catch (error) {
      console.error('❌ Get payment methods error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment methods',
        error: error.message
      });
    }
  }

		/**
		 * Handle successful payment with enhanced data extraction
		 */
		static async handlePaymentSuccess(paymentIntent) {
		  try {
		    const invoiceId = paymentIntent.metadata.invoiceId;
		    
		    if (!invoiceId) {
		      console.error('❌ No invoice ID in payment intent metadata');
		      return { success: false, error: 'No invoice ID' };
		    }

		    // ✅ ENHANCED: Extract payment method details
		    const charge = paymentIntent.charges?.data[0];
		    const paymentMethod = charge?.payment_method_details;
		    
		    let paymentMethodType = 'stripe';
		    let paymentMethodDetails = {};
		    
		    if (paymentMethod?.type === 'card') {
		      paymentMethodType = 'card';
		      paymentMethodDetails = {
		        brand: paymentMethod.card?.brand,
		        last4: paymentMethod.card?.last4,
		        country: paymentMethod.card?.country,
		        funding: paymentMethod.card?.funding
		      };
		    }

		    // Update invoice with enhanced payment details
		    const updatedInvoice = await Invoice.findByIdAndUpdate(
		      invoiceId,
		      {
		        paymentStatus: 'paid',
		        status: 'paid',
		        paymentMethod: 'stripe',
		        paymentGateway: 'stripe',
		        transactionId: paymentIntent.id,
		        paymentDate: new Date(),
		        paymentGatewayData: {
		          ...paymentMethodDetails,
		          paymentMethodType: paymentMethodType,
		          amountCaptured: paymentIntent.amount_captured,
		          currency: paymentIntent.currency
		        }
		      },
		      { new: true, runValidators: true }
		    ).populate('clientId');

		    if (!updatedInvoice) {
		      console.error(`❌ Invoice not found: ${invoiceId}`);
		      return { success: false, error: 'Invoice not found' };
		    }

		    console.log(`✅ Invoice ${updatedInvoice.invoiceNumber} marked as paid via ${paymentMethodType}`);

		    // Send payment confirmation email
		    await EmailService.sendPaymentConfirmation(updatedInvoice);

		    return { 
		      success: true, 
		      invoiceId: invoiceId,
		      invoiceNumber: updatedInvoice.invoiceNumber,
		      paymentMethod: paymentMethodType
		    };

		  } catch (error) {
		    console.error('❌ Payment success handling failed:', error);
		    return { success: false, error: error.message };
		  }
		}

  /**
   * Handle failed payment
   */
  static async handlePaymentFailure(paymentIntent) {
    try {
      const invoiceId = paymentIntent.metadata.invoiceId;
      
      if (!invoiceId) {
        console.error('❌ No invoice ID in payment intent metadata');
        return { success: false, error: 'No invoice ID' };
      }

      const updatedInvoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        {
          paymentStatus: 'failed',
          paymentMethod: 'stripe', 
          paymentGateway: 'stripe',
          transactionId: paymentIntent.id,
          $set: {
            'paymentGatewayData.last_error': paymentIntent.last_payment_error?.message
          }
        },
        { new: true }
      );

      console.log(`❌ Invoice ${updatedInvoice.invoiceNumber} payment failed`);

      return { 
        success: true, 
        invoiceId: invoiceId,
        invoiceNumber: updatedInvoice.invoiceNumber 
      };

    } catch (error) {
      console.error('❌ Payment failure handling failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle canceled payment
   */
  static async handlePaymentCanceled(paymentIntent) {
    try {
      const invoiceId = paymentIntent.metadata.invoiceId;
      
      if (!invoiceId) {
        console.error('❌ No invoice ID in payment intent metadata');
        return { success: false, error: 'No invoice ID' };
      }

      const updatedInvoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        {
          paymentStatus: 'canceled',
          paymentMethod: 'stripe',
          paymentGateway: 'stripe',
          transactionId: paymentIntent.id
        },
        { new: true }
      );

      console.log(`❌ Invoice ${updatedInvoice.invoiceNumber} payment canceled`);

      return { 
        success: true, 
        invoiceId: invoiceId,
        invoiceNumber: updatedInvoice.invoiceNumber 
      };

    } catch (error) {
      console.error('❌ Payment canceled handling failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PaymentController;
