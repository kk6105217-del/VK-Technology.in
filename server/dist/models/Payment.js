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
exports.Payment = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PaymentSchema = new mongoose_1.Schema({
    payment_id: { type: String, required: true, unique: true, index: true },
    order_id: { type: Number, required: true, index: true },
    order_ref: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Order' },
    customer_id: { type: Number, index: true },
    customer_email: { type: String, lowercase: true, trim: true },
    payment_gateway: {
        type: String,
        enum: ['razorpay', 'upi_qr', 'cod'],
        required: true,
        index: true,
    },
    transaction_id: { type: String, required: true, unique: true, index: true },
    gateway_order_id: { type: String, index: true },
    payment_amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    payment_status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
        index: true,
    },
    gateway_reference: { type: String },
    gateway_signature: { type: String },
    verified_at: { type: Date },
    webhook_event_id: { type: String },
    notes: { type: String },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
PaymentSchema.index({ payment_gateway: 1, payment_status: 1 });
PaymentSchema.index({ created_at: -1 });
exports.Payment = mongoose_1.default.models.Payment || mongoose_1.default.model('Payment', PaymentSchema);
