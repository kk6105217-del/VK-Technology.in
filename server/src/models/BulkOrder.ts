import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBulkOrder extends Document {
  institution_name: string;
  contact_person: string;
  email: string;
  phone: string;
  product_requirements: string;
  quantity: number;
  quotation_amount?: number;
  gst_details?: {
    gstin?: string;
    pan?: string;
    billing_address?: string;
  };
  approval_status: 'pending' | 'approved' | 'rejected';
  order_status: 'inquiry' | 'quoted' | 'confirmed' | 'fulfilled' | 'cancelled';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const BulkOrderSchema = new Schema<IBulkOrder>(
  {
    institution_name: { type: String, required: true, trim: true },
    contact_person: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    product_requirements: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    quotation_amount: { type: Number, min: 0 },
    gst_details: {
      gstin: { type: String, uppercase: true, trim: true },
      pan: { type: String, uppercase: true, trim: true },
      billing_address: { type: String },
    },
    approval_status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    order_status: {
      type: String,
      enum: ['inquiry', 'quoted', 'confirmed', 'fulfilled', 'cancelled'],
      default: 'inquiry',
      index: true,
    },
    notes: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

BulkOrderSchema.index({ approval_status: 1, order_status: 1 });
BulkOrderSchema.index({ created_at: -1 });

export const BulkOrder: Model<IBulkOrder> =
  mongoose.models.BulkOrder || mongoose.model<IBulkOrder>('BulkOrder', BulkOrderSchema);
