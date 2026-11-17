import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInventoryMovement {
  movement_type: 'initial' | 'restock' | 'sale' | 'reservation' | 'cancellation' | 'adjustment' | 'damage';
  quantity_changed: number;
  previous_stock: number;
  new_stock: number;
  reference_id?: string;
  reference_type?: 'ORDER' | 'ADMIN_RESTOCK' | 'AUDIT_CORRECTION' | 'CUSTOMER_RETURN';
  notes?: string;
  performed_by?: string;
  timestamp: Date;
}

export interface IInventory extends Document {
  product_id: number;
  product_ref?: mongoose.Types.ObjectId;
  sku: string;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  min_stock_alert: number;
  movements: IInventoryMovement[];
  updated_at: Date;
  created_at: Date;

  reserveStock(quantity: number, orderId: string, performedBy?: string): Promise<boolean>;
  releaseStock(quantity: number, orderId: string, performedBy?: string): Promise<boolean>;
  recordSale(quantity: number, orderId: string, performedBy?: string): Promise<boolean>;
  adjustStock(newQuantity: number, reason: string, performedBy: string): Promise<void>;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>({
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

const InventorySchema = new Schema<IInventory>(
  {
    product_id: { type: Number, required: true, unique: true, index: true },
    product_ref: { type: Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String, required: true, index: true },
    available_quantity: { type: Number, required: true, min: 0, default: 0 },
    reserved_quantity: { type: Number, required: true, min: 0, default: 0 },
    sold_quantity: { type: Number, required: true, min: 0, default: 0 },
    min_stock_alert: { type: Number, default: 5 },
    movements: { type: [InventoryMovementSchema], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

InventorySchema.index({ available_quantity: 1 });
InventorySchema.index({ sku: 1, available_quantity: 1 });

InventorySchema.methods.reserveStock = async function (
  quantity: number,
  orderId: string,
  performedBy = 'Order System'
): Promise<boolean> {
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

InventorySchema.methods.releaseStock = async function (
  quantity: number,
  orderId: string,
  performedBy = 'Order System'
): Promise<boolean> {
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

InventorySchema.methods.recordSale = async function (
  quantity: number,
  orderId: string,
  performedBy = 'Payment System'
): Promise<boolean> {
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

InventorySchema.methods.adjustStock = async function (
  newQuantity: number,
  reason: string,
  performedBy: string
): Promise<void> {
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

export const Inventory: Model<IInventory> =
  mongoose.models.Inventory || mongoose.model<IInventory>('Inventory', InventorySchema, 'inventory');
