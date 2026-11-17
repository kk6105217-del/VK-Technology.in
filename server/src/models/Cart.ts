import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICartItem {
  product_id: number;
  product_ref?: mongoose.Types.ObjectId;
  quantity: number;
  added_at: Date;
}

export interface ICart extends Document {
  customer_id?: number;
  session_id?: string;
  items: ICartItem[];
  created_at: Date;
  updated_at: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  product_id: { type: Number, required: true },
  product_ref: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  added_at: { type: Date, default: Date.now },
});

const CartSchema = new Schema<ICart>(
  {
    customer_id: { type: Number, index: true },
    session_id: { type: String, index: true },
    items: { type: [CartItemSchema], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

CartSchema.index({ customer_id: 1, session_id: 1 });

export const Cart: Model<ICart> = mongoose.models.Cart || mongoose.model<ICart>('Cart', CartSchema);
