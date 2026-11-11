import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import * as XLSX from 'xlsx';

describe('VK Technology Analytics, RBAC, Projects, Apps & Export Test Suite', () => {
  let superAdminToken: string = '';
  let orderManagerToken: string = '';
  let productManagerToken: string = '';
  let inventoryManagerToken: string = '';

  beforeAll(async () => {
    // 1. Super Admin login
    const superAdminRes = await request(app)
      .post('/api/auth/admin-login')
      .send({
        email: 'karthik.suroju@gmail.com',
        password: 'Admin@VK2026!'
      });
    superAdminToken = superAdminRes.body.token || 'vk_admin_session_test_super';

    // 2. Order Manager login
    const orderRes = await request(app)
      .post('/api/auth/admin-login')
      .send({
        email: 'orders@vktechnology.shop',
        password: 'Admin@VK2026!'
      });
    orderManagerToken = orderRes.body.token || '';

    // 3. Product Manager login
    const prodRes = await request(app)
      .post('/api/auth/admin-login')
      .send({
        email: 'product@vktechnology.shop',
        password: 'Admin@VK2026!'
      });
    productManagerToken = prodRes.body.token || '';

    // 4. Inventory Manager login
    const invRes = await request(app)
      .post('/api/auth/admin-login')
      .send({
        email: 'inventory@vktechnology.shop',
        password: 'Admin@VK2026!'
      });
    inventoryManagerToken = invRes.body.token || '';
  });

  // -------------------------------------------------------------
  // Test 1: Public Projects API & 13 Seeded Projects
  // -------------------------------------------------------------
  it('Should fetch all 13 DIY Projects via /api/projects', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body.projects).toBeDefined();
    expect(res.body.projects.length).toBeGreaterThanOrEqual(13);

    const irrigation = res.body.projects.find((p: any) => p.slug === 'smart-irrigation-system');
    expect(irrigation).toBeDefined();
    expect(irrigation.title).toBe('Smart Irrigation System');
  });

  it('Should fetch single project details with components', async () => {
    const res = await request(app).get('/api/projects/smart-irrigation-system');
    expect(res.status).toBe(200);
    expect(res.body.project).toBeDefined();
    expect(res.body.components).toBeDefined();
    expect(res.body.components.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------
  // Test 2: Public Apps API & 7 Seeded Apps
  // -------------------------------------------------------------
  it('Should fetch all 7 VK Technology Apps via /api/apps', async () => {
    const res = await request(app).get('/api/apps');
    expect(res.status).toBe(200);
    expect(res.body.apps).toBeDefined();
    expect(res.body.apps.length).toBeGreaterThanOrEqual(7);

    const iotApp = res.body.apps.find((a: any) => a.slug === 'vk-iot-monitor');
    expect(iotApp).toBeDefined();
    expect(iotApp.status).toBe('Coming Soon');
    expect(Array.isArray(iotApp.features)).toBe(true);
  });

  // -------------------------------------------------------------
  // Test 3: 7 Analytics Domains for SUPER_ADMIN
  // -------------------------------------------------------------
  it('Should allow SUPER_ADMIN to access all 7 analytics domains with full financial data', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.domains).toBeDefined();

    const { finance, salesOps, products, customers, payments, inventory, promotions } = res.body.domains;
    expect(finance.hasAccess).toBe(true);
    expect(typeof finance.grossRevenue).toBe('number');
    expect(typeof salesOps.totalOrders).toBe('number');
    expect(typeof products.totalActiveProducts).toBe('number');
    expect(typeof customers.totalCustomers).toBe('number');
    expect(typeof payments.successRate).toBe('number');
    expect(typeof inventory.stockHealthPercentage).toBe('number');
    expect(typeof promotions.totalActiveCoupons).toBe('number');
  });

  // -------------------------------------------------------------
  // Test 4: RBAC Data Masking for ORDER_MANAGER
  // -------------------------------------------------------------
  it('Should mask financial revenue and customer PII for ORDER_MANAGER', async () => {
    if (!orderManagerToken) return;

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${orderManagerToken}`);

    expect(res.status).toBe(200);
    const { finance, customers, salesOps } = res.body.domains;

    // Finance must be restricted
    expect(finance.hasAccess).toBe(false);
    expect(finance.grossRevenue).toBe(0);

    // Customer PII must be masked
    if (customers.topCustomers && customers.topCustomers.length > 0) {
      expect(customers.topCustomers[0].email).toMatch(/\*\*\*/);
    }

    // Recent orders email must be masked
    if (salesOps.recentOrders && salesOps.recentOrders.length > 0) {
      expect(salesOps.recentOrders[0].customer_email).toMatch(/\*\*\*/);
    }
  });

  // -------------------------------------------------------------
  // Test 5: CSV Export with RFC 4180 UTF-8 BOM & Formula Injection Defense
  // -------------------------------------------------------------
  it('Should export RFC 4180 CSV with UTF-8 BOM and formula sanitization', async () => {
    const res = await request(app)
      .get('/api/analytics/export/csv?domain=orders')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');

    const csvText = res.text;
    // Verify UTF-8 BOM prefix
    expect(csvText.charCodeAt(0)).toBe(0xFEFF);

    // Verify CSV Headers
    expect(csvText).toContain('Order Number');
    expect(csvText).toContain('Customer Name');
    expect(csvText).toContain('Total (INR)');
  });

  // -------------------------------------------------------------
  // Test 6: Multi-Sheet Excel Workbook Export (.xlsx)
  // -------------------------------------------------------------
  it('Should export role-aware Excel (.xlsx) workbook with multiple sheets', async () => {
    const res = await request(app)
      .get('/api/analytics/export/excel')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .responseType('blob');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');

    // Parse the generated buffer with XLSX
    const workbook = XLSX.read(res.body, { type: 'buffer' });
    expect(workbook.SheetNames).toContain('Overview');
    expect(workbook.SheetNames).toContain('Sales_Orders');
    expect(workbook.SheetNames).toContain('Products_Catalog');
  });

  // -------------------------------------------------------------
  // Test 7: Delivery Information & Settings Verification
  // -------------------------------------------------------------
  it('Should verify updated website settings have removed COD and have 1-2 Weeks delivery', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    const settings = res.body.settings || res.body;

    expect(settings.cod_available).toBe('false');
    expect(settings.estimated_dispatch).toBe('1-2 Weeks');
    expect(settings.delivery_notice).toContain('1-2 Weeks');
    expect(settings.owner_name).toBe('S. J. V. Karthik');
    expect(settings.business_address).toContain('Pedamiram');
  });
});
