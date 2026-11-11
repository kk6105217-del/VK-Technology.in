import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { db } from '../src/database.js';

describe('VK Technology Autonomous Website QA & Self-Healing Suite', () => {
  let adminToken: string = '';
  let customerToken: string = '';
  let customerId: number = 0;
  let customerEmail = `qa_customer_${Date.now()}@example.com`;
  let testProductId: number;
  let testOrderId: number;
  let testOrderNumber: string;
  let testPaymentId: number;

  beforeAll(async () => {
    // 1. Authenticate as Administrator
    const adminRes = await request(app)
      .post('/api/auth/admin-login')
      .send({
        email: 'admin@vktechnology.shop',
        password: 'Admin@VK2026'
      });

    if (adminRes.status === 200 && adminRes.body.token) {
      adminToken = adminRes.body.token;
    } else {
      const fallbackRes = await request(app)
        .post('/api/auth/admin-login')
        .send({
          email: 'karthik.suroju@gmail.com',
          password: 'Admin@VK2026!'
        });
      adminToken = fallbackRes.body.token;
    }
    expect(adminToken).toBeDefined();
    expect(adminToken.length).toBeGreaterThan(10);
  });

  // =========================================================================
  // PHASE 1: WEBSITE SCANNING & CORE SYSTEM ENDPOINTS
  // =========================================================================
  describe('Phase 1: Core System Endpoints & Routing Integrity', () => {
    it('GET /api/health should return 200 with active store metadata', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.store).toBe('VK Technology');
      expect(res.body.currency).toBe('INR');
    });

    it('GET /api/categories should return 200 with active category list', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories.length).toBeGreaterThan(0);
    });

    it('GET /api/products should return 200 with products list and anti-caching headers', async () => {
      const res = await request(app).get('/api/products?limit=10');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.headers['x-catalog-version']).toBeDefined();
    });

    it('GET /api/banners should return 200 with banner cards', async () => {
      const res = await request(app).get('/api/banners');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.banners)).toBe(true);
    });

    it('GET /api/settings should return 200 with public store configuration', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.settings).toBeDefined();
      expect(res.body.settings.store_name).toBe('VK Technology');
    });

    it('GET /api/upi/config should return 200 with active UPI parameters', async () => {
      const res = await request(app).get('/api/upi/config');
      expect(res.status).toBe(200);
      expect(res.body.upi_id).toBeDefined();
      expect(res.body.payee_name).toBeDefined();
    });

    it('GET /api/openapi.json should return 200 with API schema definition', async () => {
      const res = await request(app).get('/api/openapi.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBeDefined();
    });
  });

  // =========================================================================
  // PHASE 2 & 5: AUTHENTICATION, REGISTRATION, PROFILES & ADDRESSES
  // =========================================================================
  describe('Phase 2 & 5: Customer Authentication & Account Management', () => {
    it('Should register a new customer account with validation', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Rohit Sharma',
          email: customerEmail,
          password: 'SecurePassword123!',
          phone: '+91 9876543211'
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(customerEmail);
      customerToken = res.body.token;
      customerId = res.body.user.id;
    });

    it('Should reject duplicate registration with same email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Rohit Clone',
          email: customerEmail,
          password: 'SecurePassword123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('Should login with registered customer credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: customerEmail,
          password: 'SecurePassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(customerEmail);
    });

    it('Should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: customerEmail,
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
    });

    it('Should fetch customer profile via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(customerEmail);
      expect(res.body.user.full_name).toBe('Rohit Sharma');
    });

    it('Should update customer profile details', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          full_name: 'Rohit K. Sharma',
          phone: '+91 9876500000'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.full_name).toBe('Rohit K. Sharma');
    });

    it('Should manage customer saved delivery addresses', async () => {
      // 1. Add new address
      const addRes = await request(app)
        .post('/api/auth/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          full_name: 'Rohit Sharma',
          phone: '+91 9876500000',
          address_line1: 'Flat 402, Tech Towers',
          address_line2: 'Bhimavaram Road',
          city: 'Bhimavaram',
          state: 'Andhra Pradesh',
          postal_code: '534202',
          is_default: true
        });

      expect([200, 201]).toContain(addRes.status);
      expect(addRes.body.addressId).toBeDefined();
      const addrId = addRes.body.addressId;

      // 2. Fetch addresses
      const getRes = await request(app)
        .get('/api/auth/addresses')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.addresses.length).toBeGreaterThan(0);
      expect(getRes.body.addresses.some((a: any) => a.id === addrId)).toBe(true);

      // 3. Delete address
      const delRes = await request(app)
        .delete(`/api/auth/addresses/${addrId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(delRes.status).toBe(200);
    });

    it('Should support password reset assistance flow', async () => {
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: customerEmail });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.message).toBeDefined();
    });
  });

  // =========================================================================
  // PHASE 2 & 5: CART, WISHLIST, COUPONS & CHECKOUT
  // =========================================================================
  describe('Phase 2 & 5: Cart, Wishlist, Coupons, and Order Placement', () => {
    let sampleProduct: any;

    beforeAll(async () => {
      const res = await request(app).get('/api/products?limit=1');
      sampleProduct = res.body.products[0];
    });

    it('Should manage guest and customer shopping cart', async () => {
      const guestId = `qa_guest_${Date.now()}`;

      // Add item to guest cart
      const addRes = await request(app)
        .post('/api/cart/items')
        .set('x-guest-id', guestId)
        .send({
          product_id: sampleProduct.id,
          quantity: 2
        });

      expect([200, 201]).toContain(addRes.status);

      // View cart
      const getRes = await request(app)
        .get('/api/cart')
        .set('x-guest-id', guestId);

      expect(getRes.status).toBe(200);
      expect(getRes.body.items.length).toBe(1);
      expect(getRes.body.items[0].product_id).toBe(sampleProduct.id);
      expect(getRes.body.items[0].quantity).toBe(2);

      // Update quantity
      const updateRes = await request(app)
        .put('/api/cart/items')
        .set('x-guest-id', guestId)
        .send({
          product_id: sampleProduct.id,
          quantity: 3
        });

      expect(updateRes.status).toBe(200);

      // Remove item
      const removeRes = await request(app)
        .delete(`/api/cart/items/${sampleProduct.id}`)
        .set('x-guest-id', guestId);

      expect(removeRes.status).toBe(200);
    });

    it('Should toggle and persist customer wishlist', async () => {
      // 1. Add to wishlist
      const addWish = await request(app)
        .post('/api/wishlist/toggle')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ product_id: sampleProduct.id });

      expect(addWish.status).toBe(200);
      expect(addWish.body.inWishlist).toBe(true);

      // 2. Fetch wishlist
      const getWish = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(getWish.status).toBe(200);
      expect(getWish.body.items.some((i: any) => i.id === sampleProduct.id || i.product_id === sampleProduct.id)).toBe(true);

      // 3. Remove from wishlist
      const remWish = await request(app)
        .delete(`/api/wishlist/${sampleProduct.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(remWish.status).toBe(200);
    });

    it('Should validate discount coupons correctly', async () => {
      // 1. Valid coupon WELCOMEVK on orders >= 499
      const validRes = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'WELCOMEVK',
          subtotal: 1000
        });

      expect(validRes.status).toBe(200);
      expect(validRes.body.valid).toBe(true);
      expect(validRes.body.coupon).toBeDefined();

      // 2. Ineligible below minimum threshold
      const ineligibleRes = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'WELCOMEVK',
          subtotal: 200
        });

      expect([400, 422]).toContain(ineligibleRes.status);

      // 3. Invalid coupon code
      const invalidRes = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'NONEXISTENT99',
          subtotal: 1000
        });

      expect([400, 404]).toContain(invalidRes.status);
    });

    it('Should place Cash on Delivery (COD) order with stock reduction', async () => {
      const initialStock = sampleProduct.stock_quantity;

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customer_name: 'Rohit K. Sharma',
          customer_email: customerEmail,
          customer_phone: '+91 9876500000',
          shipping_address: {
            full_name: 'Rohit K. Sharma',
            phone: '+91 9876500000',
            address_line1: 'Flat 402, Tech Towers',
            city: 'Bhimavaram',
            state: 'Andhra Pradesh',
            postal_code: '534202'
          },
          items: [
            { product_id: sampleProduct.id, quantity: 1 }
          ],
          payment_method: 'cod'
        });

      expect([200, 201]).toContain(orderRes.status);
      expect(orderRes.body.order).toBeDefined();
      expect(orderRes.body.order.order_number).toBeDefined();
      expect(orderRes.body.order.payment_method).toBe('cod');
      expect(orderRes.body.order.order_status).toBe('Confirmed');

      testOrderId = orderRes.body.order.id;
      testOrderNumber = orderRes.body.order.order_number;

      // Verify stock was reduced in database
      const updatedProduct = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(sampleProduct.id) as any;
      expect(updatedProduct.stock_quantity).toBe(initialStock - 1);
    });

    it('Should place UPI QR order and record pending verification', async () => {
      const utr = `UTR${Date.now()}`;
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customer_name: 'Rohit K. Sharma',
          customer_email: customerEmail,
          customer_phone: '+91 9876500000',
          shipping_address: {
            full_name: 'Rohit K. Sharma',
            phone: '+91 9876500000',
            address_line1: 'Flat 402, Tech Towers',
            city: 'Bhimavaram',
            state: 'Andhra Pradesh',
            postal_code: '534202'
          },
          items: [
            { product_id: sampleProduct.id, quantity: 1 }
          ],
          payment_method: 'upi_qr',
          utr_number: utr
        });

      expect([200, 201]).toContain(orderRes.status);
      expect(orderRes.body.order.payment_method).toBe('upi_qr');
      expect(orderRes.body.order.payment_status).toBe('Pending Verification');

      // Check UPI payment record
      const upiRec = db.prepare('SELECT * FROM upi_payments WHERE order_id = ?').get(orderRes.body.order.id) as any;
      expect(upiRec).toBeDefined();
      expect(upiRec.utr_number).toBe(utr);
      testPaymentId = upiRec.id;
    });

    it('Should allow customer to view order details', async () => {
      const res = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.order.id).toBe(testOrderId);
      expect(res.body.order.order_number).toBe(testOrderNumber);
      expect(Array.isArray(res.body.order.items)).toBe(true);
    });

    it('Should track order milestone by order number and email', async () => {
      const res = await request(app)
        .get(`/api/orders/track/${testOrderNumber}?email=${encodeURIComponent(customerEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body.order.order_number).toBe(testOrderNumber);
    });
  });

  // =========================================================================
  // PHASE 2 & 5: DEDICATED ADMIN MANAGEMENT & REAL-TIME PRODUCT SYNC
  // =========================================================================
  describe('Phase 2 & 5: Dedicated Admin Portal Operations & Auditing', () => {
    it('Should fetch all admin products with inventory statistics', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);
    });

    it('Should create, update, and manage a product via admin portal', async () => {
      const sku = `QA-PROD-${Date.now().toString().slice(-4)}`;

      // 1. Create Product
      const createRes = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Raspberry Pi Pico W Microcontroller with Headers',
          sku,
          category_id: 1,
          regular_price: 650,
          discounted_price: 499,
          stock_quantity: 40,
          brand: 'Raspberry Pi',
          description: 'Official RP2040 dual ARM Cortex-M0+ board with 2.4GHz WiFi',
          specifications: { 'Microcontroller': 'RP2040', 'Wireless': 'Infineon CYW43439' },
          features: ['Compact breadboard friendly', 'Programmable in MicroPython & C++'],
          images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80']
        });

      expect([200, 201]).toContain(createRes.status);
      testProductId = createRes.body.productId;
      expect(testProductId).toBeDefined();

      // 2. Update Product Price & Stock
      const updateRes = await request(app)
        .put(`/api/admin/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          regular_price: 699,
          discounted_price: 549,
          stock_quantity: 50
        });

      expect(updateRes.status).toBe(200);

      // Verify in public query
      const publicView = await request(app).get(`/api/products/${testProductId}`);
      expect(publicView.status).toBe(200);
      expect(publicView.body.product.regular_price).toBe(699);
      expect(publicView.body.product.discounted_price).toBe(549);
      expect(publicView.body.product.stock_quantity).toBe(50);

      // 3. Quick Stock Adjustment
      const stockRes = await request(app)
        .patch(`/api/admin/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stock_quantity: 45 });

      expect(stockRes.status).toBe(200);

      // 4. Toggle publish status
      const statusRes = await request(app)
        .patch(`/api/admin/products/${testProductId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });

      expect(statusRes.status).toBe(200);

      // Verify omitted from public active list
      const catalog = await request(app).get('/api/products?limit=100');
      expect(catalog.body.products.some((p: any) => p.id === testProductId)).toBe(false);

      // 5. Delete product
      const delRes = await request(app)
        .delete(`/api/admin/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
    });

    it('Should allow admin to update order status and tracking details', async () => {
      // 1. Update order status to Shipped
      const statusRes = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          order_status: 'Shipped',
          tracking_number: 'DELHIVERY-778899',
          courier_name: 'Delhivery Surface Express'
        });

      expect(statusRes.status).toBe(200);

      // Verify status updated in database
      const order = db.prepare('SELECT order_status, tracking_number FROM orders WHERE id = ?').get(testOrderId) as any;
      expect(order.order_status).toBe('Shipped');
      expect(order.tracking_number).toBe('DELHIVERY-778899');
    });

    it('Should allow admin to verify and approve UPI payments', async () => {
      if (!testPaymentId) return;

      const approveRes = await request(app)
        .patch(`/api/upi/payments/${testPaymentId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveRes.status).toBe(200);

      const payment = db.prepare('SELECT status FROM upi_payments WHERE id = ?').get(testPaymentId) as any;
      expect(payment.status).toBe('Approved');
    });

    it('Should manage store settings from admin panel', async () => {
      const putRes = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          settings: {
            free_shipping_threshold: '999',
            standard_shipping_fee: '60'
          }
        });

      expect(putRes.status).toBe(200);
    });
  });

  // =========================================================================
  // PHASE 7: SECURITY AUDIT & ACCESS CONTROL
  // =========================================================================
  describe('Phase 7: Security Audit & Access Control Protections', () => {
    it('Should block unauthorized requests to admin endpoints without token', async () => {
      const res = await request(app).get('/api/admin/products');
      expect(res.status).toBe(401);
    });

    it('Should block regular customer token from accessing admin endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Admin');
    });

    it('Should prevent customers from inspecting other users orders', async () => {
      // Create another customer
      const otherEmail = `other_user_${Date.now()}@example.com`;
      const otherReg = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Other User',
          email: otherEmail,
          password: 'Password123!'
        });
      const otherToken = otherReg.body.token;

      // Try to read testOrderId owned by Rohit
      const res = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('Should safely handle SQL injection payloads via parameterized statements', async () => {
      const maliciousPayload = "' OR '1'='1' --";

      // 1. Search injection attempt
      const searchRes = await request(app).get(`/api/products?q=${encodeURIComponent(maliciousPayload)}`);
      expect(searchRes.status).toBe(200);
      expect(Array.isArray(searchRes.body.products)).toBe(true);

      // 2. Login injection attempt
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: maliciousPayload,
          password: "' OR '1'='1'"
        });

      expect(loginRes.status).toBe(401);
    });
  });
});
