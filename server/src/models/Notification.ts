import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  customer_id?: number;
  order_id?: number;
  order_number?: string;
  notification_type: 'order_placed' | 'payment_confirmed' | 'order_shipped' | 'order_delivered' | 'otp' | 'security_alert';
  channel: 'email' | 'whatsapp' | 'sms';
  recipient: string;
  subject?: string;
  message_body: string;
  email_status?: 'sent' | 'pending' | 'failed';
  sms_status?: 'sent' | 'pending' | 'failed';
  whatsapp_status?: 'sent' | 'pending' | 'failed';
  delivery_status: 'pending' | 'sent' | 'failed';
  gateway_response?: string;
  sent_at?: Date;
  timestamp: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    customer_id: { type: Number, index: true },
    order_id: { type: Number, index: true },
    order_number: { type: String, index: true },
    notification_type: {
      type: String,
      enum: ['order_placed', 'payment_confirmed', 'order_shipped', 'order_delivered', 'otp', 'security_alert'],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['email', 'whatsapp', 'sms'],
      required: true,
      index: true,
    },
    recipient: { type: String, required: true },
    subject: { type: String },
    message_body: { type: String, required: true },
    email_status: { type: String, enum: ['sent', 'pending', 'failed'] },
    sms_status: { type: String, enum: ['sent', 'pending', 'failed'] },
    whatsapp_status: { type: String, enum: ['sent', 'pending', 'failed'] },
    delivery_status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    gateway_response: { type: String },
    sent_at: { type: Date },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

NotificationSchema.index({ order_id: 1, notification_type: 1 });
NotificationSchema.index({ timestamp: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
