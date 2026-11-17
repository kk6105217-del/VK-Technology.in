import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  mongodbDbName: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  frontendUrl: string;
  corsOrigins: string[];

  // Store & Owner Info
  storeName: string;
  ownerName: string;
  adminEmail: string;
  adminInitialPassword: string;
  ownerLocation: string;
  currency: string;
  currencySymbol: string;

  // Razorpay Gateway
  razorpayKeyId: string;
  razorpayKeySecret: string;

  // Notification Integrations
  resendApiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  emailFrom: string;

  // WhatsApp
  whatsappApiToken: string;
  whatsappPhoneId: string;
  whatsappBusinessPhone: string;
  ownerWhatsappNumber: string;

  // Security Configuration
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  authRateLimitMaxRequests: number;
  bcryptRounds: number;
  maxFailedLogins: number;
  accountLockDurationMs: number;
}

export const env: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vk_technology',
  mongodbDbName: process.env.MONGODB_DB_NAME || 'vk_technology',
  jwtSecret: process.env.JWT_SECRET || 'vk-tech-super-secure-jwt-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'vk-tech-refresh-secret-rotation-2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://vktechnology.shop,https://www.vktechnology.shop')
    .split(',')
    .map(s => s.trim()),

  storeName: 'VK Technology',
  ownerName: 'S. J. V. Karthik',
  adminEmail: process.env.ADMIN_EMAIL || 'karthik.suroju@gmail.com',
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'Admin@VK2026!',
  ownerLocation: 'Pedamiram, West Godavari, Andhra Pradesh, India',
  currency: 'INR',
  currencySymbol: '₹',

  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',

  resendApiKey: process.env.RESEND_API_KEY || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'VK Technology <orders@vktechnology.in>',

  whatsappApiToken: process.env.WHATSAPP_API_TOKEN || '',
  whatsappPhoneId: process.env.WHATSAPP_PHONE_ID || '',
  whatsappBusinessPhone: process.env.WHATSAPP_BUSINESS_PHONE || '+91 8555997052',
  ownerWhatsappNumber: process.env.OWNER_WHATSAPP_NUMBER || '+91 8555997052',

  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 300,
  authRateLimitMaxRequests: 20,
  bcryptRounds: 10,
  maxFailedLogins: 5,
  accountLockDurationMs: 15 * 60 * 1000 // 15 minutes
};
