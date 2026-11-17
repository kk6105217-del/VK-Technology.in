import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  user_id?: number;
  admin_id?: number;
  admin_email: string;
  action: string;
  resource_type: 'Product' | 'Order' | 'User' | 'Inventory' | 'Payment' | 'Category' | 'Coupon' | 'System' | 'Security';
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  result: 'success' | 'failure';
  failure_reason?: string;
  change_summary?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    details?: string;
  };
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user_id: { type: Number, index: true },
    admin_id: { type: Number, index: true },
    admin_email: { type: String, required: true, lowercase: true, trim: true, index: true },
    action: { type: String, required: true, uppercase: true, index: true },
    resource_type: {
      type: String,
      enum: ['Product', 'Order', 'User', 'Inventory', 'Payment', 'Category', 'Coupon', 'System', 'Security'],
      required: true,
      index: true,
    },
    resource_id: { type: String, index: true },
    ip_address: { type: String },
    user_agent: { type: String },
    result: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
      index: true,
    },
    failure_reason: { type: String },
    change_summary: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
      details: { type: String },
    },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false },
  }
);

AuditLogSchema.index({ admin_email: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ resource_type: 1, resource_id: 1 });
AuditLogSchema.index({ timestamp: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema, 'admin_logs');
