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
exports.AuditLog = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AuditLogSchema = new mongoose_1.Schema({
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
        before: { type: mongoose_1.Schema.Types.Mixed },
        after: { type: mongoose_1.Schema.Types.Mixed },
        details: { type: String },
    },
    timestamp: { type: Date, default: Date.now, index: true },
}, {
    timestamps: { createdAt: 'timestamp', updatedAt: false },
});
AuditLogSchema.index({ admin_email: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ resource_type: 1, resource_id: 1 });
AuditLogSchema.index({ timestamp: -1 });
exports.AuditLog = mongoose_1.default.models.AuditLog || mongoose_1.default.model('AuditLog', AuditLogSchema, 'admin_logs');
