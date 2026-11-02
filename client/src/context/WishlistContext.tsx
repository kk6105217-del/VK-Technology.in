import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useCatalogSync } from '../hooks/useCatalogSync';

interface WishlistContextType {
  items: Product[];
  isInWishlist: (productId: number) => boolean;
  toggleWishlist: (product: Product) => Promise<boolean>;
  removeFromWishlist: (productId: number) => Promise<void>;
  refreshWishlist: () => Promise<void>;
  count: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);

  const refreshWishlist = async () => {
    if (!user) {
      // Local storage fallback for guests
      try {
        const saved = localStorage.getItem('vk_guest_wishlist');
        if (saved) setItems(JSON.parse(saved));
      } catch (e) {}
      return;
    }

    try {
      const res = await api.wishlist.get();
      setItems(res.items || []);
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    }
  };

  useEffect(() => {
    refreshWishlist();
  }, [user]);

  // Synchronize wishlist live when products are edited or deleted
  useCatalogSync(() => {
    refreshWishlist();
  });

  const isInWishlist = (productId: number): boolean => {
    return items.some(item => item.id === productId || (item as any).product_id === productId);
  };

  const toggleWishlist = async (product: Product): Promise<boolean> => {
    if (user) {
      const res = await api.wishlist.toggle(product.id);
      await refreshWishlist();
      return res.inWishlist;
    } else {
      // Guest local storage wishlist
      let current = [...items];
      const exists = current.some(i => i.id === product.id);
      let inList = false;
      if (exists) {
        current = current.filter(i => i.id !== product.id);
      } else {
        current.push(product);
        inList = true;
      }
      setItems(current);
      localStorage.setItem('vk_guest_wishlist', JSON.stringify(current));
      return inList;
    }
  };

  const removeFromWishlist = async (productId: number) => {
    if (user) {
      await api.wishlist.remove(productId);
      await refreshWishlist();
    } else {
      const filtered = items.filter(i => i.id !== productId);
      setItems(filtered);
      localStorage.setItem('vk_guest_wishlist', JSON.stringify(filtered));
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        refreshWishlist,
        count: items.length
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
