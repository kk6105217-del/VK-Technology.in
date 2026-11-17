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
exports.Inventory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const InventoryMovementSchema = new mongoose_1.Schema({
    movement_type: {
        type: String,
        enum: ['initial', 'restock', 'sale', 'reservation', 'cancellation', 'adjustment', 'damage'],
        required: true,
    },
    quantity_changed: { type: Number, required: true },
    previous_stock: { type: Number, required: true },
    new_stock: { type: Number, required: true },
    reference_id: { type: String },
    reference_type: { type: String },
    notes: { type: String },
    performed_by: { type: String, default: 'System' },
    timestamp: { type: Date, default: Date.now },
});
const InventorySchema = new mongoose_1.Schema({
    product_id: { type: Number, required: true, unique: true, index: true },
    product_ref: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String, required: true, index: true },
    available_quantity: { type: Number, required: true, min: 0, default: 0 },
    reserved_quantity: { type: Number, required: true, min: 0, default: 0 },
    sold_quantity: { type: Number, required: true, min: 0, default: 0 },
    min_stock_alert: { type: Number, default: 5 },
    movements: { type: [InventoryMovementSchema], default: [] },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
InventorySchema.index({ available_quantity: 1 });
InventorySchema.index({ sku: 1, available_quantity: 1 });
InventorySchema.methods.reserveStock = async function (quantity, orderId, performedBy = 'Order System') {
    if (this.available_quantity < quantity) {
        return false;
    }
    const prev = this.available_quantity;
    this.available_quantity -= quantity;
    this.reserved_quantity += quantity;
    this.movements.push({
        movement_type: 'reservation',
        quantity_changed: -quantity,
        previous_stock: prev,
        new_stock: this.available_quantity,
        reference_id: orderId,
        reference_type: 'ORDER',
        notes: `Reserved ${quantity} units for Order #${orderId}`,
        performed_by: performedBy,
        timestamp: new Date(),
    });
    await this.save();
    return true;
};
InventorySchema.methods.releaseStock = async function (quantity, orderId, performedBy = 'Order System') {
    const prev = this.available_quantity;
    this.available_quantity += quantity;
    this.reserved_quantity = Math.max(0, this.reserved_quantity - quantity);
    this.movements.push({
        movement_type: 'cancellation',
        quantity_changed: quantity,
        previous_stock: prev,
        new_stock: this.available_quantity,
        reference_id: orderId,
        reference_type: 'ORDER',
        notes: `Released ${quantity} units from cancelled Order #${orderId}`,
        performed_by: performedBy,
        timestamp: new Date(),
    });
    await this.save();
    return true;
};
InventorySchema.methods.recordSale = async function (quantity, orderId, performedBy = 'Payment System') {
    const prev = this.available_quantity;
    this.reserved_quantity = Math.max(0, this.reserved_quantity - quantity);
    this.sold_quantity += quantity;
    this.movements.push({
        movement_type: 'sale',
        quantity_changed: -quantity,
        previous_stock: prev,
        new_stock: this.available_quantity,
        reference_id: orderId,
        reference_type: 'ORDER',
        notes: `Order #${orderId} fulfilled and stock deducted permanently`,
        performed_by: performedBy,
        timestamp: new Date(),
    });
    await this.save();
    return true;
};
InventorySchema.methods.adjustStock = async function (newQuantity, reason, performedBy) {
    const prev = this.available_quantity;
    const diff = newQuantity - prev;
    this.available_quantity = Math.max(0, newQuantity);
    this.movements.push({
        movement_type: diff >= 0 ? 'restock' : 'adjustment',
        quantity_changed: diff,
        previous_stock: prev,
        new_stock: this.available_quantity,
        reference_type: 'ADMIN_RESTOCK',
        notes: reason || 'Manual stock correction by administrator',
        performed_by: performedBy,
        timestamp: new Date(),
    });
    await this.save();
};
exports.Inventory = mongoose_1.default.models.Inventory || mongoose_1.default.model('Inventory', InventorySchema, 'inventory');
