"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOwnerWhatsAppNumber = getOwnerWhatsAppNumber;
exports.getStoreOwnerEmail = getStoreOwnerEmail;
exports.isValidWhatsAppNumber = isValidWhatsAppNumber;
exports.formatWhatsAppCleanPhone = formatWhatsAppCleanPhone;
exports.generateOwnerWhatsAppLink = generateOwnerWhatsAppLink;
exports.generateCustomerWhatsAppLink = generateCustomerWhatsAppLink;
exports.buildOwnerWhatsAppText = buildOwnerWhatsAppText;
exports.buildCustomerWhatsAppText = buildCustomerWhatsAppText;
exports.buildOwnerEmailHtml = buildOwnerEmailHtml;
exports.buildCustomerEmailHtml = buildCustomerEmailHtml;
exports.sendSmtpEmail = sendSmtpEmail;
exports.sendMetaWhatsAppMessage = sendMetaWhatsAppMessage;
exports.dispatchOrderNotifications = dispatchOrderNotifications;
exports.resolveOrderData = resolveOrderData;
exports.sendOrderNotifications = sendOrderNotifications;
exports.sendOrderStatusUpdate = sendOrderStatusUpdate;
exports.retryNotification = retryNotification;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_js_1 = require("../config.js");
const database_js_1 = require("../database.js");
const database_js_2 = require("../config/database.js");
const Order_js_1 = require("../models/Order.js");
const Notification_js_1 = require("../models/Notification.js");
// --------------------------------------------------------------------------
// Phone & Number Helpers
// --------------------------------------------------------------------------
function getOwnerWhatsAppNumber() {
    try {
        const row = database_js_1.db.prepare("SELECT value FROM website_settings WHERE key = 'owner_whatsapp_number'").get();
        if (row && row.value && row.value.trim()) {
            return formatWhatsAppCleanPhone(row.value.trim());
        }
    }
    catch (e) { }
    return formatWhatsAppCleanPhone(config_js_1.config.whatsappOwnerNumber || '918555997052');
}
function getStoreOwnerEmail() {
    try {
        const row = database_js_1.db.prepare("SELECT value FROM website_settings WHERE key = 'store_owner_email'").get();
        if (row && row.value && row.value.trim()) {
            return row.value.trim().toLowerCase();
        }
    }
    catch (e) { }
    return (config_js_1.config.storeOwnerEmail || config_js_1.config.adminEmail || 'karthik.suroju@gmail.com').trim().toLowerCase();
}
function isValidWhatsAppNumber(phone) {
    if (!phone)
        return false;
    const clean = phone.replace(/[^0-9]/g, '');
    return clean.length >= 10 && clean.length <= 15;
}
function formatWhatsAppCleanPhone(phone) {
    if (!phone || typeof phone !== 'string')
        return '';
    let clean = phone.replace(/[^0-9]/g, '');
    // Default 10-digit Indian numbers without country code to 91 prefix
    if (clean.length === 10) {
        clean = `91${clean}`;
    }
    return clean;
}
// --------------------------------------------------------------------------
// WhatsApp Web Direct Links (Fallback / Admin convenience)
// --------------------------------------------------------------------------
function generateOwnerWhatsAppLink(order) {
    const cleanPhone = getOwnerWhatsAppNumber();
    const message = buildOwnerWhatsAppText(order);
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}
function generateCustomerWhatsAppLink(order) {
    const cleanPhone = formatWhatsAppCleanPhone(order.customerPhone);
    const message = buildCustomerWhatsAppText(order);
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}
// --------------------------------------------------------------------------
// Message Text & HTML Email Builders
// --------------------------------------------------------------------------
function buildOwnerWhatsAppText(order) {
    const itemsText = order.items
        .map((item, idx) => `${idx + 1}. *${item.product_name}* (Qty: ${item.quantity}) - ₹${item.total_price.toFixed(2)}`)
        .join('\n');
    const addr = order.shippingAddress || {};
    const addressText = `${addr.address_line1 || ''}${addr.address_line2 ? ', ' + addr.address_line2 : ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.postal_code || ''}`;
    return `🔔 *VK TECHNOLOGY – NEW ORDER ALERT* 🔔\n\n` +
        `*Order ID:* #${order.orderNumber}\n` +
        `*Customer:* ${order.customerName}\n` +
        `*Phone:* ${order.customerPhone}\n` +
        `*Email:* ${order.customerEmail}\n\n` +
        `*Ordered Items:*\n${itemsText}\n\n` +
        `*Subtotal:* ₹${order.subtotal.toFixed(2)}\n` +
        (order.discountAmount > 0 ? `*Discount:* -₹${order.discountAmount.toFixed(2)}\n` : '') +
        `*Shipping:* ₹${order.shippingFee.toFixed(2)}\n` +
        `*Total Amount:* ₹${order.totalAmount.toFixed(2)}\n\n` +
        `*Payment Method:* ${order.paymentMethod.toUpperCase()}\n` +
        `*Payment Status:* ${order.paymentStatus}\n` +
        (order.utrNumber ? `*UTR / Ref:* ${order.utrNumber}\n` : '') +
        `*Order Date:* ${new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
        `*Delivery Address:*\n${addressText}\n\n` +
        `*Admin Dashboard:* ${config_js_1.config.frontendUrl}/admin/orders`;
}
function buildCustomerWhatsAppText(order) {
    const itemsText = order.items
        .map(item => `• ${item.product_name} (x${item.quantity}) = ₹${item.total_price.toFixed(2)}`)
        .join('\n');
    const addr = order.shippingAddress || {};
    const addressText = `${addr.address_line1 || ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.postal_code || ''}`;
    return `🚀 *VK TECHNOLOGY – ORDER CONFIRMED* 🚀\n\n` +
        `Dear ${order.customerName},\n` +
        `Thank you for shopping with VK Technology! Your order has been placed successfully.\n\n` +
        `*Order ID:* #${order.orderNumber}\n` +
        `*Items:*\n${itemsText}\n\n` +
        `*Total Amount:* ₹${order.totalAmount.toFixed(2)}\n` +
        `*Payment Method:* ${order.paymentMethod.toUpperCase()}\n` +
        `*Payment Status:* ${order.paymentStatus}\n\n` +
        `*Delivery Destination:*\n${addressText}\n` +
        `*Estimated Delivery:* 3-5 Business Days across India\n\n` +
        `*Track Live Shipment:*\n${config_js_1.config.frontendUrl}/orders\n\n` +
        `*Customer Support:*\n` +
        `• WhatsApp: +91 8555997052\n` +
        `• Email: karthik.suroju@gmail.com\n` +
        `VK Technology • Pedamiram, Andhra Pradesh`;
}
function buildOwnerEmailHtml(order) {
    const itemsHtml = order.items.map(item => {
        const imgTag = item.product_image
            ? `<img src="${item.product_image}" alt="${item.product_name}" style="width: 50px; height: 50px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 4px; margin-right: 12px; background: #fafafa; padding: 2px;" />`
            : '';
        return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: middle;">
          <div style="display: flex; align-items: center;">
            ${imgTag}
            <div>
              <strong style="color: #111827; font-size: 14px;">${item.product_name}</strong><br/>
              <span style="color: #6b7280; font-size: 12px; font-family: monospace;">SKU: ${item.product_sku}</span>
            </div>
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 14px; font-weight: bold;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px;">₹${item.unit_price.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; font-weight: bold; color: #111827;">₹${item.total_price.toFixed(2)}</td>
      </tr>
    `;
    }).join('');
    const addr = order.shippingAddress || {};
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>New Order #${order.orderNumber}</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px; color: #111827;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #131921 0%, #1f2937 100%); color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px;">VK TECHNOLOGY</h1>
          <p style="margin: 4px 0 0; color: #febd69; font-size: 13px; font-weight: 600;">Owner Store Notification • New Order Received</p>
        </div>

        <div style="padding: 24px;">
          <!-- Alert Banner -->
          <div style="background: #ecfdf5; border-left: 5px solid #10b981; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 4px; color: #065f46; font-size: 17px; font-weight: 700;">🚨 New Order Received!</h2>
            <p style="margin: 0; color: #047857; font-size: 13px;">
              Order <strong>#${order.orderNumber}</strong> has been successfully placed by <strong>${order.customerName}</strong>.
            </p>
          </div>

          <!-- Quick Customer Summary -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 10px; font-size: 14px; text-transform: uppercase; color: #4b5563; letter-spacing: 0.5px;">Customer Contact & Address</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
              <div>
                <strong>Customer:</strong> ${order.customerName}<br/>
                <strong>Email:</strong> <a href="mailto:${order.customerEmail}" style="color: #2563eb;">${order.customerEmail}</a><br/>
                <strong>Phone:</strong> <a href="tel:${order.customerPhone}" style="color: #2563eb;">${order.customerPhone}</a>
              </div>
              <div>
                <strong>Shipping Address:</strong><br/>
                ${addr.address_line1 || ''}${addr.address_line2 ? ', ' + addr.address_line2 : ''}<br/>
                ${addr.landmark ? 'Landmark: ' + addr.landmark + '<br/>' : ''}
                ${addr.city || ''}, ${addr.state || ''} - ${addr.postal_code || ''}
              </div>
            </div>
          </div>

          <!-- Product Table -->
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 6px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f9fafb; color: #4b5563; text-align: left;">
                <th style="padding: 10px 12px;">Product Details</th>
                <th style="padding: 10px 12px; text-align: center;">Qty</th>
                <th style="padding: 10px 12px; text-align: right;">Unit Price</th>
                <th style="padding: 10px 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Financial Breakdown -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%; font-size: 13px;">
              <tr>
                <td style="padding: 4px 0; color: #4b5563;">Subtotal:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600;">₹${order.subtotal.toFixed(2)}</td>
              </tr>
              ${order.discountAmount > 0 ? `
              <tr>
                <td style="padding: 4px 0; color: #059669;">Discount:</td>
                <td style="padding: 4px 0; text-align: right; color: #059669; font-weight: 600;">-₹${order.discountAmount.toFixed(2)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 4px 0; color: #4b5563;">Shipping Fee:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600;">${order.shippingFee === 0 ? '<span style="color:#059669;">FREE</span>' : '₹' + order.shippingFee.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb; font-size: 16px;">
                <td style="padding: 10px 0 4px; font-weight: 800; color: #111827;">Total Order Amount:</td>
                <td style="padding: 10px 0 4px; text-align: right; font-weight: 800; color: #b12704;">₹${order.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Payment & Timestamp -->
          <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; font-size: 13px;">
            <strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()} | <strong>Payment Status:</strong> ${order.paymentStatus}<br/>
            ${order.utrNumber ? `<strong>UTR / Bank Ref:</strong> ${order.utrNumber}<br/>` : ''}
            <strong>Order Date & Time:</strong> ${new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </div>

          <!-- Admin CTA -->
          <div style="text-align: center; margin-bottom: 16px;">
            <a href="${config_js_1.config.frontendUrl}/admin/orders" style="display: inline-block; background: #febd69; color: #111827; padding: 12px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Open Order in Admin Dashboard
            </a>
          </div>

          <div style="text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 14px;">
            VK Technology Store Owner Notification • Store Owner: Karthik (&lt;karthik.suroju@gmail.com&gt;) • WhatsApp: +91 8555997052
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
function buildCustomerEmailHtml(order) {
    const itemsHtml = order.items.map(item => {
        const imgTag = item.product_image
            ? `<img src="${item.product_image}" alt="${item.product_name}" style="width: 48px; height: 48px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 4px; margin-right: 12px; background: #fafafa; padding: 2px;" />`
            : '';
        return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: middle;">
          <div style="display: flex; align-items: center;">
            ${imgTag}
            <div>
              <strong style="color: #111827; font-size: 14px;">${item.product_name}</strong><br/>
              <span style="color: #6b7280; font-size: 12px; font-family: monospace;">SKU: ${item.product_sku}</span>
            </div>
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 14px; font-weight: bold;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px;">₹${item.unit_price.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; font-weight: bold; color: #111827;">₹${item.total_price.toFixed(2)}</td>
      </tr>
    `;
    }).join('');
    const addr = order.shippingAddress || {};
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Order Confirmed #${order.orderNumber}</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px; color: #111827;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #131921 0%, #1f2937 100%); color: #ffffff; padding: 28px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">VK TECHNOLOGY</h1>
          <p style="margin: 6px 0 0; color: #febd69; font-size: 14px;">DIY Electronics, Robotics & IoT Kits • India</p>
        </div>

        <div style="padding: 24px;">
          <!-- Confirmation Banner -->
          <div style="background: #ecfdf5; border-left: 5px solid #10b981; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 4px; color: #065f46; font-size: 18px; font-weight: 700;">🎉 Thank you for your order, ${order.customerName}!</h2>
            <p style="margin: 0; color: #047857; font-size: 13px;">
              Your order <strong>#${order.orderNumber}</strong> has been confirmed and is being prepared for dispatch.
            </p>
          </div>

          <!-- Order Items Table -->
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 6px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f9fafb; color: #4b5563; text-align: left;">
                <th style="padding: 10px 12px;">Item</th>
                <th style="padding: 10px 12px; text-align: center;">Qty</th>
                <th style="padding: 10px 12px; text-align: right;">Unit Price</th>
                <th style="padding: 10px 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Financial Breakdown -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%; font-size: 13px;">
              <tr>
                <td style="padding: 4px 0; color: #4b5563;">Subtotal:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600;">₹${order.subtotal.toFixed(2)}</td>
              </tr>
              ${order.discountAmount > 0 ? `
              <tr>
                <td style="padding: 4px 0; color: #059669;">Discount:</td>
                <td style="padding: 4px 0; text-align: right; color: #059669; font-weight: 600;">-₹${order.discountAmount.toFixed(2)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 4px 0; color: #4b5563;">Shipping Fee:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600;">${order.shippingFee === 0 ? '<span style="color:#059669;">FREE</span>' : '₹' + order.shippingFee.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb; font-size: 16px;">
                <td style="padding: 10px 0 4px; font-weight: 800; color: #111827;">Total Paid/Payable:</td>
                <td style="padding: 10px 0 4px; text-align: right; font-weight: 800; color: #b12704;">₹${order.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Shipping Details & Estimated Delivery -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 13px;">
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px;">
              <strong style="color: #374151;">Delivery Address:</strong><br/>
              ${addr.full_name || order.customerName}<br/>
              ${addr.address_line1 || ''}${addr.address_line2 ? ', ' + addr.address_line2 : ''}<br/>
              ${addr.landmark ? 'Landmark: ' + addr.landmark + '<br/>' : ''}
              ${addr.city || ''}, ${addr.state || ''} - ${addr.postal_code || ''}<br/>
              Phone: ${order.customerPhone}
            </div>
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px;">
              <strong style="color: #374151;">Shipping & Delivery:</strong><br/>
              Courier: India Post Speed Post / DTDC<br/>
              Estimated Delivery: <strong>3-5 Business Days</strong><br/>
              Payment Method: <strong>${order.paymentMethod.toUpperCase()}</strong><br/>
              Payment Status: <strong>${order.paymentStatus}</strong>
            </div>
          </div>

          <!-- Live Tracking CTA -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${config_js_1.config.frontendUrl}/orders" style="display: inline-block; background: #febd69; color: #111827; padding: 12px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Track Your Order Status
            </a>
          </div>

          <!-- Customer Support Footer -->
          <div style="text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            <p style="margin: 0 0 6px; font-weight: 600; color: #374151;">Need help or technical guidance with your electronic project?</p>
            <p style="margin: 0;">WhatsApp Support: <a href="https://wa.me/918555997052" style="color: #059669; font-weight: 700;">+91 8555997052</a> | Email: <a href="mailto:karthik.suroju@gmail.com" style="color: #2563eb;">karthik.suroju@gmail.com</a></p>
            <p style="margin: 6px 0 0; font-size: 11px; color: #9ca3af;">VK Technology • Pedamiram, Bhimavaram, Andhra Pradesh, India</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
// --------------------------------------------------------------------------
// Core Dispatchers: Email (SMTP) & WhatsApp (Meta Business Cloud API)
// --------------------------------------------------------------------------
/**
 * Send email using Nodemailer with SMTP credentials, with fallback to Resend if configured.
 */
async function sendSmtpEmail(toEmail, subject, htmlContent) {
    // 1. Try Nodemailer SMTP
    if (config_js_1.config.smtpHost && config_js_1.config.smtpUser && config_js_1.config.smtpPass) {
        try {
            const transporter = nodemailer_1.default.createTransport({
                host: config_js_1.config.smtpHost,
                port: config_js_1.config.smtpPort || 587,
                secure: config_js_1.config.smtpPort === 465,
                auth: {
                    user: config_js_1.config.smtpUser,
                    pass: config_js_1.config.smtpPass,
                },
            });
            const info = await transporter.sendMail({
                from: config_js_1.config.emailFrom || 'VK Technology <karthik.suroju@gmail.com>',
                to: toEmail,
                subject,
                html: htmlContent,
            });
            return { success: true, messageId: info.messageId };
        }
        catch (err) {
            console.warn(`[SMTP Warning] Failed to send email to ${toEmail}:`, err.message);
            return { success: false, error: err.message || 'SMTP delivery failed' };
        }
    }
    // 2. Try Resend API if configured
    if (config_js_1.config.resendApiKey) {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config_js_1.config.resendApiKey}`,
                },
                body: JSON.stringify({
                    from: config_js_1.config.emailFrom || 'VK Technology <orders@vktechnology.in>',
                    to: [toEmail],
                    subject,
                    html: htmlContent,
                }),
            });
            if (res.ok) {
                const data = (await res.json());
                return { success: true, messageId: data.id };
            }
            else {
                const errText = await res.text();
                return { success: false, error: `Resend HTTP ${res.status}: ${errText}` };
            }
        }
        catch (err) {
            return { success: false, error: err.message || 'Resend API failed' };
        }
    }
    return {
        success: false,
        error: 'SMTP credentials not configured in environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS)',
    };
}
/**
 * Send WhatsApp notification using official Meta WhatsApp Business Cloud API.
 * Supports Meta Utility Templates (vk_new_order_owner, vk_order_confirmation)
 * with graceful text fallback.
 */
async function sendMetaWhatsAppMessage(toPhone, templateName, templateParams, fallbackText) {
    const cleanPhone = formatWhatsAppCleanPhone(toPhone);
    if (!cleanPhone || !isValidWhatsAppNumber(cleanPhone)) {
        return { success: false, error: `Invalid WhatsApp phone number: "${toPhone}"` };
    }
    const token = config_js_1.config.whatsappAccessToken || config_js_1.config.whatsappApiToken;
    const phoneId = config_js_1.config.whatsappPhoneNumberId || config_js_1.config.whatsappPhoneId;
    const apiVersion = config_js_1.config.whatsappApiVersion || 'v21.0';
    if (!token || !phoneId) {
        return {
            success: false,
            error: 'WhatsApp Business Cloud API credentials not configured (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN)',
        };
    }
    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;
    // 1. Attempt Template Message
    try {
        const templatePayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: 'en' },
                components: [
                    {
                        type: 'body',
                        parameters: templateParams.map(val => ({ type: 'text', text: String(val || '') })),
                    },
                ],
            },
        };
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(templatePayload),
        });
        if (response.ok) {
            const data = (await response.json());
            const msgId = data?.messages?.[0]?.id || `wa_${Date.now()}`;
            return { success: true, messageId: msgId };
        }
        const errorBody = await response.text();
        console.warn(`[WhatsApp Template Warning] Template "${templateName}" failed (${response.status}): ${errorBody}. Attempting direct text message fallback...`);
        // 2. Direct Text Fallback
        const textPayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: {
                preview_url: false,
                body: fallbackText,
            },
        };
        const textResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(textPayload),
        });
        if (textResponse.ok) {
            const textData = (await textResponse.json());
            const msgId = textData?.messages?.[0]?.id || `wa_${Date.now()}`;
            return { success: true, messageId: msgId };
        }
        const textErr = await textResponse.text();
        return {
            success: false,
            error: `Meta Cloud API failed (Template: ${errorBody} | Text: ${textErr})`,
        };
    }
    catch (err) {
        return { success: false, error: err.message || 'WhatsApp network request failed' };
    }
}
// --------------------------------------------------------------------------
// Master Notification Dispatcher
// --------------------------------------------------------------------------
/**
 * Complete Order Notification Workflow:
 * Dispatches 4 independent notification channels:
 * 1. Owner Email -> karthik.suroju@gmail.com
 * 2. Owner WhatsApp -> 918555997052
 * 3. Customer Email -> order.customerEmail
 * 4. Customer WhatsApp -> order.customerPhone
 *
 * Updates MongoDB Atlas and SQLite independently per channel.
 * Never throws unhandled exceptions or deletes orders on failure.
 */
async function dispatchOrderNotifications(orderIdOrNumber, options = {}) {
    const result = {
        ownerEmail: false,
        ownerWhatsApp: false,
        customerEmail: false,
        customerWhatsApp: false,
        errors: {},
    };
    // 1. Fetch Order Data
    const orderData = await resolveOrderData(orderIdOrNumber);
    if (!orderData) {
        console.warn(`[NotificationDispatcher] Order not found for identifier: ${orderIdOrNumber}`);
        return result;
    }
    const orderDbId = orderData.orderId;
    const ownerEmail = getStoreOwnerEmail();
    const ownerWhatsApp = getOwnerWhatsAppNumber();
    const forceChannels = options.forceChannels || [];
    // 2. Channel 1: Owner Email
    const shouldSendOwnerEmail = forceChannels.length === 0 || forceChannels.includes('owner_email');
    if (shouldSendOwnerEmail) {
        try {
            const subject = `🚨 New Order #${orderData.orderNumber} Received - ₹${orderData.totalAmount.toFixed(2)}`;
            const html = buildOwnerEmailHtml(orderData);
            const res = await sendSmtpEmail(ownerEmail, subject, html);
            if (res.success) {
                result.ownerEmail = true;
                await recordChannelStatus(orderDbId, orderData.orderNumber, 'owner_email', 'SENT', null, res.messageId);
            }
            else {
                result.errors.owner_email = res.error || 'Failed to send owner email';
                await recordChannelStatus(orderDbId, orderData.orderNumber, 'owner_email', 'FAILED', res.error);
            }
        }
        catch (e) {
            result.errors.owner_email = e.message;
            await recordChannelStatus(orderDbId, orderData.orderNumber, 'owner_email', 'FAILED', e.message);
        }
    }
    // 3. Channel 2: Owner WhatsApp
    const shouldSendOwnerWhatsApp = forceChannels.length === 0 || forceChannels.includes('owner_whatsapp');
    if (shouldSendOwnerWhatsApp) {
        try {
            const templateName = config_js_1.config.whatsappOwnerTemplate || 'vk_new_order_owner';
            const templateParams = [
                orderData.orderNumber,
                orderData.customerName,
                `₹${orderData.totalAmount.toFixed(2)}`,
                orderData.paymentMethod.toUpperCase(),
            ];
            const fallbackText = buildOwnerWhatsAppText(orderData);
            const res = await sendMetaWhatsAppMessage(ownerWhatsApp, templateName, templateParams, fallbackText);
            if (res.success) {
                result.ownerWhatsApp = true;
                await recordChannelStatus(orderDbId, orderData.orderNumber, 'owner_whatsapp', 'SENT', null, res.messageId);
            }
            else {
                result.errors.owner_whatsapp = res.error || 'Failed to send owner WhatsApp';
                await recordChannelStatus(orderDbId, orderData.orderNumber, 'owner_whatsapp', 'FAILED', res.error);
            }
        }
        catch (e) {
            result.errors.owner_whatsapp = e.message;
            await recordChannelStatus(orderDbId, orderData.orderNumber, 'owner_whatsapp', 'FAILED', e.message);
        }
    }
    // 4. Channel 3: Customer Email
    const shouldSendCustomerEmail = forceChannels.length === 0 || forceChannels.includes('customer_email');
    if (shouldSendCustomerEmail && orderData.customerEmail) {
        try {
            const subject = `🎉 Order Confirmed! #${orderData.orderNumber} - VK Technology`;
            const html = buildCustomerEmailHtml(orderData);
            const res = await sendSmtpEmail(orderData.customerEmail, subject, html);
            if (res.success) {
                result.customerEmail = true;
                await recordChannelStatus(orderDbId, orderData.orderNumber, 'customer_email', 'SENT', null, res.messageId);
            }
            else {
                result.errors.customer_email = res.error || 'Failed to send customer email';
                await recordChannelStatus(orderDbId, orderData.orderNumber, 'customer_email', 'FAILED', res.error);
            }
        }
        catch (e) {
            result.errors.customer_email = e.message;
            await recordChannelStatus(orderDbId, orderData.orderNumber, 'customer_email', 'FAILED', e.message);
        }
    }
    // 5. Channel 4: Customer WhatsApp
    const shouldSendCustomerWhatsApp = forceChannels.length === 0 || forceChannels.includes('customer_whatsapp');
    if (shouldSendCustomerWhatsApp && orderData.customerPhone) {
        try {
            const templateName = config_js_1.config.whatsappCustomerTemplate || 'vk_order_confirmation';
            const templateParams = [
                orderData.customerName,
                orderData.orderNumber,
                `₹${orderData.totalAmount.toFixed(2)}`,
                orderData.paymentMethod.toUpperCase(),
            ];
            const fallbackText = buildCustomerWhatsAppText(orderData);
            const res = await sendMetaWhatsAppMessage(orderData.customerPhone, templateName, templateParams, fallbackText);
            if (res.success) {
                result.customerWhatsApp = true;
                await recordChannelStatus(orderDbId, orderData.orderNumber, 'customer_whatsapp', 'SENT', null, res.messageId);
            }
            else {
                result.errors.customer_whatsapp = res.error || 'Failed to send customer WhatsApp';
                await recordChannelStatus(orderDbId, orderData.orderNumber, 'customer_whatsapp', 'FAILED', res.error);
            }
        }
        catch (e) {
            result.errors.customer_whatsapp = e.message;
            await recordChannelStatus(orderDbId, orderData.orderNumber, 'customer_whatsapp', 'FAILED', e.message);
        }
    }
    return result;
}
// --------------------------------------------------------------------------
// Database Synchronization Helpers (MongoDB Atlas + SQLite)
// --------------------------------------------------------------------------
async function recordChannelStatus(orderDbId, orderNumber, channel, status, errorMessage = null, messageId) {
    const now = new Date();
    const statusFieldMap = {
        owner_email: 'ownerEmailStatus',
        owner_whatsapp: 'ownerWhatsAppStatus',
        customer_email: 'customerEmailStatus',
        customer_whatsapp: 'customerWhatsAppStatus',
    };
    const sqliteColMap = {
        owner_email: 'owner_email_status',
        owner_whatsapp: 'owner_whatsapp_status',
        customer_email: 'customer_email_status',
        customer_whatsapp: 'customer_whatsapp_status',
    };
    // 1. Update SQLite
    try {
        const colName = sqliteColMap[channel];
        if (orderDbId) {
            database_js_1.db.prepare(`
        UPDATE orders SET
          ${colName} = ?,
          notification_sent_at = ?,
          notification_error = ?,
          whatsapp_message_id = COALESCE(?, whatsapp_message_id),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(status, status === 'SENT' ? now.toISOString() : null, errorMessage, messageId || null, orderDbId);
            // Insert audit log
            database_js_1.db.prepare(`
        INSERT INTO notification_logs (order_id, channel, recipient, subject_or_template, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(orderDbId, channel, orderNumber, channel, status.toLowerCase(), errorMessage);
        }
    }
    catch (err) {
        console.warn('[SQLite Notification Record Error]:', err.message);
    }
    // 2. Update MongoDB Atlas
    try {
        if ((0, database_js_2.isMongoConnected)()) {
            const mongoField = statusFieldMap[channel];
            const updateData = {
                [mongoField]: status,
                updated_at: now,
            };
            if (status === 'SENT') {
                updateData.notificationSentAt = now;
            }
            if (errorMessage) {
                updateData.notificationError = errorMessage;
            }
            if (messageId) {
                updateData.whatsappMessageId = messageId;
            }
            await Order_js_1.Order.updateOne({ $or: [{ id: orderDbId }, { order_number: orderNumber }] }, { $set: updateData });
            // Record in Mongo Notification ledger
            await Notification_js_1.Notification.create({
                order_id: orderDbId,
                order_number: orderNumber,
                notification_type: 'order_placed',
                channel: channel.includes('whatsapp') ? 'whatsapp' : 'email',
                recipient: channel.startsWith('owner') ? 'STORE_OWNER' : 'CUSTOMER',
                message_body: `Channel: ${channel} | Status: ${status}`,
                delivery_status: status.toLowerCase(),
                gateway_response: errorMessage || messageId || 'OK',
                sent_at: status === 'SENT' ? now : undefined,
            });
        }
    }
    catch (err) {
        console.warn('[Mongo Notification Record Error]:', err.message);
    }
}
// --------------------------------------------------------------------------
// Order Data Resolver (Hydrates from SQLite or MongoDB Atlas)
// --------------------------------------------------------------------------
async function resolveOrderData(orderIdOrNumber) {
    const isNumeric = typeof orderIdOrNumber === 'number' || /^\d+$/.test(String(orderIdOrNumber));
    // Try SQLite first
    try {
        const sql = isNumeric
            ? 'SELECT * FROM orders WHERE id = ?'
            : 'SELECT * FROM orders WHERE order_number = ?';
        const row = database_js_1.db.prepare(sql).get(orderIdOrNumber);
        if (row) {
            let shippingAddress = {};
            try {
                shippingAddress = JSON.parse(row.shipping_address_json || '{}');
            }
            catch { }
            const itemRows = database_js_1.db.prepare(`
        SELECT oi.*,
          (SELECT image_url FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.is_primary DESC LIMIT 1) as fetched_image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `).all(row.id);
            const items = itemRows.map(i => ({
                product_id: i.product_id,
                product_name: i.product_name,
                product_sku: i.product_sku || '',
                product_image: i.product_image || i.fetched_image || '',
                unit_price: Number(i.unit_price || 0),
                quantity: Number(i.quantity || 1),
                total_price: Number(i.total_price || 0),
            }));
            return {
                orderId: row.id,
                orderNumber: row.order_number,
                customerName: row.customer_name,
                customerEmail: row.customer_email,
                customerPhone: row.customer_phone,
                shippingAddress,
                items,
                subtotal: Number(row.subtotal || 0),
                discountAmount: Number(row.discount_amount || 0),
                shippingFee: Number(row.shipping_fee || 0),
                totalAmount: Number(row.total_amount || 0),
                paymentMethod: row.payment_method || 'cod',
                paymentStatus: row.payment_status || 'Pending Payment',
                orderStatus: row.order_status || 'Confirmed',
                createdAt: row.created_at || new Date().toISOString(),
                utrNumber: row.utr_number || null,
                whatsappConsent: Boolean(row.whatsapp_consent !== 0),
            };
        }
    }
    catch (e) {
        console.warn('[resolveOrderData SQLite warning]:', e.message);
    }
    // Try MongoDB Atlas
    try {
        if ((0, database_js_2.isMongoConnected)()) {
            const query = isNumeric
                ? { id: Number(orderIdOrNumber) }
                : { order_number: String(orderIdOrNumber) };
            const mongoOrder = await Order_js_1.Order.findOne(query).lean();
            if (mongoOrder) {
                return {
                    orderId: mongoOrder.id,
                    orderNumber: mongoOrder.order_number,
                    customerName: mongoOrder.customer_name,
                    customerEmail: mongoOrder.customer_email,
                    customerPhone: mongoOrder.customer_phone,
                    shippingAddress: mongoOrder.shipping_address || {},
                    items: (mongoOrder.items || []).map((it) => ({
                        product_id: it.product_id,
                        product_name: it.name,
                        product_sku: it.sku,
                        product_image: it.image_url,
                        unit_price: Number(it.price || 0),
                        quantity: Number(it.quantity || 1),
                        total_price: Number(it.total || 0),
                    })),
                    subtotal: Number(mongoOrder.pricing?.subtotal || 0),
                    discountAmount: Number(mongoOrder.pricing?.discount_amount || 0),
                    shippingFee: Number(mongoOrder.pricing?.shipping_fee || 0),
                    totalAmount: Number(mongoOrder.pricing?.total_amount || 0),
                    paymentMethod: mongoOrder.payment_method,
                    paymentStatus: mongoOrder.payment_status,
                    orderStatus: mongoOrder.order_status,
                    createdAt: mongoOrder.created_at ? new Date(mongoOrder.created_at).toISOString() : new Date().toISOString(),
                    whatsappConsent: Boolean(mongoOrder.whatsappConsent !== false),
                };
            }
        }
    }
    catch (e) {
        console.warn('[resolveOrderData Mongo warning]:', e.message);
    }
    return null;
}
// --------------------------------------------------------------------------
// Backward-Compatibility Aliases
// --------------------------------------------------------------------------
async function sendOrderNotifications(order, orderDbId) {
    const orderTarget = orderDbId || order.orderNumber;
    const dispatchResult = await dispatchOrderNotifications(orderTarget);
    return {
        emailSent: dispatchResult.ownerEmail || dispatchResult.customerEmail,
        whatsappOwnerSent: dispatchResult.ownerWhatsApp,
        whatsappCustomerSent: dispatchResult.customerWhatsApp,
        whatsappOwnerLink: generateOwnerWhatsAppLink(order),
        whatsappCustomerLink: generateCustomerWhatsAppLink(order),
        details: 'Notifications processed across email and Meta WhatsApp channels.',
    };
}
async function sendOrderStatusUpdate(orderId, newStatus, trackingNumber, customNote) {
    try {
        const order = await resolveOrderData(orderId);
        if (!order)
            return false;
        const trackingMsg = trackingNumber ? `Tracking No: ${trackingNumber}\n` : '';
        const noteMsg = customNote ? `Note: ${customNote}\n` : '';
        const message = `📦 *VK TECHNOLOGY – ORDER STATUS UPDATE* 📦\n\n` +
            `Hello ${order.customerName},\n` +
            `Your order *#${order.orderNumber}* is now: *${newStatus.toUpperCase()}*!\n` +
            `${trackingMsg}` +
            `${noteMsg}` +
            `Track live shipment: ${config_js_1.config.frontendUrl}/orders\n\n` +
            `Support WhatsApp: +91 8555997052\n` +
            `VK Technology • India`;
        if (isValidWhatsAppNumber(order.customerPhone)) {
            const res = await sendMetaWhatsAppMessage(order.customerPhone, 'vk_order_status_update', [order.customerName, order.orderNumber, newStatus.toUpperCase()], message);
            return res.success;
        }
        return false;
    }
    catch (e) {
        console.error('Failed to dispatch status update notification:', e);
        return false;
    }
}
async function retryNotification(logId) {
    try {
        const log = database_js_1.db.prepare('SELECT * FROM notification_logs WHERE id = ?').get(logId);
        if (!log || !log.order_id) {
            return { success: false, message: 'Notification log not found.' };
        }
        const channel = log.channel;
        const dispatch = await dispatchOrderNotifications(log.order_id, { forceChannels: [channel] });
        const succeeded = dispatch[channel] || dispatch.ownerEmail || dispatch.ownerWhatsApp || dispatch.customerEmail || dispatch.customerWhatsApp;
        return {
            success: succeeded,
            message: succeeded ? 'Notification resent successfully.' : 'Retry attempt failed. Check logs.',
        };
    }
    catch (e) {
        return { success: false, message: e.message || 'Retry failed.' };
    }
}
