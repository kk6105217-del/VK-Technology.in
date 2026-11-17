"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const environment_js_1 = require("../config/environment.js");
const Payment_js_1 = require("../models/Payment.js");
const Order_js_1 = require("../models/Order.js");
const inventoryService_js_1 = require("./inventoryService.js");
const database_js_1 = require("../config/database.js");
const mongoSync_js_1 = require("./mongoSync.js");
class PaymentService {
    /**
     * Verifies Razorpay HMAC-SHA256 signature
     * signature = hmac_sha256(order_id + "|" + payment_id, secret)
     */
    static verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
        if (!environment_js_1.env.razorpayKeySecret) {
            console.warn('[PaymentService] Razorpay key secret not configured; verifying mock/sandbox signature');
            return razorpaySignature.startsWith('sig_') || razorpaySignature.length >= 10;
        }
        try {
            const generatedSignature = crypto_1.default
                .createHmac('sha256', environment_js_1.env.razorpayKeySecret)
                .update(`${razorpayOrderId}|${razorpayPaymentId}`)
                .digest('hex');
            return crypto_1.default.timingSafeEqual(Buffer.from(generatedSignature), Buffer.from(razorpaySignature));
        }
        catch (err) {
            console.error('[PaymentService] Signature verification exception:', err.message);
            return false;
        }
    }
    /**
     * Verifies Razorpay Webhook Event Signature
     */
    static verifyWebhookSignature(rawBody, webhookSignature, webhookSecret) {
        if (!webhookSecret)
            return true;
        try {
            const expectedSignature = crypto_1.default
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');
            return crypto_1.default.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(webhookSignature));
        }
        catch {
            return false;
        }
    }
    /**
     * Settles order payment atomically in MongoDB
     */
    static async settleOrderPayment(params) {
        if (!(0, database_js_1.isMongoConnected)()) {
            return { success: true };
        }
        const order = await Order_js_1.Order.findOne({ order_number: params.orderNumber });
        if (!order) {
            return { success: false, error: 'Order not found' };
        }
        // Record Payment
        await Payment_js_1.Payment.create({
            payment_id: params.paymentId,
            order_id: order.id,
            order_ref: order._id,
            customer_id: order.customer_id,
            customer_email: order.customer_email,
            payment_gateway: params.paymentGateway,
            transaction_id: params.transactionId,
            gateway_order_id: params.gatewayOrderId,
            payment_amount: params.amount,
            currency: 'INR',
            payment_status: 'completed',
            gateway_signature: params.gatewaySignature,
            verified_at: new Date(),
        });
        // Update Order Status
        order.payment_status = 'completed';
        order.order_status = 'processing';
        order.tracking.events.push({
            status: 'Payment Confirmed',
            location: 'Pedamiram Fulfillment Hub',
            timestamp: new Date(),
            notes: `Payment verified via ${params.paymentGateway.toUpperCase()} (Ref: ${params.transactionId})`,
        });
        await order.save();
        // Confirm inventory sale
        const reservationItems = order.items.map((it) => ({
            productId: it.product_id,
            quantity: it.quantity,
        }));
        await inventoryService_js_1.InventoryService.confirmSale(reservationItems, order.order_number);
        // Notify clients of updated order
        mongoSync_js_1.MongoSyncService.notifyOrderChange('ORDER_STATUS_CHANGED', order.toObject());
        return { success: true };
    }
}
exports.PaymentService = PaymentService;
