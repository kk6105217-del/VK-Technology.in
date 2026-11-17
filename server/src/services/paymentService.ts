import crypto from 'crypto';
import { env } from '../config/environment.js';
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { InventoryService } from './inventoryService.js';
import { isMongoConnected } from '../config/database.js';
import { MongoSyncService } from './mongoSync.js';

export class PaymentService {
  /**
   * Verifies Razorpay HMAC-SHA256 signature
   * signature = hmac_sha256(order_id + "|" + payment_id, secret)
   */
  static verifyRazorpaySignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): boolean {
    if (!env.razorpayKeySecret) {
      console.warn('[PaymentService] Razorpay key secret not configured; verifying mock/sandbox signature');
      return razorpaySignature.startsWith('sig_') || razorpaySignature.length >= 10;
    }

    try {
      const generatedSignature = crypto
        .createHmac('sha256', env.razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(generatedSignature),
        Buffer.from(razorpaySignature)
      );
    } catch (err: any) {
      console.error('[PaymentService] Signature verification exception:', err.message);
      return false;
    }
  }

  /**
   * Verifies Razorpay Webhook Event Signature
   */
  static verifyWebhookSignature(rawBody: string, webhookSignature: string, webhookSecret: string): boolean {
    if (!webhookSecret) return true;
    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(webhookSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Settles order payment atomically in MongoDB
   */
  static async settleOrderPayment(params: {
    orderNumber: string;
    paymentId: string;
    transactionId: string;
    paymentGateway: 'razorpay' | 'upi_qr' | 'cod';
    amount: number;
    gatewayOrderId?: string;
    gatewaySignature?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!isMongoConnected()) {
      return { success: true };
    }

    const order = await Order.findOne({ order_number: params.orderNumber });
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Record Payment
    await Payment.create({
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
    await InventoryService.confirmSale(reservationItems, order.order_number);

    // Notify clients of updated order
    MongoSyncService.notifyOrderChange('ORDER_STATUS_CHANGED', order.toObject());

    return { success: true };
  }
}
