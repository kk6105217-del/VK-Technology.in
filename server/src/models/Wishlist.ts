import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWishlist extends Document {
  customer_id: number;
  user_ref?: mongoose.Types.ObjectId;
  product_ids: number[];
  created_at: Date;
  updated_at: Date;
}

const WishlistSchema = new Schema<IWishlist>(
  {
    customer_id: { type: Number, required: true, unique: true, index: true },
    user_ref: { type: Schema.Types.ObjectId, ref: 'User' },
    product_ids: { type: [Number], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const Wishlist: Model<IWishlist> =
  mongoose.models.Wishlist || mongoose.model<IWishlist>('Wishlist', WishlistSchema);
