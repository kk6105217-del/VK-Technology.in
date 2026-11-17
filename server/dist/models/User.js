"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const AddressSchema = new mongoose_1.Schema({
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
const LoginHistorySchema = new mongoose_1.Schema({
    timestamp: { type: Date, default: Date.now },
    ip_address: { type: String, trim: true },
    user_agent: { type: String, trim: true },
    success: { type: Boolean, required: true },
    failure_reason: { type: String },
});
const RefreshTokenSchema = new mongoose_1.Schema({
    token_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    created_at: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false },
    revoked_at: { type: Date },
    replaced_by_token: { type: String },
});
const UserSchema = new mongoose_1.Schema({
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
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
// Indexes for high performance lookup
UserSchema.index({ email: 1, account_status: 1 });
UserSchema.index({ 'refresh_tokens.token_hash': 1 });
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.password_hash);
};
UserSchema.methods.isLocked = function () {
    return !!(this.lock_until && this.lock_until.getTime() > Date.now());
};
UserSchema.methods.recordLoginAttempt = async function (success, ip, userAgent) {
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
    }
    else {
        this.failed_login_attempts += 1;
        // Lock for 15 minutes after 5 consecutive failures
        if (this.failed_login_attempts >= 5) {
            this.lock_until = new Date(Date.now() + 15 * 60 * 1000);
        }
    }
    await this.save();
};
exports.User = mongoose_1.default.models.User || mongoose_1.default.model('User', UserSchema, 'users');
