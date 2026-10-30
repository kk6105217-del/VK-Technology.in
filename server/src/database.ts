import os from 'os';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';
import { config } from './config.js';

// Safe dynamic loader for Node built-in sqlite in both CommonJS and ES environments
let DatabaseSyncClass: any = null;
try {
  let sqliteModule: any = null;
  if (typeof require !== 'undefined') {
    sqliteModule = require('node:sqlite');
  }
  DatabaseSyncClass = sqliteModule?.DatabaseSync || null;
} catch (e: any) {
  console.warn('[DB] node:sqlite is not available in this Node runtime, using resilient mock fallback');
}

class SafeStatement {
  get(...args: any[]) { return null; }
  all(...args: any[]) { return []; }
  run(...args: any[]) { return { lastInsertRowid: 1, changes: 1 }; }
}

class SafeDatabase {
  exec(sql: string) { return this; }
  prepare(sql: string) { return new SafeStatement(); }
}

let dbInstance: any = null;

if (DatabaseSyncClass) {
  try {
    const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL_ENV);
    const dataDir = isVercel ? os.tmpdir() : path.resolve(process.cwd(), 'data');
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch (err) {}
    const dbPath = path.join(dataDir, 'vktechnology.db');
    dbInstance = new DatabaseSyncClass(dbPath);
    try {
      if (isVercel) {
        dbInstance.exec('PRAGMA journal_mode = DELETE;');
      } else {
        dbInstance.exec('PRAGMA journal_mode = WAL;');
      }
      dbInstance.exec('PRAGMA foreign_keys = ON;');
    } catch (e) {}
  } catch (err) {
    console.warn('[DB] Could not open database file, attempting :memory:', err);
    try {
      dbInstance = new DatabaseSyncClass(':memory:');
    } catch (memErr) {
      console.error('[DB] Memory database failed, falling back to safe mock:', memErr);
      dbInstance = new SafeDatabase();
    }
  }
} else {
  dbInstance = new SafeDatabase();
}

export const db = dbInstance;

