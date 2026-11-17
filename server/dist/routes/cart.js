"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../database.js");
const auth_js_1 = require("../middleware/auth.js");
exports.cartRouter = (0, express_1.Router)();
// Helper to get or create cart
function getOrCreateCart(userId, guestId) {
    if (userId) {
        let cart = database_js_1.db.prepare('SELECT id FROM carts WHERE user_id = ?').get(userId);
        if (!cart) {
            const res = database_js_1.db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId);
            return Number(res.lastInsertRowid);
        }
        return cart.id;
    }
    else if (guestId) {
        let cart = database_js_1.db.prepare('SELECT id FROM carts WHERE guest_id = ?').get(guestId);
        if (!cart) {
            const res = database_js_1.db.prepare('INSERT INTO carts (guest_id) VALUES (?)').run(guestId);
            return Number(res.lastInsertRowid);
        }
        return cart.id;
    }
    const res = database_js_1.db.prepare('INSERT INTO carts (guest_id) VALUES (?)').run(`guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    return Number(res.lastInsertRowid);
}
// Get Cart Items
exports.cartRouter.get('/', auth_js_1.optionalToken, (req, res) => {
    try {
        const guestId = req.headers['x-guest-id'];
        const userId = req.user ? req.user.id : undefined;
        if (!userId && !guestId) {
            res.json({ items: [], subtotal: 0, count: 0 });
            return;
        }
        const cartId = getOrCreateCart(userId, guestId);
        const items = database_js_1.db.prepare(`
      SELECT 
        ci.id as cart_item_id,
        ci.quantity,
        p.id as product_id,
        p.name,
        p.slug,
        p.sku,
        p.regular_price,
        p.discounted_price,
        p.stock_quantity,
        (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) as image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ? AND p.is_active = 1 AND p.deleted_at IS NULL
    `).all(cartId);
        let subtotal = 0;
        let count = 0;
        const formattedItems = items.map(item => {
            const price = item.discounted_price !== null ? item.discounted_price : item.regular_price;
            subtotal += price * item.quantity;
            count += item.quantity;
            return {
                ...item,
                price,
                total: price * item.quantity
            };
        });
        res.json({
            cart_id: cartId,
            items: formattedItems,
            subtotal,
            count
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch cart.' });
    }
});
// Add Item to Cart
exports.cartRouter.post('/items', auth_js_1.optionalToken, (req, res) => {
    try {
        const { product_id, quantity = 1 } = req.body;
        const guestId = req.headers['x-guest-id'];
        const userId = req.user ? req.user.id : undefined;
        if (!product_id) {
            res.status(400).json({ error: 'Product ID is required.' });
            return;
        }
        const product = database_js_1.db.prepare('SELECT id, stock_quantity, name FROM products WHERE id = ? AND is_active = 1 AND deleted_at IS NULL').get(product_id);
        if (!product) {
            res.status(404).json({ error: 'Product not found or inactive.' });
            return;
        }
        const cartId = getOrCreateCart(userId, guestId);
        const existing = database_js_1.db.prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?').get(cartId, product_id);
        const newQuantity = (existing ? existing.quantity : 0) + Number(quantity);
        if (newQuantity > product.stock_quantity) {
            res.status(400).json({ error: `Cannot add more than available stock (${product.stock_quantity} available).` });
            return;
        }
        if (existing) {
            database_js_1.db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQuantity, existing.id);
        }
        else {
            database_js_1.db.prepare('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)').run(cartId, product_id, Number(quantity));
        }
        res.json({ message: 'Added to cart successfully.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add item to cart.' });
    }
});
// Update Item Quantity
const handleUpdateQuantity = (req, res) => {
    try {
        const { quantity } = req.body;
        const productId = req.params.productId || req.body.product_id || req.body.productId;
        const guestId = req.headers['x-guest-id'];
        const userId = req.user ? req.user.id : undefined;
        if (!productId) {
            res.status(400).json({ error: 'Product ID is required.' });
            return;
        }
        if (quantity <= 0) {
            const cartId = getOrCreateCart(userId, guestId);
            database_js_1.db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(cartId, productId);
            res.json({ message: 'Item removed from cart.' });
            return;
        }
        const product = database_js_1.db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(productId);
        if (product && quantity > product.stock_quantity) {
            res.status(400).json({ error: `Only ${product.stock_quantity} items available in stock.` });
            return;
        }
        const cartId = getOrCreateCart(userId, guestId);
        database_js_1.db.prepare('UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?').run(quantity, cartId, productId);
        res.json({ message: 'Cart updated.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update cart.' });
    }
};
exports.cartRouter.put('/items/:productId', auth_js_1.optionalToken, handleUpdateQuantity);
exports.cartRouter.put('/items', auth_js_1.optionalToken, handleUpdateQuantity);
// Remove item from cart
exports.cartRouter.delete('/items/:productId', auth_js_1.optionalToken, (req, res) => {
    try {
        const productId = req.params.productId;
        const guestId = req.headers['x-guest-id'];
        const userId = req.user ? req.user.id : undefined;
        const cartId = getOrCreateCart(userId, guestId);
        database_js_1.db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(cartId, productId);
        res.json({ message: 'Item removed.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to remove cart item.' });
    }
});
// Clear cart
exports.cartRouter.delete('/clear', auth_js_1.optionalToken, (req, res) => {
    try {
        const guestId = req.headers['x-guest-id'];
        const userId = req.user ? req.user.id : undefined;
        const cartId = getOrCreateCart(userId, guestId);
        database_js_1.db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cartId);
        res.json({ message: 'Cart cleared.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to clear cart.' });
    }
});
// Sync Guest Cart into User Cart upon login
exports.cartRouter.post('/sync', auth_js_1.authenticateToken, (req, res) => {
    try {
        const { guest_id, items } = req.body;
        const userCartId = getOrCreateCart(req.user.id);
        // Merge items array if provided from localStorage
        if (Array.isArray(items)) {
            for (const item of items) {
                const prod = database_js_1.db.prepare('SELECT id, stock_quantity FROM products WHERE id = ?').get(item.product_id);
                if (prod) {
                    const existing = database_js_1.db.prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?').get(userCartId, prod.id);
                    if (existing) {
                        const mergedQty = Math.min(prod.stock_quantity, existing.quantity + item.quantity);
                        database_js_1.db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(mergedQty, existing.id);
                    }
                    else {
                        const qty = Math.min(prod.stock_quantity, item.quantity);
                        database_js_1.db.prepare('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)').run(userCartId, prod.id, qty);
                    }
                }
            }
        }
        res.json({ message: 'Cart synchronized.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Cart sync failed.' });
    }
});
