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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coupon = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CouponSchema = new mongoose_1.Schema({
    id: { type: Number, index: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, required: true },
    discount_type: { type: String, enum: ['percent', 'flat'], required: true },
    discount_value: { type: Number, required: true, min: 0 },
    min_order_value: { type: Number, default: 0, min: 0 },
    max_discount_amount: { type: Number, min: 0 },
    usage_limit: { type: Number, default: 1000 },
    times_used: { type: Number, default: 0 },
    valid_from: { type: Date, default: Date.now },
    expiration_date: { type: Date },
    is_active: { type: Boolean, default: true, index: true },
    status: { type: String, enum: ['active', 'expired', 'disabled'], default: 'active', index: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
CouponSchema.methods.calculateDiscount = function (subtotal) {
    if (subtotal < this.min_order_value)
        return 0;
    let discount = 0;
    if (this.discount_type === 'percent') {
        discount = Math.round((subtotal * this.discount_value) / 100);
        if (this.max_discount_amount && discount > this.max_discount_amount) {
            discount = this.max_discount_amount;
        }
    }
    else {
        discount = this.discount_value;
    }
    return Math.min(discount, subtotal);
};
CouponSchema.methods.isValid = function (subtotal) {
    if (!this.is_active || this.status !== 'active') {
        return { valid: false, reason: 'This coupon is no longer active.' };
    }
    if (this.expiration_date && new Date() > this.expiration_date) {
        return { valid: false, reason: 'This coupon has expired.' };
    }
    if (this.times_used >= this.usage_limit) {
        return { valid: false, reason: 'This coupon has reached its maximum usage limit.' };
    }
    if (subtotal < this.min_order_value) {
        return {
            valid: false,
            reason: `Minimum cart value of ₹${this.min_order_value} required for this coupon.`,
        };
    }
    return { valid: true };
};
exports.Coupon = mongoose_1.default.models.Coupon || mongoose_1.default.model('Coupon', CouponSchema);
