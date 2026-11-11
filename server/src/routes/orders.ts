import { Router, Response, Request } from 'express';
import crypto from 'crypto';
import { db } from '../database.js';
import { config } from '../config.js';
import { authenticateToken, requireAdmin, optionalToken, AuthenticatedRequest } from '../middleware/auth.js';
import { sendOrderNotifications, sendOrderStatusUpdate, retryNotification } from '../services/notifications.js';

export const ordersRouter = Router();

// Helper to generate unique order number
function generateOrderNumber(): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const timestamp = Date.now().toString().slice(-4);
  return `VK-${new Date().getFullYear()}-${timestamp}${randomSuffix}`;
}

// Create a new order (Supports both logged-in users and guests)
ordersRouter.post('/', optionalToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      items,
      coupon_code,
      payment_method, // 'razorpay' | 'cod' | 'upi_qr'
      notes,
      utr_number,
      payment_screenshot
    } = req.body;

    if (!customer_name || !customer_email || !customer_phone || !shipping_address || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Please provide all customer details, shipping address, and order items.' });
      return;
    }

    if (!['razorpay', 'cod', 'upi_qr'].includes(payment_method)) {
      res.status(400).json({ error: 'Invalid payment method selected.' });
      return;
    }

    // Server-side validation of items, prices, and stock
    let subtotal = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const product = db.prepare(`
        SELECT p.*, 
          (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) as primary_image
        FROM products p 
        WHERE p.id = ? AND p.is_active = 1
      `).get(item.product_id) as any;

      if (!product) {
        res.status(400).json({ error: `Product ID #${item.product_id} is no longer available.` });
        return;
      }

      if (product.stock_quantity < item.quantity) {
        res.status(400).json({
          error: `Insufficient stock for "${product.name}". Only ${product.stock_quantity} left in stock.`
        });
        return;
      }

      const unitPrice = product.discounted_price !== null && product.discounted_price !== undefined
        ? Number(product.discounted_price)
        : Number(product.regular_price);

      const itemTotal = unitPrice * Number(item.quantity);
      subtotal += itemTotal;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        product_image: product.primary_image || '',
        unit_price: unitPrice,
        quantity: Number(item.quantity),
        total_price: itemTotal
      });
    }

    // Coupon calculation
    let discountAmount = 0;
    let appliedCoupon: any = null;
    if (coupon_code) {
      const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(coupon_code.trim().toUpperCase()) as any;
      if (coupon) {
        if (!coupon.min_order_value || subtotal >= coupon.min_order_value) {
          if (coupon.discount_type === 'percentage') {
            discountAmount = (subtotal * coupon.discount_value) / 100;
            if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
              discountAmount = coupon.max_discount_amount;
            }
          } else {
            discountAmount = coupon.discount_value;
          }
          appliedCoupon = coupon;
        }
      }
    }

    // Shipping fee calculation
    const freeShippingThreshold = 999;
    let shippingFee = subtotal >= freeShippingThreshold ? 0 : 60;
    if (payment_method === 'cod') {
      shippingFee += 40; // COD handling fee
    }

    const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);
    const orderNumber = generateOrderNumber();
    const userId = req.user ? req.user.id : null;

    // Initial status
    let paymentStatus = 'Pending Payment';
    let orderStatus = 'Pending Payment';

    if (payment_method === 'cod') {
      paymentStatus = 'Pending Payment (COD)';
      orderStatus = 'Confirmed';
    } else if (payment_method === 'upi_qr') {
      paymentStatus = 'Pending Verification';
      orderStatus = 'Processing';
    }

    // Insert order in transaction
    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        shipping_address_json, subtotal, discount_amount, coupon_code,
        shipping_fee, tax_amount, total_amount, payment_method, payment_status,
        order_status, notes, utr_number, payment_screenshot
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, 0, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    const insertResult = insertOrderStmt.run(
      orderNumber,
      userId,
      customer_name.trim(),
      customer_email.trim().toLowerCase(),
      customer_phone.trim(),
      JSON.stringify(shipping_address),
      subtotal,
      discountAmount,
      appliedCoupon ? appliedCoupon.code : null,
      shippingFee,
      totalAmount,
      payment_method,
      paymentStatus,
      orderStatus,
      notes || null,
      utr_number || null,
      payment_screenshot || null
    );

    const orderId = Number(insertResult.lastInsertRowid);

    // Insert order items
    const insertItemStmt = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, product_name, product_sku, product_image,
        unit_price, quantity, total_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of validatedItems) {
      insertItemStmt.run(
        orderId,
        item.product_id,
        item.product_name,
        item.product_sku,
        item.product_image,
        item.unit_price,
        item.quantity,
        item.total_price
      );
    }

    // If Cash On Delivery or UPI QR, decrement stock & dispatch notifications
    let notificationResult = null;
    if (payment_method === 'cod' || payment_method === 'upi_qr') {
      for (const item of validatedItems) {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = datetime(\'now\') WHERE id = ?').run(item.quantity, item.product_id);
      }

      if (appliedCoupon) {
        db.prepare('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?').run(appliedCoupon.id);
      }

      // Record in upi_payments table if UPI QR
      if (payment_method === 'upi_qr') {
        db.prepare(`
          INSERT INTO upi_payments (order_id, order_number, customer_name, customer_phone, customer_email, amount, utr_number, screenshot_url, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending Verification')
        `).run(
          orderId,
          orderNumber,
          customer_name.trim(),
          customer_phone.trim(),
          customer_email.trim(),
          totalAmount,
          utr_number || 'Pending Verification',
          payment_screenshot || null
        );
      }

      notificationResult = await sendOrderNotifications({
        orderNumber,
        customerName: customer_name,
        customerEmail: customer_email,
        customerPhone: customer_phone,
        shippingAddress: shipping_address,
        items: validatedItems,
        subtotal,
        discountAmount,
        shippingFee,
        totalAmount,
        paymentMethod: payment_method === 'upi_qr' ? 'UPI QR Code' : 'COD (Cash on Delivery)',
        paymentStatus,
        orderStatus,
        createdAt: new Date().toISOString(),
        utrNumber: utr_number || null
      }, orderId);
    }

    res.status(201).json({
      message: 'Order created successfully.',
      order: {
        id: orderId,
        order_number: orderNumber,
        total_amount: totalAmount,
        payment_method,
        payment_status: paymentStatus,
        order_status: orderStatus,
        shipping_fee: shippingFee,
        discount_amount: discountAmount
      },
      notifications: notificationResult
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to process order. Please try again.' });
  }
});

