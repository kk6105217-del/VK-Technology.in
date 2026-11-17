import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  icon?: string;
  parent_category?: string;
  sort_order: number;
  is_active: boolean;
  product_count: number;
  created_at: Date;
  updated_at: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    id: { type: Number, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String },
    image_url: { type: String },
    icon: { type: String, default: 'Cpu' },
    parent_category: { type: String },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    product_count: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

CategorySchema.index({ sort_order: 1, is_active: 1 });

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema, 'categories');
