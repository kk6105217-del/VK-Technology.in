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
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ProductImageSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    alt_text: { type: String },
    sort_order: { type: Number, default: 0 },
    is_primary: { type: Boolean, default: false },
});
const ProductSchema = new mongoose_1.Schema({
    id: { type: Number, index: true },
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    category_id: { type: Number, index: true },
    category_slug: { type: String, required: true, index: true },
    brand: { type: String, default: 'VK Technology', trim: true, index: true },
    description: { type: String, required: true },
    short_description: { type: String },
    images: { type: [ProductImageSchema], default: [] },
    image_url: { type: String, required: true },
    price: { type: Number, required: true, min: 0, index: true },
    discounted_price: { type: Number, min: 0 },
    discount_percent: { type: Number, min: 0, max: 100 },
    gst_rate: { type: Number, default: 18, min: 0, max: 28 },
    hsn_code: { type: String, default: '85423100' },
    stock_quantity: { type: Number, required: true, default: 0, min: 0 },
    min_stock_alert: { type: Number, default: 5 },
    specifications: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    compatibility: { type: String, default: 'Arduino IDE, PlatformIO, ESP-IDF, Raspberry Pi OS' },
    pinout_diagram: { type: String },
    datasheet_url: { type: String },
    tags: { type: [String], default: [], index: true },
    ratings_count: { type: Number, default: 0 },
    average_rating: { type: Number, default: 5.0, min: 0, max: 5 },
    is_featured: { type: Boolean, default: false, index: true },
    is_active: { type: Boolean, default: true, index: true },
    deleted_at: { type: Date, default: null, index: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
// Compound indexes for searching, filtering, and admin queries
ProductSchema.index({ category_slug: 1, is_active: 1, deleted_at: 1 });
ProductSchema.index({ brand: 1, is_active: 1 });
ProductSchema.index({ price: 1, is_active: 1 });
ProductSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });
ProductSchema.methods.isArchived = function () {
    return this.deleted_at !== null && this.deleted_at !== undefined;
};
ProductSchema.virtual('discountPrice').get(function () {
    return this.discounted_price;
}).set(function (val) {
    this.discounted_price = val;
});
ProductSchema.virtual('stock').get(function () {
    return this.stock_quantity;
}).set(function (val) {
    this.stock_quantity = val;
});
ProductSchema.virtual('status').get(function () {
    if (this.deleted_at)
        return 'archived';
    return this.is_active ? 'active' : 'inactive';
});
exports.Product = mongoose_1.default.models.Product || mongoose_1.default.model('Product', ProductSchema, 'products');
