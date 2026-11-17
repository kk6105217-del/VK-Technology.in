import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  payment_id: string; // Razorpay payment ID or generated payment ref
  order_id: number;
  order_ref?: mongoose.Types.ObjectId;
  customer_id?: number;
  customer_email?: string;
  payment_gateway: 'razorpay' | 'upi_qr' | 'cod';
  transaction_id: string; // UTR or gateway tx id
  gateway_order_id?: string; // e.g. razorpay order_id
  payment_amount: number;
  currency: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  gateway_reference?: string;
  gateway_signature?: string;
  verified_at?: Date;
  webhook_event_id?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    payment_id: { type: String, required: true, unique: true, index: true },
    order_id: { type: Number, required: true, index: true },
    order_ref: { type: Schema.Types.ObjectId, ref: 'Order' },
    customer_id: { type: Number, index: true },
    customer_email: { type: String, lowercase: true, trim: true },
    payment_gateway: {
      type: String,
      enum: ['razorpay', 'upi_qr', 'cod'],
      required: true,
      index: true,
    },
    transaction_id: { type: String, required: true, unique: true, index: true },
    gateway_order_id: { type: String, index: true },
    payment_amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    payment_status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    gateway_reference: { type: String },
    gateway_signature: { type: String },
    verified_at: { type: Date },
    webhook_event_id: { type: String },
    notes: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

PaymentSchema.index({ payment_gateway: 1, payment_status: 1 });
PaymentSchema.index({ created_at: -1 });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