// Create Razorpay server order
ordersRouter.post('/create-razorpay-order', optionalToken, async (req: Request, res: Response) => {
  try {
    const { order_id } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id) as any;

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const amountInPaise = Math.round(order.total_amount * 100);

    // If Razorpay keys are configured, use official API
    if (config.razorpayKeyId && config.razorpayKeySecret) {
      const basicAuth = Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: order.order_number,
          payment_capture: 1
        })
      });

      if (!response.ok) {
        const err = (await response.json()) as any;
        res.status(400).json({ error: err.error?.description || 'Razorpay order creation failed.' });
        return;
      }

      const razorpayOrder = (await response.json()) as any;
      db.prepare('UPDATE orders SET razorpay_order_id = ? WHERE id = ?').run(razorpayOrder.id, order.id);

      res.json({
        key: config.razorpayKeyId,
        razorpay_order_id: razorpayOrder.id,
        amount: amountInPaise,
        currency: 'INR',
        order_number: order.order_number,
        is_mock: false
      });
    } else {
      // Test sandbox mode when live credentials are not yet added
      const mockRazorpayId = `order_mock_${Date.now()}`;
      db.prepare('UPDATE orders SET razorpay_order_id = ? WHERE id = ?').run(mockRazorpayId, order.id);

      res.json({
        key: 'rzp_test_vktech_sandbox',
        razorpay_order_id: mockRazorpayId,
        amount: amountInPaise,
        currency: 'INR',
        order_number: order.order_number,
        is_mock: true,
        message: 'Razorpay keys not yet configured in .env. Test simulation mode enabled.'
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to initialize payment.' });
  }
});

