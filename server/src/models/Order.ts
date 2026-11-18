import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderItem {
  product_id: number;
  product_ref?: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
  image_url: string;
}

export interface ITrackingEvent {
  status: string;
  location?: string;
  timestamp: Date;
  notes?: string;
}

export interface IOrder extends Document {
  id: number;
  order_number: string;
  customer_id?: number;
  user_ref?: mongoose.Types.ObjectId;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: IOrderItem[];
  pricing: {
    subtotal: number;
    discount_amount: number;
    coupon_code?: string;
    shipping_fee: number;
    gst_amount: number;
    total_amount: number;
  };
  payment_method: 'razorpay' | 'upi_qr' | 'cod';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  order_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  shipping_address: {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    landmark?: string;
    city: string;
    state: string;
    postal_code: string;
  };
  tracking: {
    courier_name?: string;
    tracking_number?: string;
    tracking_url?: string;
    shipped_at?: Date;
    delivered_at?: Date;
    events: ITrackingEvent[];
  };
  admin_notes?: string;
  // Multi-Channel Notification Status Tracking
  ownerEmailStatus: 'PENDING' | 'SENT' | 'FAILED';
  ownerWhatsAppStatus: 'PENDING' | 'SENT' | 'FAILED';
  customerEmailStatus: 'PENDING' | 'SENT' | 'FAILED';
  customerWhatsAppStatus: 'PENDING' | 'SENT' | 'FAILED';
  notificationSentAt?: Date | null;
  notificationError?: string | null;
  retryCount: number;
  whatsappMessageId?: string | null;
  whatsappConsent: boolean;
  created_at: Date;
  updated_at: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product_id: { type: Number, required: true },
  product_ref: { type: Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  total: { type: Number, required: true },
  image_url: { type: String, required: true },
});

const TrackingEventSchema = new Schema<ITrackingEvent>({
  status: { type: String, required: true },
  location: { type: String },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String },
});

const OrderSchema = new Schema<IOrder>(
  {
    id: { type: Number, index: true },
    order_number: { type: String, required: true, unique: true, uppercase: true, index: true },
    customer_id: { type: Number, index: true },
    user_ref: { type: Schema.Types.ObjectId, ref: 'User' },
    customer_name: { type: String, required: true, trim: true },
    customer_email: { type: String, required: true, lowercase: true, trim: true, index: true },
    customer_phone: { type: String, required: true, trim: true },
    items: { type: [OrderItemSchema], required: true },
    pricing: {
      subtotal: { type: Number, required: true },
      discount_amount: { type: Number, default: 0 },
      coupon_code: { type: String, uppercase: true },
      shipping_fee: { type: Number, default: 0 },
      gst_amount: { type: Number, default: 0 },
      total_amount: { type: Number, required: true },
    },
    payment_method: {
      type: String,
      enum: ['razorpay', 'upi_qr', 'cod'],
      required: true,
      index: true,
    },
    payment_status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    order_status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'pending',
      index: true,
    },
    shipping_address: {
      full_name: { type: String, required: true },
      phone: { type: String, required: true },
      address_line1: { type: String, required: true },
      address_line2: { type: String },
      landmark: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true, default: 'Andhra Pradesh' },
      postal_code: { type: String, required: true },
    },
    tracking: {
      courier_name: { type: String, default: 'India Post Speed Post / DTDC' },
      tracking_number: { type: String },
      tracking_url: { type: String },
      shipped_at: { type: Date },
      delivered_at: { type: Date },
      events: { type: [TrackingEventSchema], default: [] },
    },
    admin_notes: { type: String },
    // Automated Order Notification Tracking
    ownerEmailStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    ownerWhatsAppStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    customerEmailStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    customerWhatsAppStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    notificationSentAt: { type: Date, default: null },
    notificationError: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
    whatsappMessageId: { type: String, default: null },
    whatsappConsent: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

OrderSchema.index({ customer_email: 1, created_at: -1 });
OrderSchema.index({ order_status: 1, payment_status: 1 });
OrderSchema.index({ created_at: -1 });

export const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema, 'orders');
