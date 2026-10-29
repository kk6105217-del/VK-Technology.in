"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiSpec = void 0;
exports.openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'VK Technology E-Commerce API',
        description: 'Production-ready REST API for VK Technology DIY Tech Projects e-commerce platform. Inspired by Amazon India shopping architecture.',
        version: '2.0.0',
        contact: {
            name: 'VK Technology Support',
            email: 'admin@vktechnology.shop',
            url: 'https://www.vktechnology.shop'
        }
    },
    servers: [
        {
            url: '/api',
            description: 'Production and Local Base API'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT token obtained from /api/auth/login or /api/auth/admin-login'
            }
        }
    },
    paths: {
        '/health': {
            get: {
                summary: 'Health Check',
                description: 'Returns operational status, store metadata, currency, and timestamp.',
                responses: {
                    '200': { description: 'OK' }
                }
            }
        },
        '/events': {
            get: {
                summary: 'Server-Sent Events (SSE) Stream',
                description: 'Real-time event stream broadcasting product updates, price changes, and stock updates to all connected devices.',
                responses: {
                    '200': { description: 'SSE Stream opened' }
                }
            }
        },
        '/products': {
            get: {
                summary: 'Get Products Catalog',
                description: 'Returns paginated products list with search, filter (category, price, rating, brand, in_stock), and sort.',
                parameters: [
                    { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search term' },
                    { name: 'category', in: 'query', schema: { type: 'string' } },
                    { name: 'sort', in: 'query', schema: { type: 'string', enum: ['relevance', 'price-asc', 'price-desc', 'newest', 'rating', 'bestselling'] } },
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 24 } }
                ],
                responses: {
                    '200': { description: 'Products list retrieved' }
                }
            },
            post: {
                summary: 'Create Product (Admin)',
                security: [{ bearerAuth: [] }],
                responses: {
                    '201': { description: 'Product created and broadcasted in real time' },
                    '401': { description: 'Unauthorized' },
                    '403': { description: 'Forbidden (Admin role required)' }
                }
            }
        },
        '/products/{id}': {
            put: {
                summary: 'Update Product (Admin)',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Product updated and broadcasted in real time' }
                }
            },
            delete: {
                summary: 'Delete Product (Admin)',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Product deleted' }
                }
            }
        },
        '/auth/login': {
            post: {
                summary: 'Customer Login',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': { description: 'Authentication successful with JWT token' },
                    '401': { description: 'Invalid credentials' }
                }
            }
        },
        '/auth/admin-login': {
            post: {
                summary: 'Admin Login',
                description: 'Secure authentication for store administrators.',
                responses: {
                    '200': { description: 'Admin authenticated' },
                    '401': { description: 'Invalid admin credentials' }
                }
            }
        },
        '/cart': {
            get: {
                summary: 'Get Cart',
                description: 'Retrieve current customer or guest cart items with server-calculated prices.',
                responses: { '200': { description: 'Cart items' } }
            },
            post: {
                summary: 'Add to Cart',
                responses: { '200': { description: 'Item added' } }
            }
        },
        '/orders': {
            get: {
                summary: 'Get Orders (Authenticated User)',
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'List of orders' } }
            },
            post: {
                summary: 'Place Order / Checkout',
                description: 'Server validates product prices, stock, discounts, and creates the order.',
                responses: { '201': { description: 'Order created' } }
            }
        },
        '/orders/create-payment': {
            post: {
                summary: 'Create Razorpay Payment Order',
                description: 'Generates Razorpay order_id server-side with verified amount.',
                responses: { '200': { description: 'Razorpay order created' } }
            }
        },
        '/orders/verify-payment': {
            post: {
                summary: 'Verify Razorpay Payment Signature',
                description: 'Verifies HMAC-SHA256 signature using razorpay_key_secret.',
                responses: { '200': { description: 'Payment verified' } }
            }
        }
    }
};