// Verify Payment and finalize order
ordersRouter.post('/verify-payment', optionalToken, async (req: Request, res: Response) => {
  try {
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, is_mock } = req.body;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.payment_status === 'Paid') {
      res.json({ message: 'Order is already marked as paid.', order_number: order.order_number });
      return;
    }

    // Verify signature if real Razorpay credentials are used
    if (!is_mock && config.razorpayKeySecret) {
      const hmac = crypto.createHmac('sha256', config.razorpayKeySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        res.status(400).json({ error: 'Payment signature verification failed. Transaction was not verified.' });
        return;
      }
    }

    // Update order status to Paid and Confirmed
    db.prepare(`
      UPDATE orders SET
        payment_status = 'Paid',
        order_status = 'Confirmed',
        razorpay_order_id = ?,
        razorpay_payment_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(razorpay_order_id || 'mock_order', razorpay_payment_id || `pay_${Date.now()}`, order.id);

    // Record payment
    db.prepare(`
      INSERT INTO payments (order_id, payment_method, transaction_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, status)
      VALUES (?, 'razorpay', ?, ?, ?, ?, ?, 'success')
    `).run(order.id, razorpay_payment_id || `pay_${Date.now()}`, razorpay_order_id || null, razorpay_payment_id || null, razorpay_signature || null, order.total_amount);

    // Decrement stock for confirmed order
    const orderItems = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(order.id) as any[];
    for (const item of orderItems) {
      if (item.product_id) {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = datetime(\'now\') WHERE id = ?').run(item.quantity, item.product_id);
      }
    }

    // Fetch full order details to send notifications
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as any[];
    const notificationResult = await sendOrderNotifications({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      shippingAddress: JSON.parse(order.shipping_address_json),
      items: items.map(i => ({
        product_name: i.product_name,
        product_sku: i.product_sku,
        unit_price: i.unit_price,
        quantity: i.quantity,
        total_price: i.total_price
      })),
      subtotal: order.subtotal,
      discountAmount: order.discount_amount,
      shippingFee: order.shipping_fee,
      totalAmount: order.total_amount,
      paymentMethod: 'Razorpay UPI/Cards/Netbanking',
      paymentStatus: 'Paid',
      orderStatus: 'Confirmed',
      createdAt: order.created_at
    }, order.id);

    res.json({
      message: 'Payment verified and order confirmed!',
      order_number: order.order_number,
      notifications: notificationResult
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
});

// Customer: Get my orders
ordersRouter.get('/my-orders', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = db.prepare(`
      SELECT o.*,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as total_items
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.id DESC
    `).all(req.user!.id);

    const formattedOrders = orders.map((ord: any) => ({
      ...ord,
      shipping_address: JSON.parse(ord.shipping_address_json)
    }));

    res.json({ orders: formattedOrders });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch customer orders.' });
  }
});

// Lookup order by Order Number and Phone/Email (for guest order tracking or customer)
ordersRouter.get('/track/:orderNumber', (req, res) => {
  try {
    const { email } = req.query;
    const orderNumber = req.params.orderNumber.trim();

    let sql = 'SELECT * FROM orders WHERE order_number = ?';
    let params: any[] = [orderNumber];

    if (email) {
      sql += ' AND customer_email = ?';
      params.push((email as string).trim().toLowerCase());
    }

    const order = db.prepare(sql).get(...params) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found. Please verify your order number and email address.' });
      return;
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    res.json({
      order: {
        ...order,
        shipping_address: JSON.parse(order.shipping_address_json),
        items
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to track order.' });
  }
});

// Get single order details with ownership verification
ordersRouter.get('/:id', optionalToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    // Security check: Customer can only view their own order, unless admin
    if (order.user_id) {
      if (!req.user || (req.user.role !== 'admin' && req.user.id !== order.user_id)) {
        res.status(403).json({ error: 'You are not authorized to view this order.' });
        return;
      }
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    res.json({
      order: {
        ...order,
        shipping_address: JSON.parse(order.shipping_address_json),
        items
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch order details.' });
  }
});

// Admin: Get all orders with filtering and search
ordersRouter.get('/admin/all', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, payment_status, search, page = 1, limit = 50 } = req.query;
    let conditions: string[] = ['1=1'];
    let params: any[] = [];

    if (status && status !== 'all') {
      conditions.push('o.order_status = ?');
      params.push(status);
    }

    if (payment_status && payment_status !== 'all') {
      conditions.push('o.payment_status = ?');
      params.push(payment_status);
    }

    if (search && typeof search === 'string') {
      conditions.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ? OR o.customer_phone LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const whereClause = conditions.join(' AND ');
    const countSql = `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`;
    const countRow = db.prepare(countSql).get(...params) as { total: number };

    const offset = (Number(page) - 1) * Number(limit);
    const sql = `
      SELECT o.*,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
      FROM orders o
      WHERE ${whereClause}
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `;

    const orders = db.prepare(sql).all(...params, Number(limit), offset);

    const formattedOrders = orders.map((ord: any) => ({
      ...ord,
      shipping_address: JSON.parse(ord.shipping_address_json)
    }));

    res.json({
      orders: formattedOrders,
      total: countRow.total,
      page: Number(page),
      totalPages: Math.ceil(countRow.total / Number(limit))
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch admin orders.' });
  }
});

// Admin: Update order status & tracking
const handleOrderStatusUpdate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_status, payment_status, tracking_number, notes } = req.body;
    const orderId = req.params.id;

    const existingOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!existingOrder) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    // Use safe parameter fallback to null to prevent undefined binding errors in node:sqlite
    db.prepare(`
      UPDATE orders SET
        order_status = COALESCE(?, order_status),
        payment_status = COALESCE(?, payment_status),
        tracking_number = COALESCE(?, tracking_number),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      order_status !== undefined ? order_status : null,
      payment_status !== undefined ? payment_status : null,
      tracking_number !== undefined ? tracking_number : null,
      notes !== undefined ? notes : null,
      orderId
    );

    // Record audit log
    db.prepare(`
      INSERT INTO admin_audit_logs (admin_email, action, target_type, target_id, details)
      VALUES (?, 'update_order_status', 'order', ?, ?)
    `).run(
      req.user?.email || config.adminEmail,
      String(orderId),
      `Updated status to '${order_status || existingOrder.order_status}', payment '${payment_status || existingOrder.payment_status}'`
    );

    // Send customer notification if status changed to Shipped or Delivered
    if (order_status && order_status !== existingOrder.order_status) {
      sendOrderStatusUpdate(Number(orderId), order_status, tracking_number || existingOrder.tracking_number).catch(() => {});
    }

    res.json({ message: 'Order status updated successfully.' });
  } catch (error: any) {
    console.error('Failed to update order status:', error);
    res.status(500).json({ error: error.message || 'Failed to update order status.' });
  }
};
ordersRouter.patch('/admin/:id/status', authenticateToken, requireAdmin, handleOrderStatusUpdate);
ordersRouter.patch('/:id/status', authenticateToken, requireAdmin, handleOrderStatusUpdate);
ordersRouter.put('/admin/:id/status', authenticateToken, requireAdmin, handleOrderStatusUpdate);
ordersRouter.put('/:id/status', authenticateToken, requireAdmin, handleOrderStatusUpdate);

