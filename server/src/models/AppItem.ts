import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAppItem extends Document {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: string;
  platform: string;
  app_url?: string;
  download_url?: string;
  icon: string;
  version: string;
  is_active: boolean;
  features: string[];
  created_at: Date;
  updated_at: Date;
}

const AppItemSchema = new Schema<IAppItem>(
  {
    id: { type: Number, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    platform: { type: String, default: 'Web / Android' },
    app_url: { type: String },
    download_url: { type: String },
    icon: { type: String, default: 'Smartphone' },
    version: { type: String, default: '1.0.0' },
    is_active: { type: Boolean, default: true, index: true },
    features: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const AppItem: Model<IAppItem> =
  mongoose.models.AppItem || mongoose.model<IAppItem>('AppItem', AppItemSchema);
