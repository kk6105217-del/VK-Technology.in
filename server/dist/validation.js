"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewSchema = exports.orderCreateSchema = exports.addressSchema = exports.customerLoginSchema = exports.customerRegisterSchema = exports.productUpdateSchema = exports.productSchema = void 0;
const zod_1 = require("zod");
exports.productSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Product name must be at least 2 characters'),
    slug: zod_1.z.string().optional(),
    sku: zod_1.z.string().min(2, 'SKU is required'),
    category_id: zod_1.z.coerce.number().int().positive('Valid category ID is required'),
    subcategory: zod_1.z.string().optional().nullable(),
    short_description: zod_1.z.string().optional().nullable(),
    description: zod_1.z.string().min(5, 'Description must be at least 5 characters'),
    regular_price: zod_1.z.coerce.number().positive('Regular price must be greater than 0'),
    discounted_price: zod_1.z.coerce.number().positive().optional().nullable(),
    stock_quantity: zod_1.z.coerce.number().int().nonnegative('Stock quantity must be 0 or more').default(0),
    brand: zod_1.z.string().default('VK Technology'),
    specifications: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional().default({}),
    features: zod_1.z.array(zod_1.z.string()).optional().default([]),
    compatibility: zod_1.z.string().optional().nullable(),
    package_contents: zod_1.z.array(zod_1.z.string()).optional().default([]),
    shipping_weight_grams: zod_1.z.coerce.number().int().positive().default(250),
    estimated_dispatch_days: zod_1.z.coerce.number().int().positive().default(1),
    warranty_info: zod_1.z.string().default('6 Months Manufacturer Warranty'),
    is_featured: zod_1.z.coerce.boolean().default(false),
    is_active: zod_1.z.coerce.boolean().default(true),
    images: zod_1.z.array(zod_1.z.string()).optional().default([])
});
exports.productUpdateSchema = exports.productSchema.partial();
exports.customerRegisterSchema = zod_1.z.object({
    full_name: zod_1.z.string().min(2, 'Full name is required'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    phone: zod_1.z.string().optional().nullable()
});
exports.customerLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required')
});
exports.addressSchema = zod_1.z.object({
    full_name: zod_1.z.string().min(2, 'Recipient name is required'),
    phone: zod_1.z.string().min(10, 'Valid 10-digit phone number is required'),
    address_line1: zod_1.z.string().min(5, 'Address line 1 is required'),
    address_line2: zod_1.z.string().optional().nullable(),
    landmark: zod_1.z.string().optional().nullable(),
    city: zod_1.z.string().min(2, 'City is required'),
    state: zod_1.z.string().min(2, 'State is required'),
    postal_code: zod_1.z.string().regex(/^\d{6}$/, 'Postal code must be 6 digits'),
    is_default: zod_1.z.boolean().optional().default(false)
});
exports.orderCreateSchema = zod_1.z.object({
    customer_name: zod_1.z.string().min(2),
    customer_email: zod_1.z.string().email(),
    customer_phone: zod_1.z.string().min(10),
    shipping_address: zod_1.z.any(),
    payment_method: zod_1.z.enum(['razorpay', 'cod', 'upi_qr']),
    coupon_code: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    items: zod_1.z.array(zod_1.z.object({
        product_id: zod_1.z.coerce.number().int().positive(),
        quantity: zod_1.z.coerce.number().int().positive(),
        variant_id: zod_1.z.coerce.number().int().optional()
    })).min(1, 'Order must contain at least 1 item')
});
exports.reviewSchema = zod_1.z.object({
    customer_name: zod_1.z.string().min(2),
    rating: zod_1.z.coerce.number().int().min(1).max(5),
    title: zod_1.z.string().optional().nullable(),
    comment: zod_1.z.string().min(5, 'Review comment must be at least 5 characters')
});