export function initDatabase() {
  try {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer', -- 'admin' | 'customer'
      reset_token TEXT,
      reset_token_expiry TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      landmark TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category_id INTEGER NOT NULL,
      subcategory TEXT,
      short_description TEXT,
      description TEXT NOT NULL,
      regular_price REAL NOT NULL,
      discounted_price REAL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      brand TEXT DEFAULT 'VK Technology',
      specifications_json TEXT, -- JSON string of key-values
      features_json TEXT, -- JSON string array of features
      compatibility TEXT,
      package_contents_json TEXT, -- JSON string array
      shipping_weight_grams INTEGER DEFAULT 250,
      estimated_dispatch_days INTEGER DEFAULT 1,
      warranty_info TEXT DEFAULT '6 Months Manufacturer Warranty',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      view_count INTEGER NOT NULL DEFAULT 0,
      rating_avg REAL NOT NULL DEFAULT 4.8,
      rating_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      alt_text TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      guest_id TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(cart_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      discount_type TEXT NOT NULL, -- 'percentage' | 'fixed'
      discount_value REAL NOT NULL,
      min_order_value REAL NOT NULL DEFAULT 0,
      max_discount_amount REAL,
      usage_limit INTEGER,
      times_used INTEGER NOT NULL DEFAULT 0,
      start_date TEXT,
      expiry_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      coupon_code TEXT,
      shipping_fee REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL, -- 'razorpay' | 'cod'
      payment_status TEXT NOT NULL DEFAULT 'Pending Payment', -- 'Pending Payment' | 'Paid' | 'Failed' | 'Refunded'
      order_status TEXT NOT NULL DEFAULT 'Confirmed', -- 'Pending Payment' | 'Confirmed' | 'Processing' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Refunded'
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      tracking_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      product_sku TEXT NOT NULL,
      product_image TEXT,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      total_price REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_id TEXT,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      raw_response TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT,
      comment TEXT NOT NULL,
      is_verified_purchase INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'approved', -- 'pending' | 'approved' | 'rejected'
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      image_url TEXT NOT NULL,
      link_url TEXT NOT NULL,
      button_text TEXT NOT NULL DEFAULT 'Shop Now',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS website_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      channel TEXT NOT NULL, -- 'email' | 'whatsapp'
      recipient TEXT NOT NULL,
      subject_or_template TEXT,
      status TEXT NOT NULL, -- 'sent' | 'failed' | 'logged'
      error_message TEXT,
      sent_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS upi_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      amount REAL NOT NULL,
      utr_number TEXT NOT NULL,
      screenshot_url TEXT,
      status TEXT NOT NULL DEFAULT 'Pending Verification', -- 'Pending Verification' | 'Approved' | 'Rejected'
      admin_notes TEXT,
      verified_by TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrate columns if table already existed
  try { db.exec(`ALTER TABLE orders ADD COLUMN utr_number TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN payment_screenshot TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE products ADD COLUMN version INTEGER NOT NULL DEFAULT 1;`); } catch (e) {}

  seedInitialData();
  } catch (err) {
    console.warn('[DB] Non-critical warning in initDatabase:', err);
  }
}

export function recordAuditLog(adminEmail: string, action: string, targetType: string, targetId: string | number, details?: any) {
  try {
    const detailsStr = typeof details === 'string' ? details : (details ? JSON.stringify(details) : null);
    db.prepare(`
      INSERT INTO admin_audit_logs (admin_email, action, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(adminEmail, action, targetType, String(targetId), detailsStr);
  } catch (err) {
    console.warn('[AuditLog] Failed to record log:', err);
  }
}

function seedInitialData() {
  try {
  // 1. Ensure Admin Account exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(config.adminEmail);
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(config.adminInitialPassword, salt);
    db.prepare(`
      INSERT INTO users (email, password_hash, full_name, phone, role)
      VALUES (?, ?, ?, ?, 'admin')
    `).run(config.adminEmail, hash, 'Karthik Suroju (VK Technology)', '+919876543210');
    console.log(`Admin user created: ${config.adminEmail}`);
  }

  // 2. Ensure Website Settings exist
  const defaultSettings: Record<string, string> = {
    store_name: 'VK Technology',
    owner_email: 'karthik.suroju@gmail.com',
    owner_name: 'Karthik Suroju',
    business_phone: '+91 8555997052',
    business_address: 'India',
    currency_code: 'INR',
    currency_symbol: '₹',
    standard_shipping_fee: '60',
    free_shipping_threshold: '999',
    cod_available: 'true',
    cod_fee: '40',
    estimated_dispatch: '1-2 Business Days',
    support_hours: 'Monday - Saturday: 9:00 AM - 8:00 PM IST',
    announcement_text: 'Free Express Delivery across India on orders above ₹999! Special Discounts for Engineering Students.',
    owner_whatsapp_number: '+91 8555997052',
    upi_qr_enabled: 'true',
    upi_id: '8555997052@ibl',
    upi_payee_name: 'Mr Suroju Jnana Venkata Karthik',
    upi_qr_image_url: '/upi-qr-code.jpg'
  };

  const getSettingStmt = db.prepare('SELECT id FROM website_settings WHERE key = ?');
  const insertSettingStmt = db.prepare('INSERT INTO website_settings (key, value) VALUES (?, ?)');
  for (const [key, val] of Object.entries(defaultSettings)) {
    if (!getSettingStmt.get(key)) {
      insertSettingStmt.run(key, val);
    }
  }

  // 3. Ensure Categories exist
  const categoriesList = [
    {
      slug: 'arduino-boards-and-kits',
      name: 'Arduino Boards and Kits',
      description: 'Official and compatible Arduino boards, starter kits, microcontrollers, and expansion shields.',
      icon: 'Cpu',
      image_url: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=600&q=80',
      sort_order: 1
    },
    {
      slug: 'esp32-and-esp8266',
      name: 'ESP32 and ESP8266',
      description: 'High-performance Wi-Fi and Bluetooth microcontrollers for IoT and smart connected devices.',
      icon: 'Wifi',
      image_url: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=600&q=80',
      sort_order: 2
    },
    {
      slug: 'raspberry-pi',
      name: 'Raspberry Pi',
      description: 'Single board computers, official accessories, compute modules, displays, and cameras.',
      icon: 'Terminal',
      image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
      sort_order: 3
    },
    {
      slug: 'iot-development-kits',
      name: 'IoT Development Kits',
      description: 'Plug-and-play kits for home automation, smart agriculture, industrial monitoring, and cloud telemetry.',
      icon: 'Globe',
      image_url: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=600&q=80',
      sort_order: 4
    },
    {
      slug: 'sensors-and-modules',
      name: 'Sensors and Modules',
      description: 'Environmental, motion, optical, biometric, gas, and proximity sensors for all embedded projects.',
      icon: 'Activity',
      image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      sort_order: 5
    },
    {
      slug: 'robotics-kits',
      name: 'Robotics Kits',
      description: 'DIY 4WD robot chassis, line followers, obstacle avoiders, robotic arms, and bipedal kits.',
      icon: 'Bot',
      image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80',
      sort_order: 6
    },
    {
      slug: 'drone-components',
      name: 'Drone Components',
      description: 'Quadcopter frames, brushless motors, ESCs, flight controllers, propellers, and transmitters.',
      icon: 'Navigation',
      image_url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=600&q=80',
      sort_order: 7
    },
    {
      slug: 'motors-and-motor-drivers',
      name: 'Motors and Motor Drivers',
      description: 'Stepper motors, servo motors, DC gear motors, L298N, TB6600, and PCA9685 driver boards.',
      icon: 'Zap',
      image_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
      sort_order: 8
    },
    {
      slug: 'electronic-components',
      name: 'Electronic Components',
      description: 'Resistors, capacitors, diodes, LEDs, transistors, ICs, relays, and solderless breadboards.',
      icon: 'Layers',
      image_url: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=600&q=80',
      sort_order: 9
    },
    {
      slug: 'pcb-tools-and-accessories',
      name: 'PCB Tools and Accessories',
      description: 'Soldering stations, brass cleaners, flux, copper clad boards, wire strippers, and multimeters.',
      icon: 'Wrench',
      image_url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
      sort_order: 10
    },
    {
      slug: 'power-supplies-and-batteries',
      name: 'Power Supplies and Batteries',
      description: 'LiPo batteries, 18650 cells, BMS protection boards, buck/boost converters, and AC-DC adapters.',
      icon: 'BatteryCharging',
      image_url: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80',
      sort_order: 11
    },
    {
      slug: 'communication-modules',
      name: 'Communication Modules',
      description: 'LoRa 868/915MHz, NRF24L01+, Bluetooth HC-05, GSM/GPRS SIM800L, and GPS NEO-6M modules.',
      icon: 'Radio',
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
      sort_order: 12
    },
    {
      slug: 'ai-and-machine-learning-kits',
      name: 'AI and Machine Learning Kits',
      description: 'Edge AI hardware, ESP32-CAM, Raspberry Pi AI Kit, Google Coral Edge TPU, and Jetson boards.',
      icon: 'Brain',
      image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80',
      sort_order: 13
    },
    {
      slug: 'student-diy-project-kits',
      name: 'Student DIY Project Kits',
      description: 'Complete final year and diploma project kits with source code, circuit diagrams, and documentation.',
      icon: 'BookOpen',
      image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
      sort_order: 14
    },
    {
      slug: 'cables-connectors-and-accessories',
      name: 'Cables, Connectors and Accessories',
      description: 'Dupont jumper wires, JST connectors, USB cables, terminal blocks, standoffs, and fasteners.',
      icon: 'Link',
      image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      sort_order: 15
    }
  ];

  const getCatStmt = db.prepare('SELECT id FROM categories WHERE slug = ?');
  const insertCatStmt = db.prepare(`
    INSERT INTO categories (slug, name, description, icon, image_url, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const cat of categoriesList) {
    if (!getCatStmt.get(cat.slug)) {
      insertCatStmt.run(cat.slug, cat.name, cat.description, cat.icon, cat.image_url, cat.sort_order);
    }
  }

  // 4. Ensure Hero Banners exist
  const existingBanners = db.prepare('SELECT COUNT(*) as count FROM banners').get() as { count: number };
  if (existingBanners.count === 0) {
    const insertBanner = db.prepare(`
      INSERT INTO banners (title, subtitle, image_url, link_url, button_text, display_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertBanner.run(
      'Build Your Ideas with VK Technology',
      'Explore DIY Electronics, Robotics, IoT Components and Innovative Project Kits.',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=85',
      '/category/arduino-boards-and-kits',
      'Shop Now',
      1
    );
    insertBanner.run(
      'IoT & Smart Connected Hardware',
      'Build remote telemetry, home automation, and smart agriculture with ESP32 & LoRa.',
      'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=1600&q=85',
      '/category/esp32-and-esp8266',
      'Explore IoT Kits',
      2
    );
    insertBanner.run(
      'Engineering Student Project Kits',
      'Ready-to-build final year electronics kits with complete source code & schematics.',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=85',
      '/category/student-diy-project-kits',
      'View Project Kits',
      3
    );
  }

  // 5. Ensure Coupons exist
  const existingCoupons = db.prepare('SELECT COUNT(*) as count FROM coupons').get() as { count: number };
  if (existingCoupons.count === 0) {
    const insertCoupon = db.prepare(`
      INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_discount_amount, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    insertCoupon.run('WELCOMEVK', 'Get 10% off on your first order at VK Technology', 'percentage', 10, 499, 250);
    insertCoupon.run('VKROBOTICS', 'Flat ₹150 off on Robotics and Drone Project Kits', 'fixed', 150, 999, 150);
    insertCoupon.run('FREESHIP', 'Free shipping on orders above ₹499', 'fixed', 60, 499, 60);
  }

  // 6. Ensure Products exist
  const existingProducts = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (existingProducts.count === 0) {
    seedProducts();
  }
  } catch (err) {
    console.warn('[DB] Non-critical warning in seedInitialData:', err);
  }
}

function seedProducts() {
  try {
  const getCatIdBySlug = (slug: string): number => {
    const row = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug) as { id: number };
    return row?.id || 1;
  };

  const productsData = [
    // Arduino Boards and Kits
    {
      name: 'Arduino UNO R4 WiFi Development Board (Original Renesas RA4M1)',
      slug: 'arduino-uno-r4-wifi-original',
      sku: 'VK-ARD-001',
      category_slug: 'arduino-boards-and-kits',
      subcategory: 'Development Boards',
      short_description: '32-bit ARM Cortex-M4 microcontroller with ESP32-S3 for Wi-Fi & Bluetooth, 12x8 LED matrix, and Qwiic connector.',
      description: 'The Arduino UNO R4 WiFi merges the tested form-factor of the UNO with the processing power of Renesas RA4M1 32-bit ARM Cortex-M4 and the wireless connectivity of the ESP32-S3. Features an onboard 12x8 red LED matrix for real-time animations, USB-C programming, built-in DAC, CAN bus support, and an operational voltage of 5V.',
      regular_price: 2499,
      discounted_price: 1999,
      stock_quantity: 45,
      brand: 'Arduino Compatible',
      specifications: {
        'Microcontroller': 'Renesas RA4M1 (Arm Cortex-M4)',
        'Clock Speed': '48 MHz',
        'Wireless': 'ESP32-S3-MINI-1 (Wi-Fi 802.11 b/g/n & BLE 5.0)',
        'Operating Voltage': '5V DC',
        'Input Voltage (Vin)': '6-24V',
        'Digital I/O Pins': '14 (6 PWM)',
        'Analog Input Pins': '6 (14-bit ADC)',
        'DAC': '1 (12-bit)',
        'Flash Memory': '256 KB',
        'SRAM': '32 KB',
        'LED Matrix': '12x8 (96 LEDs) Red',
        'USB Connector': 'Type-C'
      },
      features: [
        'Powerful 32-bit processing at 48MHz for demanding computation',
        'Integrated ESP32-S3 wireless module for cloud IoT integration',
        '12x8 Onboard red LED matrix for displaying graphics & sensor values',
        'HID support allows simulating keyboard and mouse via USB',
        'Compatible with standard Arduino shields and accessories'
      ],
      compatibility: 'Compatible with Arduino IDE 2.x, Web Editor, and standard 5V Arduino shields.',
      package_contents: [
        '1x Arduino UNO R4 WiFi Board',
        '1x USB-C High-Speed Cable',
        '1x Anti-Static Protective Casing'
      ],
      shipping_weight_grams: 180,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      name: 'Arduino Mega 2560 R3 Board with High Speed USB Cable',
      slug: 'arduino-mega-2560-r3-kit',
      sku: 'VK-ARD-002',
      category_slug: 'arduino-boards-and-kits',
      subcategory: 'Development Boards',
      short_description: 'ATmega2560 board with 54 digital I/O pins, 16 analog inputs, and 4 hardware UARTs for 3D printers and large robotics.',
      description: 'Ideal for complex projects requiring numerous I/O lines like 3D printers, CNC routers, multi-axis robotic arms, and industrial monitoring. Powered by the Microchip ATmega2560 with 256 KB flash memory.',
      regular_price: 1250,
      discounted_price: 899,
      stock_quantity: 60,
      brand: 'VK Technology',
      specifications: {
        'Microcontroller': 'ATmega2560',
        'Clock Speed': '16 MHz',
        'Operating Voltage': '5V',
        'Digital Pins': '54 (15 PWM)',
        'Analog Inputs': '16',
        'UART Serial Ports': '4 Hardware UARTs',
        'Flash Memory': '256 KB'
      },
      features: [
        '54 Digital input/output pins for maximum peripheral interfacing',
        '16 Analog inputs with 10-bit resolution',
        '4 Hardware serial channels for multiple communication modules',
        'Perfect for RAMPS 1.4 3D printer shields'
      ],
      compatibility: 'Arduino IDE, PlatformIO, RAMPS 1.4/1.6 CNC shields',
      package_contents: ['1x Arduino Mega 2560 R3 Board', '1x USB Type-A to Type-B Cable'],
      shipping_weight_grams: 140,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      name: 'Complete Arduino 45-in-1 Ultimate Sensor & Component Kit',
      slug: 'arduino-45-in-1-ultimate-sensor-kit',
      sku: 'VK-ARD-003',
      category_slug: 'arduino-boards-and-kits',
      subcategory: 'Starter Kits',
      short_description: 'Comprehensive kit featuring 45 distinct sensor modules, jumper wires, tutorials, and sturdy organizing box.',
      description: 'Master sensor interfacing with this curated 45-in-1 kit. Includes temperature, humidity, sound, flame, tilt, obstacle, ultrasonic, joystick, relay, and heartbeat sensors. Includes PDF guide and code samples.',
      regular_price: 1899,
      discounted_price: 1449,
      stock_quantity: 35,
      brand: 'VK Technology',
      specifications: {
        'Total Modules': '45 Sensors & Actuators',
        'Storage Box': 'Multi-compartment plastic case',
        'Operating Voltage': '3.3V - 5V',
        'Tutorials': 'Code samples for Arduino and Raspberry Pi'
      },
      features: [
        '45 Essential sensor modules in one neat kit',
        'Ideal for engineering students, hobbyists and makers',
        'Tested components with standard 2.54mm pin headers'
      ],
      compatibility: 'Compatible with Arduino, Raspberry Pi, ESP32, STM32',
      package_contents: ['45x Sensor Modules', '1x Plastic Organizer Box', '1x Sensor Pinout Guide Card'],
      shipping_weight_grams: 480,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // ESP32 and ESP8266
    {
      name: 'ESP32-WROOM-32D Dual-Core Wi-Fi + BLE DevKit (Type-C, 38-Pin)',
      slug: 'esp32-wroom-32d-type-c-38pin',
      sku: 'VK-ESP-001',
      category_slug: 'esp32-and-esp8266',
      subcategory: 'Microcontrollers',
      short_description: 'Dual 240MHz Xtensa LX6 cores, integrated 802.11b/g/n Wi-Fi, BLE 4.2, Type-C USB port and CP2102 driver.',
      description: 'The premier development board for IoT makers. Features 38 GPIO pins, capacitive touch sensors, Hall sensor, high-speed SPI, UART, I2C, and dual-core processing capable of running FreeRTOS.',
      regular_price: 499,
      discounted_price: 349,
      stock_quantity: 120,
      brand: 'Espressif Systems',
      specifications: {
        'Processor': 'Tensilica Xtensa Dual-Core 32-bit LX6',
        'Clock Frequency': 'Up to 240 MHz',
        'RAM': '520 KB SRAM',
        'Flash': '4 MB SPI Flash',
        'Wireless': '2.4 GHz Wi-Fi + Bluetooth 4.2 BR/EDR and BLE',
        'USB Interface': 'USB Type-C (CP2102)',
        'Pins': '38 Pins Dual-Row Header'
      },
      features: [
        'Dual-core architecture allows offloading network stack to Core 0',
        'Modern Type-C connector for rock-solid programming',
        'Ultra-low power deep sleep modes (< 10 µA)'
      ],
      compatibility: 'Arduino IDE, ESP-IDF, MicroPython, CircuitPython',
      package_contents: ['1x ESP32 38-Pin Type-C DevKit Board'],
      shipping_weight_grams: 40,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      name: 'NodeMCU ESP8266 V3 Lua Wi-Fi Development Board (CH340G)',
      slug: 'nodemcu-esp8266-v3-board',
      sku: 'VK-ESP-002',
      category_slug: 'esp32-and-esp8266',
      subcategory: 'Microcontrollers',
      short_description: 'Popular compact Wi-Fi IoT microcontroller board with 4MB flash and breadboard-friendly design.',
      description: 'The quintessential affordable IoT board. Perfect for simple web servers, MQTT telemetry nodes, and smart home appliances connected to Blynk, Adafruit IO, or AWS IoT.',
      regular_price: 320,
      discounted_price: 249,
      stock_quantity: 85,
      brand: 'VK Technology',
      specifications: {
        'CPU': 'Tensilica L106 32-bit micro-controller',
        'Clock Speed': '80 MHz / 160 MHz',
        'Wi-Fi': '802.11 b/g/n',
        'Flash Memory': '4 MB',
        'GPIO': '10 Digital I/O, 1 Analog ADC (1.0V max)'
      },
      features: [
        'Budget-friendly Wi-Fi connectivity for home automation',
        'Plug-and-play with Arduino IDE ESP8266 core',
        'Integrated TCP/IP protocol stack'
      ],
      compatibility: 'Arduino IDE, NodeMCU Lua, MicroPython',
      package_contents: ['1x NodeMCU ESP8266 V3 Board'],
      shipping_weight_grams: 35,
      estimated_dispatch_days: 1,
      is_featured: 0,
      images: [
        'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // Raspberry Pi
    {
      name: 'Raspberry Pi 5 8GB Single Board Computer (Broadcom BCM2712 Quad-Core)',
      slug: 'raspberry-pi-5-8gb-ram',
      sku: 'VK-RPI-001',
      category_slug: 'raspberry-pi',
      subcategory: 'Single Board Computers',
      short_description: 'Flagship single-board computer with 2.4GHz quad-core 64-bit Arm Cortex-A76, PCIe 2.0, dual 4K60 HDMI, and RTC.',
      description: '2 to 3 times faster than the previous generation. Boasts Broadcom BCM2712 silicon, Raspberry Pi RP1 I/O controller, PCIe 2.0 interface for NVMe SSD expansions, dedicated on/off power button, and real-time clock battery support.',
      regular_price: 9499,
      discounted_price: 8499,
      stock_quantity: 20,
      brand: 'Raspberry Pi Foundation',
      specifications: {
        'Processor': 'Broadcom BCM2712 2.4GHz quad-core 64-bit Arm Cortex-A76',
        'RAM': '8GB LPDDR4X-4267 SDRAM',
        'Graphics': 'VideoCore VII GPU supporting OpenGL ES 3.1, Vulkan 1.2',
        'Video Output': 'Dual 4Kp60 micro-HDMI display outputs with HDR support',
        'PCIe': 'PCIe 2.0 x1 interface for fast peripherals',
        'Networking': 'Gigabit Ethernet with PoE+ support, Dual-band 802.11ac Wi-Fi, Bluetooth 5.0 / BLE',
        'USB': '2x USB 3.0 ports (5Gbps), 2x USB 2.0 ports'
      },
      features: [
        'Unmatched desktop-class performance in credit-card form factor',
        'High-speed PCIe expansion port for NVMe SSD storage',
        'Hardware power button and dedicated RTC connector',
        'Runs Raspberry Pi OS, Ubuntu, Debian, and Kali Linux'
      ],
      compatibility: 'Raspberry Pi OS Bookworm, micro-HDMI monitors, official 27W USB-C PD power supply',
      package_contents: ['1x Raspberry Pi 5 8GB Board', '1x Quick Start Guide'],
      shipping_weight_grams: 120,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      name: 'Raspberry Pi Official 27W USB-C Power Delivery Supply (White, India Plug)',
      slug: 'raspberry-pi-27w-official-power-supply',
      sku: 'VK-RPI-002',
      category_slug: 'raspberry-pi',
      subcategory: 'Power Supplies',
      short_description: 'Custom 5.1V / 5A power supply designed specifically to power the Raspberry Pi 5 and attached power-hungry USB peripherals.',
      description: 'Delivers 5.1V at 5.0A enabling the Raspberry Pi 5 to supply a full 1.6A to downstream USB ports. Features standard Indian 2-pin round plug and captive 1.2m cable.',
      regular_price: 1399,
      discounted_price: 1149,
      stock_quantity: 40,
      brand: 'Raspberry Pi Foundation',
      specifications: {
        'Output': '5.1V, 5.0A (27W max)',
        'Input': '100-240V AC 50/60Hz',
        'Connector': 'USB Type-C',
        'Cable Length': '1.2 meters 18AWG'
      },
      features: [
        'Official certified power delivery for Raspberry Pi 5',
        'Prevents brownout and undervoltage throttles'
      ],
      compatibility: 'Raspberry Pi 5, Raspberry Pi 4, general USB-C devices',
      package_contents: ['1x Official 27W USB-C Power Adapter with India Plug'],
      shipping_weight_grams: 190,
      estimated_dispatch_days: 1,
      is_featured: 0,
      images: [
        'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // IoT Development Kits
    {
      name: 'Smart Agriculture IoT Project Kit with Soil Moisture, DHT22 & Cloud Dashboard',
      slug: 'smart-agriculture-iot-project-kit',
      sku: 'VK-IOT-001',
      category_slug: 'iot-development-kits',
      subcategory: 'Complete Project Kits',
      short_description: 'All-in-one IoT automated irrigation kit with capacitive soil sensor, 5V relay, water pump, OLED display & cloud code.',
      description: 'Designed for engineering students and agricultural enthusiasts. Measures soil moisture, ambient temperature and humidity, displays status on a 0.96-inch OLED screen, triggers a 5V submersible water pump via relay, and sends telemetry to Blynk Cloud / ThingsBoard.',
      regular_price: 2199,
      discounted_price: 1699,
      stock_quantity: 30,
      brand: 'VK Technology',
      specifications: {
        'Core Board': 'ESP32 Wi-Fi + BLE DevKit',
        'Soil Sensor': 'Capacitive Soil Moisture Sensor v1.2 (Corrosion Resistant)',
        'Climate Sensor': 'DHT22 High-Accuracy Temp & Humidity',
        'Display': '0.96 inch I2C OLED (128x64 Blue/Yellow)',
        'Actuator': '5V Submersible Mini Water Pump with 1m silicone tubing',
        'Relay Module': '1-Channel 5V Optocoupler Isolated Relay'
      },
      features: [
        'Corrosion-resistant capacitive moisture sensing',
        'Real-time web & smartphone monitoring via Blynk / MQTT',
        'Complete Arduino source code, circuit schematic and step-by-step PDF manual included'
      ],
      compatibility: 'Blynk IoT, ThingSpeak, Home Assistant, Adafruit IO',
      package_contents: [
        '1x ESP32 DevKit',
        '1x Capacitive Soil Sensor',
        '1x DHT22 Sensor',
        '1x 0.96" I2C OLED',
        '1x 5V Relay Module',
        '1x Mini Submersible Pump & Pipe',
        '1x 400-Point Breadboard & 40x Jumper Wires',
        '1x Documentation & Source Code Download Card'
      ],
      shipping_weight_grams: 450,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // Sensors and Modules
    {
      name: 'HC-SR04 Ultrasonic Distance Sensor Module (2cm to 400cm)',
      slug: 'hc-sr04-ultrasonic-sensor',
      sku: 'VK-SEN-001',
      category_slug: 'sensors-and-modules',
      subcategory: 'Distance Sensors',
      short_description: 'High-accuracy non-contact ultrasonic distance measuring transducer module with 3mm accuracy.',
      description: 'Industry-standard sonar module for robotics obstacle avoidance, level detection, and proximity measurement. Provides stable readings from 2cm to 400cm with 4-pin interface (VCC, Trig, Echo, GND).',
      regular_price: 140,
      discounted_price: 99,
      stock_quantity: 200,
      brand: 'VK Technology',
      specifications: {
        'Operating Voltage': '5V DC',
        'Current': '< 2mA quiescent, 15mA working',
        'Measuring Angle': '15 degrees',
        'Range': '2cm - 400cm',
        'Accuracy': 'Up to 3mm'
      },
      features: [
        'Accurate non-contact distance ranging',
        'Simple trigger and echo digital logic pulse interface',
        'Low power consumption'
      ],
      compatibility: 'Arduino, ESP32, Raspberry Pi, PIC, 8051',
      package_contents: ['1x HC-SR04 Ultrasonic Sensor Module'],
      shipping_weight_grams: 20,
      estimated_dispatch_days: 1,
      is_featured: 0,
      images: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      name: 'MPU-6050 6-Axis Accelerometer and Gyroscope Module (I2C)',
      slug: 'mpu-6050-accelerometer-gyroscope-module',
      sku: 'VK-SEN-002',
      category_slug: 'sensors-and-modules',
      subcategory: 'Motion Sensors',
      short_description: 'Digital 3-axis angular rate sensor (gyro) and 3-axis accelerometer with onboard Digital Motion Processor (DMP).',
      description: 'Essential component for quadcopter flight stabilization, self-balancing two-wheeled robots, and wearable gesture tracking. Features internal 16-bit ADCs and I2C output.',
      regular_price: 240,
      discounted_price: 179,
      stock_quantity: 110,
      brand: 'InvenSense Compatible',
      specifications: {
        'Communication': 'Standard I2C protocol',
        'Power Supply': '3V - 5V (Onboard LDO regulator)',
        'Gyro Range': '± 250, 500, 1000, 2000 °/s',
        'Accel Range': '± 2, ± 4, ± 8, ± 16 g'
      },
      features: [
        'Hardware Digital Motion Processor (DMP) computes complex sensor fusion',
        'Auxiliary I2C bus for external magnetometers (compass)'
      ],
      compatibility: 'Arduino, Raspberry Pi, ESP32, STM32',
      package_contents: ['1x MPU-6050 Module', '1x Straight Pin Header', '1x Right-Angle Pin Header'],
      shipping_weight_grams: 15,
      estimated_dispatch_days: 1,
      is_featured: 0,
      images: [
        'https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // Robotics Kits
    {
      name: '4WD Smart Robot Car Chassis Kit with BO Motors & Speed Encoders',
      slug: '4wd-smart-robot-car-chassis-kit',
      sku: 'VK-ROB-001',
      category_slug: 'robotics-kits',
      subcategory: 'Chassis Kits',
      short_description: 'Dual-layer laser cut acrylic chassis with 4x DC gear motors, rubber grip wheels, speed encoder discs and battery holder.',
      description: 'The definitive foundation for line-tracking robots, Bluetooth RC cars, and autonomous obstacle-avoidance rovers. Features pre-drilled mounting slots for Arduino UNO, Mega, Raspberry Pi, sensor brackets, and battery boxes.',
      regular_price: 1299,
      discounted_price: 949,
      stock_quantity: 40,
      brand: 'VK Technology',
      specifications: {
        'Chassis': 'Dual Layer Transparent Acrylic Plates',
        'Motors': '4x TT Dual-Shaft DC Gear Motors (3-6V)',
        'Gear Ratio': '1:48',
        'Wheels': '4x 65mm Rubber Grip Wheels',
        'Encoders': '4x Slotted Speed Encoder Discs'
      },
      features: [
        'Generous dual-deck layout for mounting multiple microcontroller boards and sensors',
        'High-torque geared motors with low current draw',
        'Includes all mounting standoffs, screws and 4x AA battery box'
      ],
      compatibility: 'Universal mounting for Arduino, ESP32, Raspberry Pi, Jetson Nano',
      package_contents: [
        '2x Acrylic Chassis Plates',
        '4x TT Gear Motors',
        '4x Rubber Wheels',
        '4x Speed Encoders',
        '1x 4-Cell AA Battery Box',
        '1x Screws, Nuts and Standoffs Pack'
      ],
      shipping_weight_grams: 520,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // Drone Components
    {
      name: 'F450 Quadcopter DIY Drone Frame Kit with Integrated PCB Power Distribution',
      slug: 'f450-quadcopter-drone-frame-kit',
      sku: 'VK-DRN-001',
      category_slug: 'drone-components',
      subcategory: 'Frames',
      short_description: 'Durable composite nylon arms and fiberglass central plates with integrated PCB for direct ESC soldering.',
      description: 'Rugged 450mm wheelbase quadcopter frame engineered for beginner and intermediate DIY drone builders. The central bottom plate features a built-in power distribution board (PDB), eliminating messy wiring harnesses.',
      regular_price: 1499,
      discounted_price: 1199,
      stock_quantity: 25,
      brand: 'VK Technology',
      specifications: {
        'Wheelbase': '450 mm',
        'Empty Weight': '282 grams',
        'Arm Material': 'Ultra-strength PA66 + 30% Glass Fiber',
        'Board Material': 'Fiberglass with Integrated Copper Power Distribution',
        'Recommended Propeller': '9450 or 1045 Propellers',
        'Recommended Battery': '3S - 4S LiPo (2200mAh - 4000mAh)'
      },
      features: [
        'Integrated PCB power wiring for direct battery & ESC solder points',
        'Colored arms (2 Red, 2 White) for instant orientation detection during flight',
        'Spacious flight controller mounting plate'
      ],
      compatibility: 'APM 2.8, Pixhawk, Betaflight F4/F7, CC3D flight controllers',
      package_contents: [
        '4x F450 Frame Arms (2 Red, 2 White)',
        '1x Top Fiberglass Plate',
        '1x Bottom Plate with Integrated PCB PDB',
        '1x M2.5 Assembly Hardware Set'
      ],
      shipping_weight_grams: 390,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      name: 'A2212 1000KV Brushless Motor with 30A SimonK ESC and 1045 Propellers (Pack of 4)',
      slug: 'a2212-1000kv-brushless-motor-esc-combo',
      sku: 'VK-DRN-002',
      category_slug: 'drone-components',
      subcategory: 'Motors & ESCs',
      short_description: 'Complete propulsion combo set of 4x A2212 1000KV brushless motors, 4x 30A SimonK ESCs and 4x CW/CCW 1045 props.',
      description: 'The golden standard propulsion package for 450mm quadcopters. Includes 4 matched brushless outrunner motors with prop adapters and flashed SimonK 30A Electronic Speed Controllers for ultra-crisp throttle response.',
      regular_price: 3699,
      discounted_price: 2999,
      stock_quantity: 18,
      brand: 'VK Technology',
      specifications: {
        'Motor KV': '1000 RPM/V',
        'Motor Dimensions': '27.7 x 27 mm',
        'ESC Current': '30A Continuous (40A Burst)',
        'ESC Firmware': 'SimonK optimized for multirotors',
        'Battery Compatibility': '2S - 3S LiPo',
        'Propeller Size': '10 x 4.5 inch (2x CW, 2x CCW)'
      },
      features: [
        'Tested motor and ESC pairings for vibration-free flight',
        'Bullet connectors pre-soldered for swift assembly',
        'Provides up to 850g thrust per motor on 3S LiPo'
      ],
      compatibility: 'F450, S500 drone frames, KK2.1, Pixhawk, Betaflight',
      package_contents: [
        '4x A2212 1000KV Brushless Motors',
        '4x 30A SimonK ESCs',
        '2x 1045 CW Propellers',
        '2x 1045 CCW Propellers',
        '4x Prop Adapter Sets & Motor Screws'
      ],
      shipping_weight_grams: 480,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // Motors and Motor Drivers
    {
      name: 'L298N Dual H-Bridge DC and Stepper Motor Driver Module (2A / 46V)',
      slug: 'l298n-dual-h-bridge-motor-driver',
      sku: 'VK-MOT-001',
      category_slug: 'motors-and-motor-drivers',
      subcategory: 'Motor Drivers',
      short_description: 'Dual H-bridge driver board for controlling speed and direction of two DC motors or one 4-wire two-phase stepper motor.',
      description: 'Equipped with heavy-duty heat sink and onboard 78M05 5V linear regulator. Capable of driving inductive loads up to 2A per channel with flywheel diodes protection.',
      regular_price: 199,
      discounted_price: 149,
      stock_quantity: 150,
      brand: 'VK Technology',
      specifications: {
        'Driver Chip': 'L298N Dual H-Bridge Driver IC',
        'Drive Voltage': '5V - 35V DC',
        'Peak Current': '2A per bridge',
        'Logic Voltage': '5V',
        'Control Logic': 'PWM speed control, DIR direction pins'
      },
      features: [
        'Rugged aluminum heatsink for continuous heat dissipation',
        'Onboard 5V regulator can power your Arduino when motor supply is 7V-12V',
        'Screw terminals for secure motor and power connections'
      ],
      compatibility: 'Arduino, ESP32, Raspberry Pi, PIC',
      package_contents: ['1x L298N Motor Driver Board'],
      shipping_weight_grams: 45,
      estimated_dispatch_days: 1,
      is_featured: 0,
      images: [
        'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      name: 'TowerPro SG90 9g Micro Servo Motor with Horns and Screws (Pack of 2)',
      slug: 'towerpro-sg90-9g-micro-servo-motor-pair',
      sku: 'VK-MOT-002',
      category_slug: 'motors-and-motor-drivers',
      subcategory: 'Servo Motors',
      short_description: 'Lightweight 9-gram analog micro servo delivering 1.8 kg-cm torque at 4.8V for robotic arms and RC planes.',
      description: 'Compact servo with 180-degree rotation range. Features nylon gears, 25cm lead wire with standard 3-pin JR connector, and multiple servo horns.',
      regular_price: 240,
      discounted_price: 180,
      stock_quantity: 95,
      brand: 'TowerPro',
      specifications: {
        'Operating Speed': '0.12 sec / 60 degrees (4.8V)',
        'Stall Torque': '1.8 kg-cm (4.8V)',
        'Operating Voltage': '4.8V - 6.0V DC',
        'Rotation Angle': '180 Degrees',
        'Dead Band Width': '5 usec'
      },
      features: [
        'Ultra-light 9 gram weight for aerospace and small robotics',
        'Standard 3-pin PWM interface (Signal, VCC, GND)',
        'Comes with full servo horn kit and screws'
      ],
      compatibility: 'Arduino Servo library, ESP32 PWM, micro:bit',
      package_contents: ['2x SG90 9g Micro Servos', '6x Servo Horns', '6x Mounting Screws'],
      shipping_weight_grams: 35,
      estimated_dispatch_days: 1,
      is_featured: 0,
      images: [
        'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // Electronic Components
    {
      name: 'MB-102 830 Tie-Point Solderless Breadboard with Power Supply Module Kit',
      slug: 'mb102-830-tie-point-breadboard-power-module-kit',
      sku: 'VK-ELC-001',
      category_slug: 'electronic-components',
      subcategory: 'Prototyping',
      short_description: 'Full-size 830 point prototyping breadboard coupled with dual 3.3V/5V DC barrel jack power regulator board.',
      description: 'The foundation of all electronic prototyping. Features self-adhesive backing, standard 0.1 inch hole pitch, dual power distribution rails, and a plug-in breadboard power module with power switch and indicator LED.',
      regular_price: 350,
      discounted_price: 269,
      stock_quantity: 80,
      brand: 'VK Technology',
      specifications: {
        'Tie Points': '830 (630 terminal strip, 200 distribution strip)',
        'Pitch': '2.54 mm (0.1 inch)',
        'Power Supply Input': '6.5V - 12V DC (DC Jack) or USB',
        'Power Supply Output': 'Dual rail independent 3.3V / 5V switchable'
      },
      features: [
        'High quality phosphor bronze nickel-plated spring clips',
        'Dual independent voltage rail switches on power module'
      ],
      compatibility: 'All standard DIP ICs, jumper wires, through-hole components',
      package_contents: ['1x MB-102 830 Points Breadboard', '1x MB-102 3.3V/5V Power Supply Module'],
      shipping_weight_grams: 130,
      estimated_dispatch_days: 1,
      is_featured: 0,
      images: [
        'https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // PCB Tools and Accessories
    {
      name: '60W Temperature Controlled Soldering Iron Station Kit with Multimeter & Desoldering Pump',
      slug: '60w-temperature-controlled-soldering-station-kit',
      sku: 'VK-PCB-001',
      category_slug: 'pcb-tools-and-accessories',
      subcategory: 'Soldering Equipment',
      short_description: 'Complete 16-piece soldering workstation kit featuring 200°C-450°C adjustable iron, digital multimeter, solder wire and stand.',
      description: 'Everything an electronics student or DIYer needs to solder like a pro. Features rapid ceramic heater technology, heat-insulated silicone grip, 5 interchangeable soldering tips, high-vacuum desoldering pump, and digital multimeter.',
      regular_price: 1899,
      discounted_price: 1399,
      stock_quantity: 35,
      brand: 'VK Technology',
      specifications: {
        'Power': '60W',
        'Temperature Range': '200°C - 450°C',
        'Heating Element': 'Internal Heat Ceramic Core',
        'Multimeter': 'Digital Multimeter with Probes (Volts, Amps, Resistance, Continuity Buzzer)',
        'Solder Wire': 'Lead-free Rosin Core 50g'
      },
      features: [
        'Fast 30-second thermal recovery heating',
        'Includes essential digital multimeter for continuity and circuit diagnostics',
        'Sturdy PU leather zipper carry pouch included'
      ],
      compatibility: 'Standard 230V 50Hz Indian AC mains plug',
      package_contents: [
        '1x 60W Adjustable Soldering Iron',
        '1x Digital Multimeter with Test Leads',
        '5x Extra Soldering Iron Tips (K, I, B, 3C, 2.4D)',
        '1x Heavy-Duty Desoldering Solder Sucker Pump',
        '1x Solder Wire Tube',
        '1x Anti-Static Tweezers',
        '1x Wire Stripper Cutter',
        '1x Iron Stand with Sponge',
        '1x Zipper Tool Bag'
      ],
      shipping_weight_grams: 650,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // AI and Machine Learning Kits
    {
      name: 'ESP32-CAM AI Vision Development Board with OV2640 2MP Camera Module & USB Programmer',
      slug: 'esp32-cam-ai-vision-development-kit',
      sku: 'VK-AIML-001',
      category_slug: 'ai-and-machine-learning-kits',
      subcategory: 'Edge AI Boards',
      short_description: 'Affordable Edge AI vision development board with 2MP OV2640 camera, TF card slot, high-brightness flash LED and ESP32-CAM-MB USB programmer.',
      description: 'Build facial recognition, object detection, Wi-Fi video streaming, and machine vision projects on a micro budget. Bundled with the dedicated USB-to-serial backplane board for one-click flashing without external FTDI adapters.',
      regular_price: 799,
      discounted_price: 599,
      stock_quantity: 65,
      brand: 'Ai-Thinker',
      specifications: {
        'CPU': 'Dual-Core 32-bit LX6 up to 240 MHz',
        'RAM': '520 KB internal SRAM + 4 MB external PSRAM',
        'Camera Sensor': 'OV2640 2 Megapixel (UXGA 1600x1200 resolution)',
        'Flash': 'Built-in bright flash LED',
        'Card Slot': 'MicroSD / TF card slot up to 4GB',
        'Programming': 'ESP32-CAM-MB MicroUSB Programmer Daughterboard'
      },
      features: [
        'Includes dedicated CH340 USB adapter base for effortless plug-and-play programming',
        'Pre-loaded with ESP32 Camera Web Server demo sketch',
        'Integrated 4MB external PSRAM for full-frame video buffering'
      ],
      compatibility: 'Arduino IDE, ESP-WHO face detection framework, OpenCV, Home Assistant',
      package_contents: [
        '1x ESP32-CAM Board',
        '1x OV2640 2MP Camera Sensor',
        '1x ESP32-CAM-MB USB Programmer Base'
      ],
      shipping_weight_grams: 55,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // Student DIY Project Kits
    {
      name: 'Obstacle Avoidance Autonomous Robot Complete Student Project Kit',
      slug: 'obstacle-avoidance-autonomous-robot-project-kit',
      sku: 'VK-DIY-001',
      category_slug: 'student-diy-project-kits',
      subcategory: 'Robotics Projects',
      short_description: 'Comprehensive DIY robot kit featuring Arduino UNO, L298N motor driver, HC-SR04 sonar with SG90 panning servo and pre-loaded code.',
      description: 'The definitive project kit for engineering, diploma, and school science exhibitions. Uses an ultrasonic sensor mounted atop a servo motor to scan left, center, and right, calculating collision-free navigation pathways in real time.',
      regular_price: 2499,
      discounted_price: 1899,
      stock_quantity: 40,
      brand: 'VK Technology',
      specifications: {
        'Controller': 'Arduino UNO R3 with USB cable',
        'Motor Driver': 'L298N Dual H-Bridge Module',
        'Sensor': 'HC-SR04 Ultrasonic Distance Sensor',
        'Panning Mechanism': 'TowerPro SG90 9g Servo with mount',
        'Power': 'Dual 18650 Battery Holder with On/Off Switch'
      },
      features: [
        'Complete turnkey project with full source code, block diagram and documentation report included',
        'No soldering required — uses female-to-female jumper wires and pre-cut chassis',
        'Approved syllabus project for B.Tech / Diploma / Polytechnic electronics labs'
      ],
      compatibility: '100% Arduino IDE compatible',
      package_contents: [
        '1x Arduino UNO R3 & USB Cable',
        '1x 2WD Robot Smart Car Chassis & Motors',
        '1x L298N Motor Driver',
        '1x HC-SR04 Ultrasonic Sensor',
        '1x SG90 Servo & Acrylic Mount Bracket',
        '1x 18650 Dual Battery Holder',
        '30x Dupont Jumper Wires',
        '1x Complete Project Documentation Manual & Code CD/Link'
      ],
      shipping_weight_grams: 620,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      name: 'RFID Smart Door Lock & Attendance System DIY Project Kit',
      slug: 'rfid-smart-door-lock-attendance-project-kit',
      sku: 'VK-DIY-002',
      category_slug: 'student-diy-project-kits',
      subcategory: 'Security Projects',
      short_description: 'Complete RC522 13.56MHz RFID kit with 16x2 I2C LCD, 12V electronic solenoid door latch, relay module & buzzer.',
      description: 'Build an industrial-grade RFID authentication access control system. Authorize users with RFID keyfobs/cards, display real-time welcome messages on 16x2 LCD, and trigger the 12V solenoid door strike lock.',
      regular_price: 1999,
      discounted_price: 1549,
      stock_quantity: 30,
      brand: 'VK Technology',
      specifications: {
        'RFID Reader': 'RC522 13.56 MHz SPI Module',
        'Door Lock': '12V DC Solenoid Electric Door Latch',
        'Display': '16x2 Character LCD with I2C Backpack',
        'Relay': '5V 10A Optocoupler Relay Module',
        'Audio': '5V Active Buzzer for Beep Confirmation'
      },
      features: [
        'Includes RFID cards and keyfobs ready to register',
        'Clear I2C wiring reduces clutter to only 4 pins for display',
        'Comes with engineering project report documentation and wiring diagram'
      ],
      compatibility: 'Arduino UNO, Nano, Mega, ESP32',
      package_contents: [
        '1x Arduino UNO Board & Cable',
        '1x RC522 RFID Module & RFID Card + Keyfob',
        '1x 16x2 I2C Blue Backlight LCD',
        '1x 12V Solenoid Door Lock',
        '1x 1-Channel 5V Relay',
        '1x 12V 2A DC Power Adapter',
        '1x Breadboard & Jumper Wires Pack',
        '1x Full Code & Circuit Documentation'
      ],
      shipping_weight_grams: 580,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // Communication Modules
    {
      name: 'SX1278 LoRa 433MHz Long Range Wireless Transceiver Module (Ra-02)',
      slug: 'sx1278-lora-433mhz-transceiver-module',
      sku: 'VK-COM-001',
      category_slug: 'communication-modules',
      subcategory: 'LoRa Modules',
      short_description: 'Semtech SX1278 spread-spectrum LoRa module with up to 10km range and high anti-interference capability.',
      description: 'Ultra-long range wireless telemetry module utilizing LoRa spread-spectrum modulation. Outstanding sensitivity of -148 dBm and +20 dBm power output for smart city, agriculture, and remote sensor networks.',
      regular_price: 499,
      discounted_price: 389,
      stock_quantity: 75,
      brand: 'Ai-Thinker',
      specifications: {
        'Frequency': '433 MHz (410 - 525 MHz)',
        'Modulation': 'LoRa / FSK / GFSK / OOK',
        'Sensitivity': 'Up to -148 dBm',
        'Transmit Power': '+20 dBm (100 mW)',
        'Interface': 'SPI Interface'
      },
      features: [
        'Ultra-long distance communication up to 5-10 km in open terrain',
        'High interference immunity with spread spectrum',
        'Ultra low power consumption in sleep mode'
      ],
      compatibility: 'Arduino RadioHead library, ESP32, STM32',
      package_contents: ['1x Ra-02 LoRa SX1278 Module', '1x Spring Antenna'],
      shipping_weight_grams: 20,
      estimated_dispatch_days: 1,
      is_featured: 0,
      images: [
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      name: 'NRF24L01+ 2.4GHz Wireless Transceiver Module with PA and LNA (with Antenna, 1000m Range)',
      slug: 'nrf24l01-plus-pa-lna-antenna-module',
      sku: 'VK-COM-002',
      category_slug: 'communication-modules',
      subcategory: 'RF Modules',
      short_description: 'Power-amplified 2.4GHz RF module with Low Noise Amplifier and external 2dBi SMA dipole antenna for 1km transmission.',
      description: 'High-power edition of the popular Nordic nRF24L01+. Features onboard PA and LNA RF front-end chips enabling stable wireless link up to 1100 meters at 250kbps.',
      regular_price: 350,
      discounted_price: 269,
      stock_quantity: 90,
      brand: 'VK Technology',
      specifications: {
        'Operating Frequency': '2.4 GHz ISM Band',
        'Data Rates': '250kbps, 1Mbps, 2Mbps',
        'Range': 'Up to 1100 meters line-of-sight',
        'Supply Voltage': '3.3V DC (5V tolerant logic inputs)',
        'Antenna': 'SMA 2dBi External Omnidirectional'
      },
      features: [
        'Built-in Power Amplifier (PA) and Low Noise Amplifier (LNA)',
        'Ideal for remote drone transmitters and wireless sensor nodes'
      ],
      compatibility: 'Arduino RF24 library, Raspberry Pi, PIC',
      package_contents: ['1x NRF24L01+ PA+LNA Module', '1x 2.4GHz SMA Antenna'],
      shipping_weight_grams: 30,
      estimated_dispatch_days: 1,
      is_featured: 0,
      images: [
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // Power Supplies and Batteries
    {
      name: 'Orange 3S 11.1V 2200mAh 30C LiPo Battery Pack with XT60 Connector',
      slug: 'orange-3s-11v-2200mah-30c-lipo-battery',
      sku: 'VK-POW-001',
      category_slug: 'power-supplies-and-batteries',
      subcategory: 'LiPo Batteries',
      short_description: 'High discharge lithium polymer battery pack engineered for quadcopters, RC planes, and high-power robotics rovers.',
      description: 'Delivers reliable 30C continuous discharge current (66A) with superior energy density. Fitted with genuine XT60 main power connector and standard JST-XH 4-pin balance lead.',
      regular_price: 1899,
      discounted_price: 1499,
      stock_quantity: 30,
      brand: 'Orange RC',
      specifications: {
        'Configuration': '3S1P (3 Cells in Series)',
        'Nominal Voltage': '11.1V (12.6V fully charged)',
        'Capacity': '2200 mAh',
        'Discharge Rate': '30C Continuous (60C Burst)',
        'Connector': 'XT60 Female Plug',
        'Balance Connector': 'JST-XH'
      },
      features: [
        'High discharge C-rating delivers punchy power bursts for drone liftoff',
        'High quality silicone-jacketed 14AWG power leads',
        'Tested cycle longevity with low internal resistance'
      ],
      compatibility: 'F450 Quadcopters, RC Airplanes, Robotics motor drivers',
      package_contents: ['1x Orange 3S 2200mAh 30C LiPo Battery', '1x Safety & Storage Warning Sheet'],
      shipping_weight_grams: 220,
      estimated_dispatch_days: 1,
      is_featured: 1,
      images: [
        'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80'
      ]
    },

    // Cables, Connectors and Accessories
    {
      name: '120-Piece Multi-Color Dupont Jumper Wire Ribbon Cable Kit (M-M, M-F, F-F, 20cm)',
      slug: '120pcs-dupont-jumper-wire-kit-20cm',
      sku: 'VK-CAB-001',
      category_slug: 'cables-connectors-and-accessories',
      subcategory: 'Jumper Wires',
      short_description: 'Essential prototyping pack containing 40x Male-to-Male, 40x Male-to-Female, and 40x Female-to-Female flexible jumper cables.',
      description: 'The lifeline of electronic wiring. 120 total color-coded 20cm wires that can be separated into single assemblies or grouped ribbons. 2.54mm standard spacing fits breadboards, Arduino, and sensor header pins perfectly.',
      regular_price: 299,
      discounted_price: 199,
      stock_quantity: 180,
      brand: 'VK Technology',
      specifications: {
        'Quantity': '120 Wires Total (3x 40-pin ribbons)',
        'Length': '20 cm',
        'Pitch': 'Standard 2.54 mm',
        'Wire Gauge': '28 AWG Copper Coated'
      },
      features: [
        'Includes all three indispensable combinations: M-M, M-F, and F-F',
        'Vibrant 10-color coding prevents wiring mistakes',
        'Firm, secure terminal crimps'
      ],
      compatibility: 'Breadboards, Arduino headers, Raspberry Pi 40-pin GPIO, sensor modules',
      package_contents: [
        '1x 40-pin Male-to-Male 20cm Ribbon',
        '1x 40-pin Male-to-Female 20cm Ribbon',
        '1x 40-pin Female-to-Female 20cm Ribbon'
      ],
      shipping_weight_grams: 95,
      estimated_dispatch_days: 1,
      is_featured: 0,
      images: [
        'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80'
      ]
    }
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (
      slug, name, sku, category_id, subcategory, short_description, description,
      regular_price, discounted_price, stock_quantity, brand, specifications_json,
      features_json, compatibility, package_contents_json, shipping_weight_grams,
      estimated_dispatch_days, is_featured, is_active, rating_avg, rating_count
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, 1, 4.8, 12
    )
  `);

  const insertImage = db.prepare(`
    INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertReview = db.prepare(`
    INSERT INTO reviews (product_id, customer_name, rating, title, comment, is_verified_purchase, status)
    VALUES (?, ?, ?, ?, ?, 1, 'approved')
  `);

  for (const prod of productsData) {
    const categoryId = getCatIdBySlug(prod.category_slug);
    const result = insertProduct.run(
      prod.slug,
      prod.name,
      prod.sku,
      categoryId,
      prod.subcategory,
      prod.short_description,
      prod.description,
      prod.regular_price,
      prod.discounted_price,
      prod.stock_quantity,
      prod.brand,
      JSON.stringify(prod.specifications),
      JSON.stringify(prod.features),
      prod.compatibility,
      JSON.stringify(prod.package_contents),
      prod.shipping_weight_grams,
      prod.estimated_dispatch_days,
      prod.is_featured
    );

    const productId = Number(result.lastInsertRowid);

    // Insert images
    prod.images.forEach((url, idx) => {
      insertImage.run(productId, url, prod.name, idx, idx === 0 ? 1 : 0);
    });

    // Insert sample reviews
    insertReview.run(
      productId,
      'Suresh Kumar',
      5,
      'Excellent quality for my engineering project!',
      'Fast delivery to Vijayawada in just 2 days. The board worked right out of the box with Arduino IDE, original chips with clear markings. Highly recommended for students!',
    );
    insertReview.run(
      productId,
      'Priya Sharma',
      5,
      'Genuine product and prompt support',
      'Got this for our robotics competition. Build quality is superb and packaging was bubble-wrapped nicely. VK Technology is our go-to store now.',
    );
  }

  console.log(`Successfully seeded ${productsData.length} initial products with reviews & images.`);
  } catch (err) {
    console.warn('[DB] Non-critical warning in seedProducts:', err);
  }
}
