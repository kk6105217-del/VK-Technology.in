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
exports.Cart = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CartItemSchema = new mongoose_1.Schema({
    product_id: { type: Number, required: true },
    product_ref: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    added_at: { type: Date, default: Date.now },
});
const CartSchema = new mongoose_1.Schema({
    customer_id: { type: Number, index: true },
    session_id: { type: String, index: true },
    items: { type: [CartItemSchema], default: [] },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
CartSchema.index({ customer_id: 1, session_id: 1 });
exports.Cart = mongoose_1.default.models.Cart || mongoose_1.default.model('Cart', CartSchema);
