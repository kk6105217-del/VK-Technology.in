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
exports.Order = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const OrderItemSchema = new mongoose_1.Schema({
    product_id: { type: Number, required: true },
    product_ref: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true },
    image_url: { type: String, required: true },
});
const TrackingEventSchema = new mongoose_1.Schema({
    status: { type: String, required: true },
    location: { type: String },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
});
const OrderSchema = new mongoose_1.Schema({
    id: { type: Number, index: true },
    order_number: { type: String, required: true, unique: true, uppercase: true, index: true },
    customer_id: { type: Number, index: true },
    user_ref: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    customer_name: { type: String, required: true, trim: true },
    customer_email: { type: String, required: true, lowercase: true, trim: true, index: true },
    customer_phone: { type: String, required: true, trim: true },
    items: { type: [OrderItemSchema], required: true },
    pricing: {
        subtotal: { type: Number, required: true },
        discount_amount: { type: Number, default: 0 },
        coupon_code: { type: String, uppercase: true },
        shipping_fee: { type: Number, default: 0 },
        gst_amount: { type: Number, default: 0 },
        total_amount: { type: Number, required: true },
    },
    payment_method: {
        type: String,
        enum: ['razorpay', 'upi_qr', 'cod'],
        required: true,
        index: true,
    },
    payment_status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
        index: true,
    },
    order_status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
        default: 'pending',
        index: true,
    },
    shipping_address: {
        full_name: { type: String, required: true },
        phone: { type: String, required: true },
        address_line1: { type: String, required: true },
        address_line2: { type: String },
        landmark: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true, default: 'Andhra Pradesh' },
        postal_code: { type: String, required: true },
    },
    tracking: {
        courier_name: { type: String, default: 'India Post Speed Post / DTDC' },
        tracking_number: { type: String },
        tracking_url: { type: String },
        shipped_at: { type: Date },
        delivered_at: { type: Date },
        events: { type: [TrackingEventSchema], default: [] },
    },
    admin_notes: { type: String },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
OrderSchema.index({ customer_email: 1, created_at: -1 });
OrderSchema.index({ order_status: 1, payment_status: 1 });
OrderSchema.index({ created_at: -1 });
exports.Order = mongoose_1.default.models.Order || mongoose_1.default.model('Order', OrderSchema, 'orders');
