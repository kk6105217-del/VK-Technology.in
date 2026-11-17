import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProductImage {
  url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
}

export interface IProduct extends Document {
  id: number; // Numeric ID preserved for backward compatibility
  name: string;
  slug: string;
  sku: string;
  category_id?: number;
  category_slug: string;
  brand: string;
  description: string;
  short_description?: string;
  images: IProductImage[];
  image_url: string; // Primary image shorthand
  price: number;
  discounted_price?: number;
  discount_percent?: number;
  gst_rate: number; // e.g. 18 for 18% GST
  hsn_code: string; // e.g. 8542 for Electronic ICs
  stock_quantity: number;
  min_stock_alert: number;
  specifications: Record<string, string>;
  compatibility?: string;
  pinout_diagram?: string;
  datasheet_url?: string;
  tags: string[];
  ratings_count: number;
  average_rating: number;
  is_featured: boolean;
  is_active: boolean;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;

  isArchived(): boolean;
}

const ProductImageSchema = new Schema<IProductImage>({
  url: { type: String, required: true },
  alt_text: { type: String },
  sort_order: { type: Number, default: 0 },
  is_primary: { type: Boolean, default: false },
});

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: Number, index: true },
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    category_id: { type: Number, index: true },
    category_slug: { type: String, required: true, index: true },
    brand: { type: String, default: 'VK Technology', trim: true, index: true },
    description: { type: String, required: true },
    short_description: { type: String },
    images: { type: [ProductImageSchema], default: [] },
    image_url: { type: String, required: true },
    price: { type: Number, required: true, min: 0, index: true },
    discounted_price: { type: Number, min: 0 },
    discount_percent: { type: Number, min: 0, max: 100 },
    gst_rate: { type: Number, default: 18, min: 0, max: 28 },
    hsn_code: { type: String, default: '85423100' },
    stock_quantity: { type: Number, required: true, default: 0, min: 0 },
    min_stock_alert: { type: Number, default: 5 },
    specifications: { type: Schema.Types.Mixed, default: {} },
    compatibility: { type: String, default: 'Arduino IDE, PlatformIO, ESP-IDF, Raspberry Pi OS' },
    pinout_diagram: { type: String },
    datasheet_url: { type: String },
    tags: { type: [String], default: [], index: true },
    ratings_count: { type: Number, default: 0 },
    average_rating: { type: Number, default: 5.0, min: 0, max: 5 },
    is_featured: { type: Boolean, default: false, index: true },
    is_active: { type: Boolean, default: true, index: true },
    deleted_at: { type: Date, default: null, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound indexes for searching, filtering, and admin queries
ProductSchema.index({ category_slug: 1, is_active: 1, deleted_at: 1 });
ProductSchema.index({ brand: 1, is_active: 1 });
ProductSchema.index({ price: 1, is_active: 1 });
ProductSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });

ProductSchema.methods.isArchived = function (): boolean {
  return this.deleted_at !== null && this.deleted_at !== undefined;
};

ProductSchema.virtual('discountPrice').get(function () {
  return this.discounted_price;
}).set(function (val: number) {
  this.discounted_price = val;
});

ProductSchema.virtual('stock').get(function () {
  return this.stock_quantity;
}).set(function (val: number) {
  this.stock_quantity = val;
});

ProductSchema.virtual('status').get(function () {
  if (this.deleted_at) return 'archived';
  return this.is_active ? 'active' : 'inactive';
});

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema, 'products');
