"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'vk-tech-super-secure-jwt-secret-key-2026',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    // Owner & Store Info
    storeName: 'VK Technology',
    ownerName: 'S. J. V. Karthik',
    adminEmail: process.env.ADMIN_EMAIL || 'karthik.suroju@gmail.com',
    adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'Admin@VK2026!',
    ownerLocation: 'Pedamiram, West Godavari, Andhra Pradesh, India',
    currency: 'INR',
    currencySymbol: '₹',
    // Razorpay
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    // Email Notifications (Nodemailer SMTP / Resend)
    storeOwnerEmail: process.env.STORE_OWNER_EMAIL || process.env.ADMIN_EMAIL || 'karthik.suroju@gmail.com',
    resendApiKey: process.env.RESEND_API_KEY || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    emailFrom: process.env.EMAIL_FROM || 'VK Technology <karthik.suroju@gmail.com>',
    // WhatsApp Integration (Meta WhatsApp Business Cloud API)
    whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN || '',
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '',
    whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    whatsappApiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    whatsappOwnerNumber: process.env.WHATSAPP_OWNER_NUMBER || process.env.OWNER_WHATSAPP_NUMBER || '918555997052',
    whatsappOwnerTemplate: process.env.WHATSAPP_OWNER_TEMPLATE || 'vk_new_order_owner',
    whatsappCustomerTemplate: process.env.WHATSAPP_CUSTOMER_TEMPLATE || 'vk_order_confirmation',
    whatsappApiToken: process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN || '',
    whatsappPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '',
    whatsappBusinessPhone: process.env.WHATSAPP_BUSINESS_PHONE || '+91 8555997052',
    ownerWhatsappNumber: process.env.WHATSAPP_OWNER_NUMBER || process.env.OWNER_WHATSAPP_NUMBER || '918555997052',
    // Internal Vercel Service Bindings
    backendServiceUrl: process.env.BACKEND_SERVICE_URL || 'http://localhost:8000',
};
