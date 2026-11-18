import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { db } from '../src/database.js';
import {
  buildOwnerEmailHtml,
  buildCustomerEmailHtml,
  buildOwnerWhatsAppText,
  buildCustomerWhatsAppText,
  formatWhatsAppCleanPhone,
  isValidWhatsAppNumber,
  sendMetaWhatsAppMessage,
  sendSmtpEmail,
  dispatchOrderNotifications,
  resolveOrderData,
  OrderNotificationData
} from '../src/services/notifications.js';

describe('VK Technology Automated Email & WhatsApp Notification System Test Suite', () => {
  const adminToken = 'vk_admin_session_test_superadmin';

  const mockOrderData: OrderNotificationData = {
    orderId: 9999,
    orderNumber: 'VK-2026-TEST01',
    customerName: 'Karthik Tester',
    customerEmail: 'karthik.tester@example.com',
    customerPhone: '+91 9876543210',
    shippingAddress: {
      full_name: 'Karthik Tester',
      phone: '9876543210',
      address_line1: 'Plot 42, Electronics Complex',
      address_line2: 'Near Circuit Junction',
      landmark: 'Opposite Substation',
      city: 'Bhimavaram',
      state: 'Andhra Pradesh',
      postal_code: '534202'
    },
    items: [
      {
        product_id: 1,
        product_name: 'Arduino UNO R4 WiFi',
        product_sku: 'VK-ARD-001',
        product_image: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80',
        unit_price: 1999,
        quantity: 2,
        total_price: 3998
      },
      {
        product_id: 2,
        product_name: 'L298N Motor Driver Module',
        product_sku: 'VK-MOT-001',
        product_image: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80',
        unit_price: 149,
        quantity: 1,
        total_price: 149
      }
    ],
    subtotal: 4147,
    discountAmount: 150,
    shippingFee: 0,
    totalAmount: 3997,
    paymentMethod: 'razorpay',
    paymentStatus: 'Paid',
    orderStatus: 'Confirmed',
    createdAt: new Date().toISOString(),
    utrNumber: 'BANK-REF-998877',
    whatsappConsent: true
  };

  // 1. Phone number formatting & validation
  it('Should correctly format and validate Indian and international WhatsApp phone numbers', () => {
    expect(formatWhatsAppCleanPhone('9876543210')).toBe('919876543210');
    expect(formatWhatsAppCleanPhone('+91 8555997052')).toBe('918555997052');
    expect(formatWhatsAppCleanPhone('918555997052')).toBe('918555997052');
    expect(isValidWhatsAppNumber('918555997052')).toBe(true);
    expect(isValidWhatsAppNumber('9876543210')).toBe(true);
    expect(isValidWhatsAppNumber('123')).toBe(false);
    expect(isValidWhatsAppNumber('')).toBe(false);
  });

  // 2. Owner Email HTML formatting
  it('Should generate responsive owner email containing all required order and customer details', () => {
    const html = buildOwnerEmailHtml(mockOrderData);
    expect(html).toContain('VK-2026-TEST01');
    expect(html).toContain('Karthik Tester');
    expect(html).toContain('karthik.tester@example.com');
    expect(html).toContain('9876543210');
    expect(html).toContain('Bhimavaram');
    expect(html).toContain('534202');
    expect(html).toContain('Arduino UNO R4 WiFi');
    expect(html).toContain('VK-ARD-001');
    expect(html).toContain('3997');
    expect(html).toContain('RAZORPAY');
    expect(html).toContain('Paid');
    expect(html).toContain('karthik.suroju@gmail.com');
  });

  // 3. Customer Email HTML formatting
  it('Should generate responsive customer email with branding, tracking instructions, and support contacts', () => {
    const html = buildCustomerEmailHtml(mockOrderData);
    expect(html).toContain('VK TECHNOLOGY');
    expect(html).toContain('VK-2026-TEST01');
    expect(html).toContain('Karthik Tester');
    expect(html).toContain('Arduino UNO R4 WiFi');
    expect(html).toContain('3-5 Business Days');
    expect(html).toContain('+91 8555997052');
    expect(html).toContain('karthik.suroju@gmail.com');
    expect(html).toContain('/orders');
  });

  // 4. Owner WhatsApp message generation
  it('Should build rich owner WhatsApp notification with financial summary and order items', () => {
    const text = buildOwnerWhatsAppText(mockOrderData);
    expect(text).toContain('VK TECHNOLOGY – NEW ORDER ALERT');
    expect(text).toContain('#VK-2026-TEST01');
    expect(text).toContain('Karthik Tester');
    expect(text).toContain('Arduino UNO R4 WiFi');
    expect(text).toContain('3997.00');
    expect(text).toContain('/admin/orders');
  });

  // 5. Customer WhatsApp message generation
  it('Should build polite customer WhatsApp confirmation with tracking link and customer support', () => {
    const text = buildCustomerWhatsAppText(mockOrderData);
    expect(text).toContain('VK TECHNOLOGY – ORDER CONFIRMED');
    expect(text).toContain('Karthik Tester');
    expect(text).toContain('#VK-2026-TEST01');
    expect(text).toContain('3997.00');
    expect(text).toContain('Estimated Delivery:* 3-5 Business Days');
    expect(text).toContain('+91 8555997052');
  });

  // 6. Meta WhatsApp Business Cloud API validation
  it('Should reject invalid phone numbers before calling Meta Cloud API', async () => {
    const res = await sendMetaWhatsAppMessage('123', 'vk_new_order_owner', [], 'Test message');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid WhatsApp phone number');
  });

  // 7. End-to-end COD Order Placement & Automatic Notifications
  it('Should automatically record notification status when a COD order is placed', async () => {
    // 1. Fetch available product from database
    const product = db.prepare('SELECT id, regular_price FROM products WHERE is_active = 1 LIMIT 1').get() as any;
    expect(product).toBeDefined();

    // 2. Place COD order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'COD Test Customer',
        customer_email: 'cod.tester@example.com',
        customer_phone: '9876543210',
        shipping_address: {
          address_line1: '123 Test Street',
          city: 'Vijayawada',
          state: 'Andhra Pradesh',
          postal_code: '520001'
        },
        items: [
          { product_id: product.id, quantity: 1 }
        ],
        payment_method: 'cod',
        whatsapp_consent: true
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.order).toBeDefined();
    expect(orderRes.body.order.order_number).toBeDefined();
    const orderId = orderRes.body.order.id;

    // 3. Verify notification columns are initialized in the database
    const orderInDb = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    expect(orderInDb.owner_email_status).toBeDefined();
    expect(orderInDb.owner_whatsapp_status).toBeDefined();
    expect(orderInDb.customer_email_status).toBeDefined();
    expect(orderInDb.customer_whatsapp_status).toBeDefined();
  });

  // 8. Admin Notification Inspection & Retry Endpoint
  it('Admin should be able to fetch notification delivery status and trigger retry', async () => {
    const latestOrder = db.prepare('SELECT id FROM orders ORDER BY id DESC LIMIT 1').get() as any;
    expect(latestOrder).toBeDefined();

    // Fetch notification status
    const notifRes = await request(app)
      .get(`/api/orders/admin/${latestOrder.id}/notifications`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.channels).toBeDefined();
    expect(notifRes.body.channels.ownerEmail).toBeDefined();
    expect(notifRes.body.channels.ownerWhatsApp).toBeDefined();
    expect(notifRes.body.channels.customerEmail).toBeDefined();
    expect(notifRes.body.channels.customerWhatsApp).toBeDefined();

    // Trigger retry
    const retryRes = await request(app)
      .post(`/api/orders/admin/${latestOrder.id}/retry-notification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ channel: 'owner_email' });

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.success).toBe(true);

    // Verify retry count incremented
    const updatedOrder = db.prepare('SELECT retry_count FROM orders WHERE id = ?').get(latestOrder.id) as any;
    expect(updatedOrder.retry_count).toBeGreaterThanOrEqual(1);
  });

  // 9. Online Payment Security: Failed payment does NOT send order confirmation
  it('Unverified online payment with tampered signature must be rejected and not confirmed', async () => {
    // 1. Fetch or create a pending order
    let pendingOrder = db.prepare("SELECT id FROM orders WHERE payment_status = 'Pending' LIMIT 1").get() as any;
    if (!pendingOrder) {
      const res = db.prepare(`
        INSERT INTO orders (
          order_number, user_id, customer_name, customer_email, customer_phone,
          shipping_address_json, subtotal, shipping_fee, discount_amount, total_amount,
          payment_method, payment_status, order_status
        ) VALUES (
          ?, 1, 'Payment Tester', 'pay.test@example.com', '9876543210',
          '{}', 1000, 0, 0, 1000, 'razorpay', 'Pending', 'Pending Payment'
        )
      `).run(`VK-PAY-${Date.now()}`);
      pendingOrder = { id: res.lastInsertRowid };
    }

    const orderRes = await request(app)
      .post('/api/orders/verify-payment')
      .send({
        order_id: pendingOrder.id,
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_456',
        razorpay_signature: 'bad'
      });

    // Should return 400 Bad Request
    expect(orderRes.status).toBe(400);
  });
});