// Admin: Get notification delivery logs for an order
ordersRouter.get('/admin/:id/notifications', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = db.prepare('SELECT * FROM notification_logs WHERE order_id = ? ORDER BY id DESC').all(req.params.id);
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch notification logs.' });
  }
});

// Admin: Retry a failed notification
ordersRouter.post('/admin/:id/retry-notification', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { log_id } = req.body;
    const result = await retryNotification(Number(log_id));
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retry notification.' });
  }
});

// Admin: Export Orders to CSV
ordersRouter.get('/admin/export/csv', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = db.prepare(`
      SELECT o.*, 
        (SELECT GROUP_CONCAT(product_name || ' (x' || quantity || ')', '; ') FROM order_items oi WHERE oi.order_id = o.id) as items_summary
      FROM orders o
      ORDER BY o.id DESC
    `).all() as any[];

    const headers = [
      'Order Number',
      'Date',
      'Customer Name',
      'Email',
      'Phone',
      'Shipping City',
      'Shipping State',
      'Pincode',
      'Subtotal',
      'Discount',
      'Shipping Fee',
      'Total Amount',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Tracking Number',
      'Items Purchased'
    ];

    const rows = orders.map(o => {
      const addr = JSON.parse(o.shipping_address_json || '{}');
      return [
        o.order_number,
        o.created_at,
        `"${(o.customer_name || '').replace(/"/g, '""')}"`,
        o.customer_email,
        o.customer_phone,
        `"${(addr.city || '').replace(/"/g, '""')}"`,
        `"${(addr.state || '').replace(/"/g, '""')}"`,
        addr.postal_code || '',
        o.subtotal,
        o.discount_amount,
        o.shipping_fee,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.order_status,
        o.tracking_number || '',
        `"${(o.items_summary || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=vk_technology_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export orders to CSV.' });
  }
});
