const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

class RazorpayService {

    /**
     * Create a new order
     * @param {Object} orderData - Order details
     * @returns {Promise<Object>} - Razorpay order response
     */
    static async createOrder(orderData) {
        try {
            const {
                amount,
                currency = 'INR',
                receipt,
                notes = {},
                customerDetails = {}
            } = orderData;

            const options = {
                amount: Math.round(amount * 100), // Convert to paise
                currency: currency,
                receipt: receipt,
                notes: notes
            };

            const order = await razorpay.orders.create(options);

            return {
                success: true,
                data: {
                    orderId: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    receipt: order.receipt,
                    status: order.status,
                    createdAt: order.created_at
                }
            };
        } catch (error) {
            console.error('Razorpay order creation error:', error);
            return {
                success: false,
                message: error.message || 'Failed to create order',
                error: error
            };
        }
    }

    /**
     * Verify payment signature (for frontend callback)
     * @param {Object} paymentData - Payment data from frontend
     * @returns {boolean} - Verification result
     */
    static verifyPaymentSignature(paymentData) {
        try {
            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            } = paymentData;

            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            return expectedSignature === razorpay_signature;
        } catch (error) {
            console.error('Payment signature verification error:', error);
            return false;
        }
    }

    /**
     * Verify webhook signature (for server-to-server webhooks)
     * @param {string} webhookBody - Raw webhook body (JSON string)
     * @param {string} webhookSignature - Signature from X-Razorpay-Signature header
     * @returns {boolean} - Verification result
     */
    static verifyWebhookSignature(webhookBody, webhookSignature) {
        try {
            // Use webhook secret if available, otherwise fall back to key secret
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
            
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(webhookBody)
                .digest("hex");

            return expectedSignature === webhookSignature;
        } catch (error) {
            console.error('Webhook signature verification error:', error);
            return false;
        }
    }

    /**
     * Capture payment
     * @param {string} paymentId - Razorpay payment ID
     * @param {number} amount - Amount to capture
     * @param {string} currency - Currency code
     * @returns {Promise<Object>} - Capture response
     */
    static async capturePayment(paymentId, amount, currency = 'INR') {
        try {
            const captureAmount = Math.round(amount * 100); // Convert to paise

            const payment = await razorpay.payments.capture(
                paymentId,
                captureAmount,
                currency
            );

            return {
                success: true,
                data: {
                    paymentId: payment.id,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    captured: payment.captured,
                    capturedAt: payment.created_at
                }
            };
        } catch (error) {
            console.error('Payment capture error:', error);
            return {
                success: false,
                message: error.message || 'Failed to capture payment',
                error: error
            };
        }
    }

    /**
     * Get payment details
     * @param {string} paymentId - Razorpay payment ID
     * @returns {Promise<Object>} - Payment details
     */
    static async getPaymentDetails(paymentId) {
        try {
            const payment = await razorpay.payments.fetch(paymentId);

            return {
                success: true,
                data: {
                    paymentId: payment.id,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    method: payment.method,
                    captured: payment.captured,
                    description: payment.description,
                    notes: payment.notes,
                    createdAt: payment.created_at,
                    capturedAt: payment.captured_at
                }
            };
        } catch (error) {
            console.error('Get payment details error:', error);
            return {
                success: false,
                message: error.message || 'Failed to get payment details',
                error: error
            };
        }
    }

    /**
     * Create refund
     * @param {string} paymentId - Razorpay payment ID
     * @param {number} amount - Refund amount
     * @param {string} notes - Refund notes
     * @returns {Promise<Object>} - Refund response
     */
    static async createRefund(paymentId, amount, notes = '') {
        try {
            const refundAmount = Math.round(amount * 100); // Convert to paise

            const refund = await razorpay.payments.refund(paymentId, {
                amount: refundAmount,
                notes: {
                    reason: notes
                }
            });

            return {
                success: true,
                data: {
                    refundId: refund.id,
                    paymentId: refund.payment_id,
                    amount: refund.amount,
                    status: refund.status,
                    notes: refund.notes,
                    createdAt: refund.created_at
                }
            };
        } catch (error) {
            console.error('Refund creation error:', error);
            return {
                success: false,
                message: error.message || 'Failed to create refund',
                error: error
            };
        }
    }

    /**
     * Get refund details
     * @param {string} refundId - Razorpay refund ID
     * @returns {Promise<Object>} - Refund details
     */
    static async getRefundDetails(refundId) {
        try {
            const refund = await razorpay.refunds.fetch(refundId);

            return {
                success: true,
                data: {
                    refundId: refund.id,
                    paymentId: refund.payment_id,
                    amount: refund.amount,
                    status: refund.status,
                    notes: refund.notes,
                    createdAt: refund.created_at
                }
            };
        } catch (error) {
            console.error('Get refund details error:', error);
            return {
                success: false,
                message: error.message || 'Failed to get refund details',
                error: error
            };
        }
    }

    /**
     * Handle webhook events
     * @param {Object} webhookData - Webhook payload
     * @returns {Object} - Processed webhook data
     */
    static handleWebhook(webhookData) {
        try {
            const { event, payload } = webhookData;

            switch (event) {
                case 'payment.captured':
                    return {
                        success: true,
                        event: 'payment_captured',
                        data: {
                            paymentId: payload.payment.entity.id,
                            orderId: payload.payment.entity.order_id,
                            amount: payload.payment.entity.amount,
                            currency: payload.payment.entity.currency,
                            status: payload.payment.entity.status,
                            method: payload.payment.entity.method,
                            capturedAt: payload.payment.entity.created_at
                        }
                    };

                case 'payment.failed':
                    return {
                        success: true,
                        event: 'payment_failed',
                        data: {
                            paymentId: payload.payment.entity.id,
                            orderId: payload.payment.entity.order_id,
                            amount: payload.payment.entity.amount,
                            currency: payload.payment.entity.currency,
                            status: payload.payment.entity.status,
                            errorCode: payload.payment.entity.error_code,
                            errorDescription: payload.payment.entity.error_description
                        }
                    };

                case 'order.paid':
                    return {
                        success: true,
                        event: 'order_paid',
                        data: {
                            orderId: payload.order.entity.id,
                            amount: payload.order.entity.amount,
                            currency: payload.order.entity.currency,
                            status: payload.order.entity.status,
                            paidAt: payload.order.entity.created_at
                        }
                    };

                default:
                    return {
                        success: false,
                        message: 'Unhandled webhook event',
                        event: event
                    };
            }
        } catch (error) {
            console.error('Webhook handling error:', error);
            return {
                success: false,
                message: error.message || 'Failed to handle webhook',
                error: error
            };
        }
    }

    /**
     * Generate client-side payment options
     * @param {Object} orderData - Order data
     * @returns {Object} - Client payment options
     */
    static generatePaymentOptions(orderData) {
        return {
            key: process.env.RAZORPAY_KEY_ID,
            amount: orderData.amount,
            currency: orderData.currency,
            name: orderData.name || 'IndigoRhapsody',
            description: orderData.description || 'Stylist Booking Payment',
            order_id: orderData.orderId,
            prefill: {
                name: orderData.customerName,
                email: orderData.customerEmail,
                contact: orderData.customerPhone
            },
            notes: orderData.notes || {},
            theme: {
                color: '#3399cc'
            },
            handler: function (response) {
                // This will be handled on the client side
                return response;
            }
        };
    }
}

module.exports = RazorpayService;
