import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  id: number;
  product_id: number;
  product_ref?: mongoose.Types.ObjectId;
  customer_id?: number;
  customer_name: string;
  rating: number;
  title?: string;
  comment: string;
  is_verified_purchase: boolean;
  moderation_status: 'approved' | 'pending' | 'rejected';
  created_at: Date;
  updated_at: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    id: { type: Number, index: true },
    product_id: { type: Number, required: true, index: true },
    product_ref: { type: Schema.Types.ObjectId, ref: 'Product' },
    customer_id: { type: Number, index: true },
    customer_name: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true },
    comment: { type: String, required: true, trim: true },
    is_verified_purchase: { type: Boolean, default: false },
    moderation_status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ReviewSchema.index({ product_id: 1, moderation_status: 1, created_at: -1 });

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
