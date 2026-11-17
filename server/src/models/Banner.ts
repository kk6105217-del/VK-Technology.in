import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBanner extends Document {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  button_text?: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    id: { type: Number, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String },
    image_url: { type: String, required: true },
    link_url: { type: String, default: '/products' },
    button_text: { type: String, default: 'Shop Now' },
    display_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

BannerSchema.index({ display_order: 1, is_active: 1 });

export const Banner: Model<IBanner> =
  mongoose.models.Banner || mongoose.model<IBanner>('Banner', BannerSchema);
