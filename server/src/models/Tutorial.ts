import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHardwareComponent {
  name: string;
  quantity: number;
  product_id?: number;
  notes?: string;
}

export interface IPdfDownload {
  title: string;
  url: string;
  file_size?: string;
}

export interface ITutorial extends Document {
  id: number;
  tutorial_title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimated_time?: string;
  images: string[];
  videos: string[];
  pdf_downloads: IPdfDownload[];
  source_code?: {
    github_url?: string;
    snippet?: string;
    language?: string;
  };
  hardware_components: IHardwareComponent[];
  access_permissions: 'public' | 'registered' | 'purchased_only';
  related_product_ids: number[];
  is_published: boolean;
  views_count: number;
  created_at: Date;
  updated_at: Date;
}

const HardwareComponentSchema = new Schema<IHardwareComponent>({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  product_id: { type: Number },
  notes: { type: String },
});

const PdfDownloadSchema = new Schema<IPdfDownload>({
  title: { type: String, required: true },
  url: { type: String, required: true },
  file_size: { type: String },
});

const TutorialSchema = new Schema<ITutorial>(
  {
    id: { type: Number, index: true },
    tutorial_title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
      index: true,
    },
    estimated_time: { type: String, default: '2 Hours' },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    pdf_downloads: { type: [PdfDownloadSchema], default: [] },
    source_code: {
      github_url: { type: String },
      snippet: { type: String },
      language: { type: String, default: 'cpp' },
    },
    hardware_components: { type: [HardwareComponentSchema], default: [] },
    access_permissions: {
      type: String,
      enum: ['public', 'registered', 'purchased_only'],
      default: 'public',
      index: true,
    },
    related_product_ids: { type: [Number], default: [] },
    is_published: { type: Boolean, default: true, index: true },
    views_count: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

TutorialSchema.index({ category: 1, difficulty: 1, is_published: 1 });

export const Tutorial: Model<ITutorial> =
  mongoose.models.Tutorial || mongoose.model<ITutorial>('Tutorial', TutorialSchema);
