import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Coupon, Product } from '../types';
import { api, getGuestId } from '../services/api';
import { useAuth } from './AuthContext';
import { useCatalogSync } from '../hooks/useCatalogSync';

interface CartContextType {
  items: CartItem[];
  subtotal: number;
  count: number;
  appliedCoupon: Coupon | null;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  isLoading: boolean;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshCart = async () => {
    try {
      setIsLoading(true);
      const res = await api.cart.get();
      setItems(res.items || []);
      setSubtotal(res.subtotal || 0);
      setCount(res.count || 0);
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [user]);

  // Synchronize cart with real-time product price and stock modifications
  useCatalogSync(() => {
    refreshCart();
  });

  const addToCart = async (product: Product, quantity: number = 1) => {
    await api.cart.addItem(product.id, quantity);
    await refreshCart();
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    await api.cart.updateQuantity(productId, quantity);
    await refreshCart();
  };

  const removeFromCart = async (productId: number) => {
    await api.cart.removeItem(productId);
    await refreshCart();
  };

  const clearCart = async () => {
    await api.cart.clear();
    setAppliedCoupon(null);
    await refreshCart();
  };

  const applyCoupon = async (code: string) => {
    const res = await api.coupons.validate(code, subtotal);
    if (res.valid) {
      setAppliedCoupon(res.coupon);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Re-calculate discounts and shipping
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = (subtotal * appliedCoupon.discount_value) / 100;
      if (appliedCoupon.max_discount_amount && discountAmount > appliedCoupon.max_discount_amount) {
        discountAmount = appliedCoupon.max_discount_amount;
      }
    } else {
      discountAmount = appliedCoupon.discount_value;
    }
    discountAmount = Math.min(subtotal, discountAmount);
  }

  const freeShippingThreshold = 999;
  const shippingFee = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 60;
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        count,
        appliedCoupon,
        discountAmount,
        shippingFee,
        totalAmount,
        isLoading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        refreshCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
