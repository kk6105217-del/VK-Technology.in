import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAddress {
  _id?: mongoose.Types.ObjectId;
  id?: number;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
  created_at: Date;
}

export interface ILoginHistory {
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  failure_reason?: string;
}

export interface IRefreshToken {
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked: boolean;
  revoked_at?: Date;
  replaced_by_token?: string;
}

export interface IUser extends Document {
  id: number; // Numeric ID preserved for backward compatibility
  full_name: string;
  email: string;
  phone?: string;
  password_hash: string;
  role: 'customer' | 'admin' | 'SUPER_ADMIN' | 'PRODUCT_MANAGER' | 'ORDER_MANAGER' | 'INVENTORY_MANAGER';
  account_status: 'active' | 'suspended' | 'locked' | 'pending';
  email_verified: boolean;
  mobile_verified: boolean;
  last_login?: Date;
  login_history: ILoginHistory[];
  failed_login_attempts: number;
  lock_until?: Date;
  addresses: IAddress[];
  preferences: {
    newsletter: boolean;
    order_notifications: boolean;
    whatsapp_alerts: boolean;
  };
  refresh_tokens: IRefreshToken[];
  reset_token?: string;
  reset_token_expiry?: Date;
  created_at: Date;
  updated_at: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  recordLoginAttempt(success: boolean, ip?: string, userAgent?: string): Promise<void>;
}

const AddressSchema = new Schema<IAddress>({
  id: { type: Number },
  full_name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address_line1: { type: String, required: true, trim: true },
  address_line2: { type: String, trim: true },
  landmark: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true, default: 'Andhra Pradesh' },
  postal_code: { type: String, required: true, trim: true },
  is_default: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

const LoginHistorySchema = new Schema<ILoginHistory>({
  timestamp: { type: Date, default: Date.now },
  ip_address: { type: String, trim: true },
  user_agent: { type: String, trim: true },
  success: { type: Boolean, required: true },
  failure_reason: { type: String },
});

const RefreshTokenSchema = new Schema<IRefreshToken>({
  token_hash: { type: String, required: true },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
  revoked: { type: Boolean, default: false },
  revoked_at: { type: Date },
  replaced_by_token: { type: String },
});

const UserSchema = new Schema<IUser>(
  {
    id: { type: Number, index: true },
    full_name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    phone: { type: String, trim: true, index: true },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      enum: ['customer', 'admin', 'SUPER_ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'INVENTORY_MANAGER'],
      default: 'customer',
      index: true,
    },
    account_status: {
      type: String,
      enum: ['active', 'suspended', 'locked', 'pending'],
      default: 'active',
      index: true,
    },
    email_verified: { type: Boolean, default: false },
    mobile_verified: { type: Boolean, default: false },
    last_login: { type: Date },
    login_history: { type: [LoginHistorySchema], default: [] },
    failed_login_attempts: { type: Number, default: 0 },
    lock_until: { type: Date },
    addresses: { type: [AddressSchema], default: [] },
    preferences: {
      newsletter: { type: Boolean, default: true },
      order_notifications: { type: Boolean, default: true },
      whatsapp_alerts: { type: Boolean, default: true },
    },
    refresh_tokens: { type: [RefreshTokenSchema], default: [] },
    reset_token: { type: String },
    reset_token_expiry: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes for high performance lookup
UserSchema.index({ email: 1, account_status: 1 });
UserSchema.index({ 'refresh_tokens.token_hash': 1 });

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lock_until && this.lock_until.getTime() > Date.now());
};

UserSchema.methods.recordLoginAttempt = async function (
  success: boolean,
  ip?: string,
  userAgent?: string
): Promise<void> {
  this.login_history.unshift({
    timestamp: new Date(),
    ip_address: ip,
    user_agent: userAgent,
    success,
  });

  // Limit history length
  if (this.login_history.length > 50) {
    this.login_history = this.login_history.slice(0, 50);
  }

  if (success) {
    this.failed_login_attempts = 0;
    this.lock_until = undefined;
    this.last_login = new Date();
  } else {
    this.failed_login_attempts += 1;
    // Lock for 15 minutes after 5 consecutive failures
    if (this.failed_login_attempts >= 5) {
      this.lock_until = new Date(Date.now() + 15 * 60 * 1000);
    }
  }

  await this.save();
};

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema, 'users');
