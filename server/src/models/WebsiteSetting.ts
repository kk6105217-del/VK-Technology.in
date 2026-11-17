import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWebsiteSetting extends Document {
  key: string;
  value: string;
  description?: string;
  updated_at: Date;
}

const WebsiteSettingSchema = new Schema<IWebsiteSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
    description: { type: String },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updated_at' },
  }
);

export const WebsiteSetting: Model<IWebsiteSetting> =
  mongoose.models.WebsiteSetting || mongoose.model<IWebsiteSetting>('WebsiteSetting', WebsiteSettingSchema);
