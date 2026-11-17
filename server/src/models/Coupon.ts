import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICoupon extends Document {
  id: number;
  code: string;
  description: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  min_order_value: number;
  max_discount_amount?: number;
  usage_limit: number;
  times_used: number;
  valid_from: Date;
  expiration_date?: Date;
  is_active: boolean;
  status: 'active' | 'expired' | 'disabled';
  created_at: Date;
  updated_at: Date;

  calculateDiscount(subtotal: number): number;
  isValid(subtotal: number): { valid: boolean; reason?: string };
}

const CouponSchema = new Schema<ICoupon>(
  {
    id: { type: Number, index: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, required: true },
    discount_type: { type: String, enum: ['percent', 'flat'], required: true },
    discount_value: { type: Number, required: true, min: 0 },
    min_order_value: { type: Number, default: 0, min: 0 },
    max_discount_amount: { type: Number, min: 0 },
    usage_limit: { type: Number, default: 1000 },
    times_used: { type: Number, default: 0 },
    valid_from: { type: Date, default: Date.now },
    expiration_date: { type: Date },
    is_active: { type: Boolean, default: true, index: true },
    status: { type: String, enum: ['active', 'expired', 'disabled'], default: 'active', index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

CouponSchema.methods.calculateDiscount = function (subtotal: number): number {
  if (subtotal < this.min_order_value) return 0;
  let discount = 0;
  if (this.discount_type === 'percent') {
    discount = Math.round((subtotal * this.discount_value) / 100);
    if (this.max_discount_amount && discount > this.max_discount_amount) {
      discount = this.max_discount_amount;
    }
  } else {
    discount = this.discount_value;
  }
  return Math.min(discount, subtotal);
};

CouponSchema.methods.isValid = function (subtotal: number): { valid: boolean; reason?: string } {
  if (!this.is_active || this.status !== 'active') {
    return { valid: false, reason: 'This coupon is no longer active.' };
  }
  if (this.expiration_date && new Date() > this.expiration_date) {
    return { valid: false, reason: 'This coupon has expired.' };
  }
  if (this.times_used >= this.usage_limit) {
    return { valid: false, reason: 'This coupon has reached its maximum usage limit.' };
  }
  if (subtotal < this.min_order_value) {
    return {
      valid: false,
      reason: `Minimum cart value of ₹${this.min_order_value} required for this coupon.`,
    };
  }
  return { valid: true };
};

export const Coupon: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema);
