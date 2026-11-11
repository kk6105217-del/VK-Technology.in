"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOwnerWhatsAppNumber = getOwnerWhatsAppNumber;
exports.isValidWhatsAppNumber = isValidWhatsAppNumber;
exports.formatWhatsAppCleanPhone = formatWhatsAppCleanPhone;
exports.generateOwnerWhatsAppLink = generateOwnerWhatsAppLink;
exports.generateCustomerWhatsAppLink = generateCustomerWhatsAppLink;
exports.sendOrderNotifications = sendOrderNotifications;
exports.sendOrderStatusUpdate = sendOrderStatusUpdate;
exports.retryNotification = retryNotification;
const config_js_1 = require("../config.js");
const database_js_1 = require("../database.js");
const nodemailer_1 = __importDefault(require("nodemailer"));
// Get configured owner WhatsApp number from website_settings or fallback to config
function getOwnerWhatsAppNumber() {
    try {
        const row = database_js_1.db.prepare("SELECT value FROM website_settings WHERE key = 'owner_whatsapp_number'").get();
        if (row && row.value && row.value.trim()) {
            return row.value.trim();
        }
    }
    catch (e) { }
    return config_js_1.config.ownerWhatsappNumber || '+91 8555997052';
}
// Validate WhatsApp number (E.164 or 10-15 digit international/Indian number)
function isValidWhatsAppNumber(phone) {
    if (!phone)
        return false;
    const clean = phone.replace(/[^0-9]/g, '');
    // Indian mobile 10 digits or 12 digits with 91 prefix, or international 10-15 digits
    return clean.length >= 10 && clean.length <= 15;
}
function formatWhatsAppCleanPhone(phone) {
    if (!phone || typeof phone !== 'string')
        return '';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) {
        clean = `91${clean}`;
    }
    return clean;
}
// Generate WhatsApp direct web link for Owner
function generateOwnerWhatsAppLink(order) {
    const ownerPhone = getOwnerWhatsAppNumber();
    const cleanPhone = formatWhatsAppCleanPhone(ownerPhone);
    const itemsText = order.items.map(item => `• ${item.product_name} (x${item.quantity}) - ₹${item.total_price.toFixed(2)}`).join('\n');
    const addressText = `${order.shippingAddress?.address_line1 || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} - ${order.shippingAddress?.postal_code || ''}`;
    const message = `🔔 *VK Technology - New Order Alert!* 🔔\n\n` +
        `*Order ID:* #${order.orderNumber}\n` +
        `*Customer:* ${order.customerName}\n` +
        `*Phone:* ${order.customerPhone}\n` +
        `*Email:* ${order.customerEmail}\n\n` +
        `*Ordered Products:*\n${itemsText}\n\n` +
        `*Subtotal:* ₹${order.subtotal.toFixed(2)}\n` +
        (order.discountAmount > 0 ? `*Discount:* -₹${order.discountAmount.toFixed(2)}\n` : '') +
        `*Shipping:* ₹${order.shippingFee.toFixed(2)}\n` +
        `*Total Order Amount:* ₹${order.totalAmount.toFixed(2)}\n\n` +
        `*Payment Method:* ${order.paymentMethod.toUpperCase()}\n` +
        `*Payment Status:* ${order.paymentStatus}\n` +
        (order.utrNumber ? `*UTR / Reference:* ${order.utrNumber}\n` : '') +
        `*Order Status:* ${order.orderStatus}\n\n` +
        `*Shipping Address:*\n${addressText}\n\n` +
        `*Order Dashboard Link:*\n${config_js_1.config.frontendUrl}/admin/orders`;
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}
// Generate WhatsApp direct web link for Customer
function generateCustomerWhatsAppLink(order) {
    const cleanPhone = formatWhatsAppCleanPhone(order.customerPhone);
    const itemsText = order.items.map(item => `• ${item.product_name} (x${item.quantity}) = ₹${item.total_price.toFixed(2)}`).join('\n');
    const message = `🚀 *VK Technology - Order Confirmation* 🚀\n\n` +
        `Hello ${order.customerName},\n` +
        `Thank you for shopping with VK Technology! Your order has been placed successfully.\n\n` +
        `*Order ID:* #${order.orderNumber}\n` +
        `*Items:*\n${itemsText}\n\n` +
        `*Total Payable:* ₹${order.totalAmount.toFixed(2)}\n` +
        `*Payment Method:* ${order.paymentMethod.toUpperCase()}\n` +
        `*Payment Status:* ${order.paymentStatus}\n` +
        `*Order Status:* ${order.orderStatus}\n\n` +
        (order.paymentMethod === 'upi_qr'
            ? `⏳ *UPI Payment Verification:* Our team is verifying your transaction. You will receive an update once verified.\n\n`
            : '') +
        `Track your shipment live:\n${config_js_1.config.frontendUrl}/orders\n\n` +
        `For support or project questions, reply directly to this chat.\n` +
        `*VK Technology • India*`;
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}
async function sendOrderNotifications(order, orderDbId) {
    let emailSent = false;
    let whatsappOwnerSent = false;
    let whatsappCustomerSent = false;
    const whatsappOwnerLink = generateOwnerWhatsAppLink(order);
    const whatsappCustomerLink = generateCustomerWhatsAppLink(order);
    const ownerPhone = getOwnerWhatsAppNumber();
    const cleanOwnerPhone = formatWhatsAppCleanPhone(ownerPhone);
    const cleanCustomerPhone = formatWhatsAppCleanPhone(order.customerPhone);
    const subject = `[VK Technology] New Order: #${order.orderNumber} (₹${order.totalAmount.toFixed(2)})`;
    const itemsHtml = order.items.map(i => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
        <strong>${i.product_name}</strong><br/>
        <span style="font-size: 12px; color: #6b7280;">SKU: ${i.product_sku}</span>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${i.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${i.unit_price.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">₹${i.total_price.toFixed(2)}</td>
    </tr>
  `).join('');
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6; color: #111827;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background-color: #131921; color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">VK TECHNOLOGY</h1>
          <p style="margin: 6px 0 0; font-size: 14px; color: #febd69;">DIY Electronics, Robotics & IoT Kits • India</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
            <h2 style="margin: 0 0 4px; color: #065f46; font-size: 18px;">Order Placed!</h2>
            <p style="margin: 0; color: #047857; font-size: 14px;">Order ID: <strong>#${order.orderNumber}</strong> • Customer: <strong>${order.customerName}</strong></p>
          </div>

          <h3 style="margin-top: 0; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f9fafb; text-align: left; color: #4b5563;">
                <th style="padding: 10px;">Item</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Unit Price</th>
                <th style="padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #4b5563;">Subtotal:</td>
                <td style="padding: 4px 0; text-align: right;">₹${order.subtotal.toFixed(2)}</td>
              </tr>
              ${order.discountAmount > 0 ? `
              <tr>
                <td style="padding: 4px 0; color: #059669;">Discount:</td>
                <td style="padding: 4px 0; text-align: right; color: #059669;">-₹${order.discountAmount.toFixed(2)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 4px 0; color: #4b5563;">Shipping Charges:</td>
                <td style="padding: 4px 0; text-align: right;">${order.shippingFee === 0 ? '<span style="color:#059669; font-weight: bold;">FREE</span>' : '₹' + order.shippingFee.toFixed(2)}</td>
              </tr>
              <tr style="font-size: 16px; font-weight: bold; border-top: 2px solid #e5e7eb;">
                <td style="padding: 10px 0 4px; color: #111827;">Total Paid/Payable:</td>
                <td style="padding: 10px 0 4px; text-align: right; color: #b12704;">₹${order.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div style="display: grid; grid-template-columns: 1fr; gap: 16px; font-size: 13px; margin-bottom: 24px;">
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px;">
              <strong style="color: #374151;">Delivery Address:</strong><br/>
              ${order.shippingAddress?.full_name || order.customerName}<br/>
              ${order.shippingAddress?.address_line1 || ''} ${order.shippingAddress?.address_line2 || ''}<br/>
              ${order.shippingAddress?.landmark ? 'Landmark: ' + order.shippingAddress.landmark + '<br/>' : ''}
              ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} - ${order.shippingAddress?.postal_code || ''}<br/>
              Phone: ${order.customerPhone}
            </div>
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px;">
              <strong style="color: #374151;">Payment & Order Info:</strong><br/>
              Payment Method: <strong>${order.paymentMethod.toUpperCase()}</strong><br/>
              Payment Status: <strong>${order.paymentStatus}</strong><br/>
              ${order.utrNumber ? `UTR / Ref: <strong>${order.utrNumber}</strong><br/>` : ''}
              Order Status: <strong>${order.orderStatus}</strong>
            </div>
          </div>

          <div style="text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            <p style="margin: 0 0 6px;">VK Technology • India</p>
            <p style="margin: 0;">Owner Admin: <a href="mailto:${config_js_1.config.adminEmail}" style="color: #007185;">${config_js_1.config.adminEmail}</a> | WhatsApp: ${ownerPhone}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
    // 1. Email Dispatch
    const recipients = [order.customerEmail, config_js_1.config.adminEmail];
    if (config_js_1.config.resendApiKey) {
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config_js_1.config.resendApiKey}`
                },
                body: JSON.stringify({
                    from: config_js_1.config.emailFrom,
                    to: recipients,
                    subject: subject,
                    html: emailHtml
                })
            });
            if (response.ok) {
                emailSent = true;
                logNotification(orderDbId, 'email', recipients.join(', '), subject, 'sent', null);
            }
            else {
                const errText = await response.text();
                logNotification(orderDbId, 'email', recipients.join(', '), subject, 'failed', errText);
            }
        }
        catch (err) {
            logNotification(orderDbId, 'email', recipients.join(', '), subject, 'failed', err.message);
        }
    }
    else if (config_js_1.config.smtpHost && config_js_1.config.smtpUser && config_js_1.config.smtpPass) {
        try {
            const transporter = nodemailer_1.default.createTransport({
                host: config_js_1.config.smtpHost,
                port: config_js_1.config.smtpPort,
                secure: config_js_1.config.smtpPort === 465,
                auth: {
                    user: config_js_1.config.smtpUser,
                    pass: config_js_1.config.smtpPass
                }
            });
            await transporter.sendMail({
                from: config_js_1.config.emailFrom,
                to: recipients,
                subject: subject,
                html: emailHtml
            });
            emailSent = true;
            logNotification(orderDbId, 'email', recipients.join(', '), subject, 'sent', null);
        }
        catch (err) {
            logNotification(orderDbId, 'email', recipients.join(', '), subject, 'failed', err.message);
        }
    }
    else {
        logNotification(orderDbId, 'email', recipients.join(', '), subject, 'pending_credentials', 'Email credentials not yet set in .env. Order email logged successfully.');
    }
    // 2. Official WhatsApp API Dispatch to OWNER (+91 8555997052)
    if (config_js_1.config.whatsappApiToken && config_js_1.config.whatsappPhoneId && isValidWhatsAppNumber(ownerPhone)) {
        try {
            const ownerWaResponse = await fetch(`https://graph.facebook.com/v19.0/${config_js_1.config.whatsappPhoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config_js_1.config.whatsappApiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: cleanOwnerPhone,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: `🔔 *VK Technology - New Order Alert!*\nOrder: #${order.orderNumber}\nCustomer: ${order.customerName} (${order.customerPhone})\nAmount: ₹${order.totalAmount}\nPayment: ${order.paymentStatus} (${order.paymentMethod.toUpperCase()})\nDashboard: ${config_js_1.config.frontendUrl}/admin/orders`
                    }
                })
            });
            if (ownerWaResponse.ok) {
                whatsappOwnerSent = true;
                logNotification(orderDbId, 'whatsapp_owner', ownerPhone, 'owner_order_alert', 'sent', null);
            }
            else {
                const errText = await ownerWaResponse.text();
                logNotification(orderDbId, 'whatsapp_owner', ownerPhone, 'owner_order_alert', 'failed', errText);
            }
        }
        catch (err) {
            logNotification(orderDbId, 'whatsapp_owner', ownerPhone, 'owner_order_alert', 'failed', err.message);
        }
    }
    else {
        logNotification(orderDbId, 'whatsapp_owner', ownerPhone, 'owner_order_alert', 'pending_credentials', 'Official WhatsApp credentials not configured. Fallback WhatsApp link generated.');
    }
    // 3. Official WhatsApp API Dispatch to CUSTOMER
    if (config_js_1.config.whatsappApiToken && config_js_1.config.whatsappPhoneId && isValidWhatsAppNumber(order.customerPhone)) {
        try {
            const custWaResponse = await fetch(`https://graph.facebook.com/v19.0/${config_js_1.config.whatsappPhoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config_js_1.config.whatsappApiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: cleanCustomerPhone,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: `Hi ${order.customerName}, your VK Technology order #${order.orderNumber} for ₹${order.totalAmount} has been placed! Track your order: ${config_js_1.config.frontendUrl}/orders`
                    }
                })
            });
            if (custWaResponse.ok) {
                whatsappCustomerSent = true;
                logNotification(orderDbId, 'whatsapp_customer', order.customerPhone, 'customer_order_placed', 'sent', null);
            }
            else {
                const errText = await custWaResponse.text();
                logNotification(orderDbId, 'whatsapp_customer', order.customerPhone, 'customer_order_placed', 'failed', errText);
            }
        }
        catch (err) {
            logNotification(orderDbId, 'whatsapp_customer', order.customerPhone, 'customer_order_placed', 'failed', err.message);
        }
    }
    else {
        logNotification(orderDbId, 'whatsapp_customer', order.customerPhone, 'customer_order_placed', 'pending_credentials', 'Official WhatsApp credentials not configured. Fallback WhatsApp link generated.');
    }
    return {
        emailSent,
        whatsappOwnerSent,
        whatsappCustomerSent,
        whatsappOwnerLink,
        whatsappCustomerLink,
        details: 'Notifications processed. Fallback WhatsApp links created.'
    };
}
// Send Status Milestone Update to Customer
async function sendOrderStatusUpdate(orderId, newStatus, trackingNumber, customNote) {
    try {
        const order = database_js_1.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        if (!order)
            return false;
        const rawPhone = order.customer_phone || order.customerPhone || '';
        const cleanPhone = formatWhatsAppCleanPhone(rawPhone);
        const trackingMsg = trackingNumber ? `Tracking No: ${trackingNumber}\n` : '';
        const noteMsg = customNote ? `Note: ${customNote}\n` : '';
        const message = `📦 *VK Technology - Order Status Update*\n\n` +
            `Hello ${order.customer_name},\n` +
            `Your order *#${order.order_number}* is now: *${newStatus.toUpperCase()}*!\n` +
            `${trackingMsg}` +
            `${noteMsg}` +
            `Track your package here: ${config_js_1.config.frontendUrl}/orders\n\n` +
            `Thank you for building with VK Technology!`;
        // Attempt official WhatsApp if configured
        if (config_js_1.config.whatsappApiToken && config_js_1.config.whatsappPhoneId && isValidWhatsAppNumber(order.customer_phone)) {
            try {
                const res = await fetch(`https://graph.facebook.com/v19.0/${config_js_1.config.whatsappPhoneId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config_js_1.config.whatsappApiToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: cleanPhone,
                        type: 'text',
                        text: { preview_url: false, body: message }
                    })
                });
                if (res.ok) {
                    logNotification(orderId, 'whatsapp_customer', order.customer_phone, `status_update_${newStatus}`, 'sent', null);
                    return true;
                }
                else {
                    const err = await res.text();
                    logNotification(orderId, 'whatsapp_customer', order.customer_phone, `status_update_${newStatus}`, 'failed', err);
                }
            }
            catch (e) {
                logNotification(orderId, 'whatsapp_customer', order.customer_phone, `status_update_${newStatus}`, 'failed', e.message);
            }
        }
        else {
            logNotification(orderId, 'whatsapp_customer', order.customer_phone, `status_update_${newStatus}`, 'pending_credentials', 'WhatsApp API credentials not configured.');
        }
        return false;
    }
    catch (e) {
        console.error('Failed to dispatch status update notification:', e);
        return false;
    }
}
// Retry a failed notification from database log
async function retryNotification(logId) {
    try {
        const log = database_js_1.db.prepare('SELECT * FROM notification_logs WHERE id = ?').get(logId);
        if (!log) {
            return { success: false, message: 'Notification log not found.' };
        }
        if (log.channel.startsWith('whatsapp') && config_js_1.config.whatsappApiToken && config_js_1.config.whatsappPhoneId) {
            const cleanPhone = formatWhatsAppCleanPhone(log.recipient);
            const res = await fetch(`https://graph.facebook.com/v19.0/${config_js_1.config.whatsappPhoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config_js_1.config.whatsappApiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: cleanPhone,
                    type: 'text',
                    text: { preview_url: false, body: `VK Technology Notification: ${log.subject_or_template}` }
                })
            });
            if (res.ok) {
                database_js_1.db.prepare("UPDATE notification_logs SET status = 'sent', error_message = NULL, sent_at = datetime('now') WHERE id = ?").run(logId);
                return { success: true, message: 'Notification resent successfully.' };
            }
            else {
                const err = await res.text();
                database_js_1.db.prepare("UPDATE notification_logs SET status = 'failed', error_message = ?, sent_at = datetime('now') WHERE id = ?").run(err, logId);
                return { success: false, message: `Failed to resend: ${err}` };
            }
        }
        return { success: false, message: 'Credentials not configured for retry.' };
    }
    catch (e) {
        return { success: false, message: e.message || 'Retry failed.' };
    }
}
function logNotification(orderId, channel, recipient, subject, status, error) {
    try {
        database_js_1.db.prepare(`
      INSERT INTO notification_logs (order_id, channel, recipient, subject_or_template, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(orderId || null, channel, recipient, subject, status, error);
    }
    catch (e) {
        console.error('Failed to write notification log:', e);
    }
}
