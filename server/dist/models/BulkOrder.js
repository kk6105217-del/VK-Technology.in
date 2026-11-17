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
exports.BulkOrder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const BulkOrderSchema = new mongoose_1.Schema({
    institution_name: { type: String, required: true, trim: true },
    contact_person: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    product_requirements: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    quotation_amount: { type: Number, min: 0 },
    gst_details: {
        gstin: { type: String, uppercase: true, trim: true },
        pan: { type: String, uppercase: true, trim: true },
        billing_address: { type: String },
    },
    approval_status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true,
    },
    order_status: {
        type: String,
        enum: ['inquiry', 'quoted', 'confirmed', 'fulfilled', 'cancelled'],
        default: 'inquiry',
        index: true,
    },
    notes: { type: String },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
BulkOrderSchema.index({ approval_status: 1, order_status: 1 });
BulkOrderSchema.index({ created_at: -1 });
exports.BulkOrder = mongoose_1.default.models.BulkOrder || mongoose_1.default.model('BulkOrder', BulkOrderSchema);
