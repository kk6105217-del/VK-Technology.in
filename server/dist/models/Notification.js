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
exports.Notification = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const NotificationSchema = new mongoose_1.Schema({
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
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
NotificationSchema.index({ order_id: 1, notification_type: 1 });
NotificationSchema.index({ timestamp: -1 });
exports.Notification = mongoose_1.default.models.Notification || mongoose_1.default.model('Notification', NotificationSchema);
