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
exports.analyticsRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../database.js");
const auth_js_1 = require("../middleware/auth.js");
const XLSX = __importStar(require("xlsx"));
exports.analyticsRouter = (0, express_1.Router)();
// Formula injection sanitizer (RFC 4180 + Excel DDE injection prevention)
function sanitizeCell(val) {
    if (val === null || val === undefined)
        return '';
    let str = String(val);
    // Neutralize formula triggers
    if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
    }
    // Escape double quotes and enclose in quotes if comma/quote/newline present
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
function maskEmail(email) {
    if (!email || !email.includes('@'))
        return 'c***@customer.local';
    const [user, domain] = email.split('@');
    return `${user.charAt(0)}***@${domain}`;
}
function maskPhone(phone) {
    if (!phone || phone.length < 4)
        return '******';
    return `******${phone.slice(-4)}`;
}
// GET /api/analytics/dashboard - Returns the 7 comprehensive domains
exports.analyticsRouter.get('/dashboard', auth_js_1.authenticateToken, (0, auth_js_1.requireRole)(['SUPER_ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'INVENTORY_MANAGER']), (req, res) => {
    try {
        const userRole = req.user?.role || 'customer';
        const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'admin';
        const isOrderManager = userRole === 'ORDER_MANAGER';
        const isProductManager = userRole === 'PRODUCT_MANAGER';
        const isInventoryManager = userRole === 'INVENTORY_MANAGER';
        const { startDate, endDate } = req.query;
        const start = startDate ? String(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate ? String(endDate) : new Date().toISOString();
        // 1. Finance Domain
        let finance = {
            hasAccess: isSuperAdmin,
            grossRevenue: 0,
            netRevenue: 0,
            totalTax: 0,
            totalShipping: 0,
            totalDiscounts: 0,
            averageOrderValue: 0,
            dailyRevenue: []
        };
        if (isSuperAdmin) {
            const finRow = database_js_1.db.prepare(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as grossRevenue,
          COALESCE(SUM(subtotal), 0) as netRevenue,
          COALESCE(SUM(tax_amount), 0) as totalTax,
          COALESCE(SUM(shipping_fee), 0) as totalShipping,
          COALESCE(SUM(discount_amount), 0) as totalDiscounts,
          COUNT(*) as totalOrdersCount
        FROM orders
        WHERE order_status != 'Cancelled' AND created_at >= ? AND created_at <= ?
      `).get(start, end);
            const totalOrdersCount = finRow?.totalOrdersCount || 0;
            const grossRevenue = finRow?.grossRevenue || 0;
            const aov = totalOrdersCount > 0 ? Math.round(grossRevenue / totalOrdersCount) : 0;
            const daily = database_js_1.db.prepare(`
        SELECT 
          date(created_at) as date,
          COALESCE(SUM(total_amount), 0) as revenue,
          COUNT(*) as orders
        FROM orders
        WHERE order_status != 'Cancelled' AND created_at >= ? AND created_at <= ?
        GROUP BY date(created_at)
        ORDER BY date ASC
      `).all(start, end);
            finance = {
                hasAccess: true,
                grossRevenue,
                netRevenue: finRow?.netRevenue || 0,
                totalTax: finRow?.totalTax || 0,
                totalShipping: finRow?.totalShipping || 0,
                totalDiscounts: finRow?.totalDiscounts || 0,
                averageOrderValue: aov,
                dailyRevenue: daily
            };
        }
        // 2. Sales Operations Domain
        const totalOrdersRow = database_js_1.db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND created_at <= ?
    `).get(start, end);
        const totalOrders = totalOrdersRow?.count || 0;
        const statusRows = database_js_1.db.prepare(`
      SELECT order_status as status, COUNT(*) as count
      FROM orders
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY order_status
    `).all(start, end);
        const ordersByStatus = statusRows.map(r => ({
            status: r.status,
            count: r.count,
            percentage: totalOrders > 0 ? Math.round((r.count / totalOrders) * 100) : 0
        }));
        const deliveredCount = statusRows.find(r => r.status === 'Delivered')?.count || 0;
        const fulfillmentRate = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;
        const rawRecent = database_js_1.db.prepare(`
      SELECT id, order_number, customer_name, customer_email, customer_phone,
             total_amount, payment_method, payment_status, order_status, created_at
      FROM orders
      ORDER BY id DESC LIMIT 10
    `).all();
        const recentOrders = rawRecent.map(o => ({
            ...o,
            customer_name: (isSuperAdmin || isOrderManager) ? o.customer_name : `Customer #${o.id}`,
            customer_email: isSuperAdmin ? o.customer_email : maskEmail(o.customer_email),
            customer_phone: isSuperAdmin ? o.customer_phone : maskPhone(o.customer_phone),
            total_amount: (isSuperAdmin || isOrderManager) ? o.total_amount : 0
        }));
        const salesOps = {
            totalOrders,
            ordersByStatus,
            fulfillmentRate,
            averageFulfillmentDays: 3,
            recentOrders
        };
        // 3. Products Domain
        const activeProductsCount = database_js_1.db.prepare(`SELECT COUNT(*) as count FROM products WHERE is_active = 1`).get()?.count || 0;
        const topSellingRows = database_js_1.db.prepare(`
      SELECT 
        oi.product_id,
        oi.product_name,
        oi.product_sku,
        SUM(oi.quantity) as unitsSold,
        SUM(oi.total_price) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.order_status != 'Cancelled'
      GROUP BY oi.product_id, oi.product_name, oi.product_sku
      ORDER BY unitsSold DESC LIMIT 5
    `).all();
        const topSelling = topSellingRows.map(r => ({
            ...r,
            revenue: isSuperAdmin ? r.revenue : 0
        }));
        const categoryBreakdown = database_js_1.db.prepare(`
      SELECT c.id, c.name, COUNT(p.id) as productCount
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id, c.name
    `).all();
        const lowStockCount = database_js_1.db.prepare(`SELECT COUNT(*) as count FROM products WHERE stock_quantity <= 5 AND stock_quantity > 0 AND is_active = 1`).get()?.count || 0;
        const outOfStockCount = database_js_1.db.prepare(`SELECT COUNT(*) as count FROM products WHERE stock_quantity = 0 AND is_active = 1`).get()?.count || 0;
        const topViewed = database_js_1.db.prepare(`
      SELECT id, name, slug, view_count, rating_avg, stock_quantity
      FROM products
      WHERE is_active = 1
      ORDER BY view_count DESC LIMIT 5
    `).all();
        const productsDomain = {
            totalActiveProducts: activeProductsCount,
            topSelling,
            categoryBreakdown,
            lowStockCount,
            outOfStockCount,
            topViewed
        };
        // 4. Customers Domain
        const totalCustomers = database_js_1.db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'customer'`).get()?.count || 0;
        const newCustomers = database_js_1.db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE role = 'customer' AND created_at >= date('now', 'start of month')
    `).get()?.count || 0;
        const customerSpendRaw = database_js_1.db.prepare(`
      SELECT 
        u.id, u.full_name, u.email, u.phone,
        COUNT(o.id) as orderCount,
        COALESCE(SUM(o.total_amount), 0) as totalSpent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.order_status != 'Cancelled'
      WHERE u.role = 'customer'
      GROUP BY u.id, u.full_name, u.email, u.phone
      ORDER BY totalSpent DESC LIMIT 10
    `).all();
        const repeatCustomers = customerSpendRaw.filter(c => c.orderCount > 1).length;
        const totalWithOrders = customerSpendRaw.filter(c => c.orderCount > 0).length;
        const repeatCustomerRate = totalWithOrders > 0 ? Math.round((repeatCustomers / totalWithOrders) * 100) : 0;
        const topCustomers = customerSpendRaw.map(c => ({
            id: c.id,
            full_name: isSuperAdmin ? c.full_name : `Customer #${c.id}`,
            email: isSuperAdmin ? c.email : maskEmail(c.email),
            phone: isSuperAdmin ? c.phone : maskPhone(c.phone),
            orderCount: c.orderCount,
            totalSpent: isSuperAdmin ? c.totalSpent : 0
        }));
        const customersDomain = {
            totalCustomers,
            newCustomersThisMonth: newCustomers,
            repeatCustomerRate,
            topCustomers
        };
        // 5. Payments Domain
        const paymentMethods = database_js_1.db.prepare(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as totalAmount
      FROM orders
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY payment_method
    `).all(start, end);
        const upiPending = database_js_1.db.prepare(`SELECT COUNT(*) as count FROM upi_payments WHERE status = 'Pending Verification'`).get()?.count || 0;
        const upiApproved = database_js_1.db.prepare(`SELECT COUNT(*) as count FROM upi_payments WHERE status = 'Approved'`).get()?.count || 0;
        const upiRejected = database_js_1.db.prepare(`SELECT COUNT(*) as count FROM upi_payments WHERE status = 'Rejected'`).get()?.count || 0;
        const paidOrders = database_js_1.db.prepare(`SELECT COUNT(*) as count FROM orders WHERE payment_status = 'Paid' AND created_at >= ? AND created_at <= ?`).get(start, end)?.count || 0;
        const successRate = totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : 100;
        const paymentsDomain = {
            paymentMethods: paymentMethods.map(m => ({
                ...m,
                totalAmount: isSuperAdmin ? m.totalAmount : 0
            })),
            successRate,
            pendingUpiCount: upiPending,
            approvedUpiCount: upiApproved,
            rejectedUpiCount: upiRejected
        };
        // 6. Inventory Domain
        const stockStats = database_js_1.db.prepare(`
      SELECT 
        COALESCE(SUM(stock_quantity), 0) as totalUnits,
        COALESCE(SUM(stock_quantity * regular_price), 0) as totalValuation,
        COUNT(*) as totalProducts
      FROM products
      WHERE is_active = 1
    `).get();
        const lowStockItems = database_js_1.db.prepare(`
      SELECT id, name, sku, stock_quantity, regular_price
      FROM products
      WHERE stock_quantity <= 5 AND is_active = 1
      ORDER BY stock_quantity ASC LIMIT 10
    `).all();
        const movements = database_js_1.db.prepare(`
      SELECT im.*, p.name as product_name, p.sku as product_sku
      FROM inventory_movements im
      JOIN products p ON im.product_id = p.id
      ORDER BY im.id DESC LIMIT 10
    `).all();
        const healthyCount = (stockStats?.totalProducts || 0) - lowStockCount - outOfStockCount;
        const stockHealthPercentage = (stockStats?.totalProducts || 0) > 0
            ? Math.max(0, Math.round((healthyCount / stockStats.totalProducts) * 100))
            : 100;
        const inventoryDomain = {
            totalUnitsInStock: stockStats?.totalUnits || 0,
            totalValuation: isSuperAdmin ? stockStats?.totalValuation || 0 : 0,
            lowStockItems: lowStockItems.map(i => ({ ...i, regular_price: isSuperAdmin ? i.regular_price : 0 })),
            outOfStockCount,
            lowStockCount,
            stockHealthPercentage,
            recentMovements: movements
        };
        // 7. Promotions Domain
        const activeCoupons = database_js_1.db.prepare(`SELECT COUNT(*) as count FROM coupons WHERE is_active = 1`).get()?.count || 0;
        const couponsList = database_js_1.db.prepare(`
      SELECT code, description, discount_type, discount_value, times_used, is_active
      FROM coupons
      ORDER BY times_used DESC LIMIT 10
    `).all();
        const totalDiscountRow = database_js_1.db.prepare(`
      SELECT COALESCE(SUM(discount_amount), 0) as totalDiscount
      FROM orders
      WHERE discount_amount > 0 AND created_at >= ? AND created_at <= ?
    `).get(start, end);
        const promotionsDomain = {
            totalActiveCoupons: activeCoupons,
            coupons: couponsList,
            totalDiscountGiven: isSuperAdmin ? totalDiscountRow?.totalDiscount || 0 : 0
        };
        res.json({
            role: userRole,
            dateRange: { start, end },
            domains: {
                finance,
                salesOps,
                products: productsDomain,
                customers: customersDomain,
                payments: paymentsDomain,
                inventory: inventoryDomain,
                promotions: promotionsDomain
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to generate analytics dashboard', details: err.message });
    }
});
// GET /api/analytics/export/csv - RFC 4180 CSV export with formula injection protection & role masking
exports.analyticsRouter.get('/export/csv', auth_js_1.authenticateToken, (0, auth_js_1.requireRole)(['SUPER_ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'INVENTORY_MANAGER']), (req, res) => {
    try {
        const userRole = req.user?.role || 'customer';
        const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'admin';
        const isOrderManager = userRole === 'ORDER_MANAGER';
        const isInventoryManager = userRole === 'INVENTORY_MANAGER';
        const domain = req.query.domain || 'orders';
        let rows = [];
        let headers = [];
        if (domain === 'orders' || domain === 'sales') {
            const orders = database_js_1.db.prepare(`
        SELECT order_number, customer_name, customer_email, customer_phone,
               total_amount, payment_method, payment_status, order_status, tracking_number, created_at
        FROM orders ORDER BY id DESC
      `).all();
            headers = ['Order Number', 'Customer Name', 'Customer Email', 'Customer Phone', 'Total (INR)', 'Payment Method', 'Payment Status', 'Order Status', 'Tracking Number', 'Date'];
            rows = orders.map(o => [
                o.order_number,
                (isSuperAdmin || isOrderManager) ? o.customer_name : `Customer`,
                isSuperAdmin ? o.customer_email : maskEmail(o.customer_email),
                isSuperAdmin ? o.customer_phone : maskPhone(o.customer_phone),
                isSuperAdmin ? o.total_amount : '[RESTRICTED]',
                o.payment_method,
                o.payment_status,
                o.order_status,
                o.tracking_number || 'N/A',
                o.created_at
            ]);
        }
        else if (domain === 'products') {
            const prods = database_js_1.db.prepare(`
        SELECT p.id, p.name, p.sku, c.name as category_name, p.regular_price, p.discounted_price, p.stock_quantity, p.is_active
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.id ASC
      `).all();
            headers = ['Product ID', 'Name', 'SKU', 'Category', 'Regular Price (INR)', 'Discounted Price (INR)', 'Stock Quantity', 'Status'];
            rows = prods.map(p => [
                p.id,
                p.name,
                p.sku,
                p.category_name,
                isInventoryManager ? '[RESTRICTED]' : p.regular_price,
                isInventoryManager ? '[RESTRICTED]' : (p.discounted_price || p.regular_price),
                p.stock_quantity,
                p.is_active ? 'Active' : 'Inactive'
            ]);
        }
        else if (domain === 'inventory') {
            const prods = database_js_1.db.prepare(`
        SELECT id, name, sku, stock_quantity, regular_price, updated_at
        FROM products ORDER BY stock_quantity ASC
      `).all();
            headers = ['ID', 'Product Name', 'SKU', 'Stock Level', 'Stock Status', 'Estimated Valuation (INR)', 'Last Updated'];
            rows = prods.map(p => {
                let status = 'In Stock';
                if (p.stock_quantity === 0)
                    status = 'Out of Stock';
                else if (p.stock_quantity <= 5)
                    status = 'Low Stock';
                return [
                    p.id,
                    p.name,
                    p.sku,
                    p.stock_quantity,
                    status,
                    isSuperAdmin ? (p.stock_quantity * p.regular_price) : '[RESTRICTED]',
                    p.updated_at
                ];
            });
        }
        else if (domain === 'customers') {
            const customers = database_js_1.db.prepare(`
        SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
               COUNT(o.id) as orderCount, COALESCE(SUM(o.total_amount), 0) as totalSpent
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id AND o.order_status != 'Cancelled'
        WHERE u.role = 'customer'
        GROUP BY u.id, u.full_name, u.email, u.phone, u.created_at
        ORDER BY u.id DESC
      `).all();
            headers = ['Customer ID', 'Full Name', 'Email', 'Phone', 'Orders Count', 'Total Spent (INR)', 'Joined Date'];
            rows = customers.map(c => [
                c.id,
                isSuperAdmin ? c.full_name : `Customer #${c.id}`,
                isSuperAdmin ? c.email : maskEmail(c.email),
                isSuperAdmin ? c.phone : maskPhone(c.phone),
                c.orderCount,
                isSuperAdmin ? c.totalSpent : '[RESTRICTED]',
                c.created_at
            ]);
        }
        else {
            // Default to audit log
            headers = ['Audit Event', 'Role', 'Timestamp'];
            rows = [['Report Export Triggered', userRole, new Date().toISOString()]];
        }
        // Build RFC 4180 CSV with UTF-8 BOM
        const headerLine = headers.map(sanitizeCell).join(',');
        const rowLines = rows.map(r => r.map(sanitizeCell).join(','));
        const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin', 'export_csv', 'analytics', domain, { rowCount: rows.length });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="vk_technology_${domain}_${Date.now()}.csv"`);
        res.status(200).send(csvContent);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to generate CSV export', details: err.message });
    }
});
// GET /api/analytics/export/excel - Multi-sheet .xlsx workbook export
exports.analyticsRouter.get('/export/excel', auth_js_1.authenticateToken, (0, auth_js_1.requireRole)(['SUPER_ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'INVENTORY_MANAGER']), (req, res) => {
    try {
        const userRole = req.user?.role || 'customer';
        const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'admin';
        const isOrderManager = userRole === 'ORDER_MANAGER';
        const isProductManager = userRole === 'PRODUCT_MANAGER';
        const isInventoryManager = userRole === 'INVENTORY_MANAGER';
        const wb = XLSX.utils.book_new();
        // 1. Overview Sheet
        const overviewData = [
            ['VK Technology - Enterprise Analytics Export'],
            ['Generated At', new Date().toISOString()],
            ['Authorized Role', userRole],
            ['Classification', isSuperAdmin ? 'Full Confidential' : 'Role-Restricted'],
            []
        ];
        const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');
        // 2. Sales / Orders Sheet (For Super Admin and Order Manager)
        if (isSuperAdmin || isOrderManager) {
            const orders = database_js_1.db.prepare(`
        SELECT order_number, customer_name, customer_email, customer_phone,
               total_amount, payment_method, payment_status, order_status, tracking_number, created_at
        FROM orders ORDER BY id DESC LIMIT 500
      `).all();
            const ordersSheetData = orders.map(o => ({
                'Order Number': o.order_number,
                'Customer Name': (isSuperAdmin || isOrderManager) ? o.customer_name : 'Customer',
                'Customer Email': isSuperAdmin ? o.customer_email : maskEmail(o.customer_email),
                'Customer Phone': isSuperAdmin ? o.customer_phone : maskPhone(o.customer_phone),
                'Total (INR)': isSuperAdmin ? o.total_amount : 0,
                'Payment Method': o.payment_method,
                'Payment Status': o.payment_status,
                'Order Status': o.order_status,
                'Tracking ID': o.tracking_number || 'N/A',
                'Date': o.created_at
            }));
            const wsOrders = XLSX.utils.json_to_sheet(ordersSheetData);
            XLSX.utils.book_append_sheet(wb, wsOrders, 'Sales_Orders');
        }
        // 3. Products Sheet (For Super Admin and Product Manager)
        if (isSuperAdmin || isProductManager) {
            const prods = database_js_1.db.prepare(`
        SELECT p.id, p.name, p.sku, c.name as category_name, p.regular_price, p.discounted_price, p.stock_quantity, p.is_active
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.id ASC
      `).all();
            const prodSheetData = prods.map(p => ({
                'Product ID': p.id,
                'Name': p.name,
                'SKU': p.sku,
                'Category': p.category_name,
                'Regular Price (INR)': isInventoryManager ? 0 : p.regular_price,
                'Discounted Price (INR)': isInventoryManager ? 0 : (p.discounted_price || p.regular_price),
                'Stock Quantity': p.stock_quantity,
                'Status': p.is_active ? 'Active' : 'Inactive'
            }));
            const wsProducts = XLSX.utils.json_to_sheet(prodSheetData);
            XLSX.utils.book_append_sheet(wb, wsProducts, 'Products_Catalog');
        }
        // 4. Inventory Sheet (For Super Admin and Inventory Manager)
        if (isSuperAdmin || isInventoryManager) {
            const stock = database_js_1.db.prepare(`
        SELECT id, name, sku, stock_quantity, regular_price, updated_at
        FROM products ORDER BY stock_quantity ASC
      `).all();
            const stockSheetData = stock.map(p => ({
                'Product ID': p.id,
                'Name': p.name,
                'SKU': p.sku,
                'Stock Level': p.stock_quantity,
                'Health Status': p.stock_quantity === 0 ? 'Out of Stock' : (p.stock_quantity <= 5 ? 'Low Stock' : 'Optimal'),
                'Valuation (INR)': isSuperAdmin ? (p.stock_quantity * p.regular_price) : 0,
                'Last Updated': p.updated_at
            }));
            const wsStock = XLSX.utils.json_to_sheet(stockSheetData);
            XLSX.utils.book_append_sheet(wb, wsStock, 'Inventory_Stock');
        }
        // 5. Customers Sheet (Super Admin only for full details, Aggregate for Order Manager)
        if (isSuperAdmin) {
            const customers = database_js_1.db.prepare(`
        SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
               COUNT(o.id) as orderCount, COALESCE(SUM(o.total_amount), 0) as totalSpent
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id AND o.order_status != 'Cancelled'
        WHERE u.role = 'customer'
        GROUP BY u.id, u.full_name, u.email, u.phone, u.created_at
        ORDER BY totalSpent DESC
      `).all();
            const custSheetData = customers.map(c => ({
                'Customer ID': c.id,
                'Name': c.full_name,
                'Email': c.email,
                'Phone': c.phone,
                'Order Count': c.orderCount,
                'Total Spent (INR)': c.totalSpent,
                'Join Date': c.created_at
            }));
            const wsCustomers = XLSX.utils.json_to_sheet(custSheetData);
            XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');
        }
        // Generate binary buffer
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        (0, database_js_1.recordAuditLog)(req.user?.email || 'admin', 'export_excel', 'analytics', 'all', { role: userRole });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="vk_technology_analytics_${Date.now()}.xlsx"`);
        res.status(200).send(excelBuffer);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to generate Excel export', details: err.message });
    }
});
