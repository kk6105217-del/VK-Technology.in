import { Router, Response } from 'express';
import { db } from '../database.js';
import { authenticateToken, optionalToken, AuthenticatedRequest } from '../middleware/auth.js';

export const cartRouter = Router();

// Helper to get or create cart
function getOrCreateCart(userId?: number, guestId?: string): number {
  if (userId) {
    let cart = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(userId) as any;
    if (!cart) {
      const res = db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId);
      return Number(res.lastInsertRowid);
    }
    return cart.id;
  } else if (guestId) {
    let cart = db.prepare('SELECT id FROM carts WHERE guest_id = ?').get(guestId) as any;
    if (!cart) {
      const res = db.prepare('INSERT INTO carts (guest_id) VALUES (?)').run(guestId);
      return Number(res.lastInsertRowid);
    }
    return cart.id;
  }
  const res = db.prepare('INSERT INTO carts (guest_id) VALUES (?)').run(`guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  return Number(res.lastInsertRowid);
}

// Get Cart Items
cartRouter.get('/', optionalToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const guestId = req.headers['x-guest-id'] as string;
    const userId = req.user ? req.user.id : undefined;

    if (!userId && !guestId) {
      res.json({ items: [], subtotal: 0, count: 0 });
      return;
    }

    const cartId = getOrCreateCart(userId, guestId);

    const items = db.prepare(`
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
      WHERE ci.cart_id = ? AND p.is_active = 1
    `).all(cartId) as any[];

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
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch cart.' });
  }
});

// Add Item to Cart
cartRouter.post('/items', optionalToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const guestId = req.headers['x-guest-id'] as string;
    const userId = req.user ? req.user.id : undefined;

    if (!product_id) {
      res.status(400).json({ error: 'Product ID is required.' });
      return;
    }

    const product = db.prepare('SELECT id, stock_quantity, name FROM products WHERE id = ? AND is_active = 1').get(product_id) as any;
    if (!product) {
      res.status(404).json({ error: 'Product not found or inactive.' });
      return;
    }

    const cartId = getOrCreateCart(userId, guestId);
    const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?').get(cartId, product_id) as any;

    const newQuantity = (existing ? existing.quantity : 0) + Number(quantity);

    if (newQuantity > product.stock_quantity) {
      res.status(400).json({ error: `Cannot add more than available stock (${product.stock_quantity} available).` });
      return;
    }

    if (existing) {
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQuantity, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)').run(cartId, product_id, Number(quantity));
    }

    res.json({ message: 'Added to cart successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add item to cart.' });
  }
});

// Update Item Quantity
const handleUpdateQuantity = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quantity } = req.body;
    const productId = req.params.productId || req.body.product_id || req.body.productId;
    const guestId = req.headers['x-guest-id'] as string;
    const userId = req.user ? req.user.id : undefined;

    if (!productId) {
      res.status(400).json({ error: 'Product ID is required.' });
      return;
    }

    if (quantity <= 0) {
      const cartId = getOrCreateCart(userId, guestId);
      db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(cartId, productId);
      res.json({ message: 'Item removed from cart.' });
      return;
    }

    const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(productId) as any;
    if (product && quantity > product.stock_quantity) {
      res.status(400).json({ error: `Only ${product.stock_quantity} items available in stock.` });
      return;
    }

    const cartId = getOrCreateCart(userId, guestId);
    db.prepare('UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?').run(quantity, cartId, productId);

    res.json({ message: 'Cart updated.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update cart.' });
  }
};
cartRouter.put('/items/:productId', optionalToken, handleUpdateQuantity);
cartRouter.put('/items', optionalToken, handleUpdateQuantity);

// Remove item from cart
cartRouter.delete('/items/:productId', optionalToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = req.params.productId;
    const guestId = req.headers['x-guest-id'] as string;
    const userId = req.user ? req.user.id : undefined;

    const cartId = getOrCreateCart(userId, guestId);
    db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(cartId, productId);

    res.json({ message: 'Item removed.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to remove cart item.' });
  }
});

// Clear cart
cartRouter.delete('/clear', optionalToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const guestId = req.headers['x-guest-id'] as string;
    const userId = req.user ? req.user.id : undefined;

    const cartId = getOrCreateCart(userId, guestId);
    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cartId);

    res.json({ message: 'Cart cleared.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to clear cart.' });
  }
});

// Sync Guest Cart into User Cart upon login
cartRouter.post('/sync', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { guest_id, items } = req.body;
    const userCartId = getOrCreateCart(req.user!.id);

    // Merge items array if provided from localStorage
    if (Array.isArray(items)) {
      for (const item of items) {
        const prod = db.prepare('SELECT id, stock_quantity FROM products WHERE id = ?').get(item.product_id) as any;
        if (prod) {
          const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?').get(userCartId, prod.id) as any;
          if (existing) {
            const mergedQty = Math.min(prod.stock_quantity, existing.quantity + item.quantity);
            db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(mergedQty, existing.id);
          } else {
            const qty = Math.min(prod.stock_quantity, item.quantity);
            db.prepare('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)').run(userCartId, prod.id, qty);
          }
        }
      }
    }

    res.json({ message: 'Cart synchronized.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Cart sync failed.' });
  }
});
