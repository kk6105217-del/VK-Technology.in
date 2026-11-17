import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Check, Zap } from 'lucide-react';
import { Product } from '../types';
import { StarRating } from './StarRating';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const inWishlist = isInWishlist(product.id);
  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;

  const currentPrice = product.discounted_price !== null && product.discounted_price !== undefined
    ? Number(product.discounted_price)
    : Number(product.regular_price);

  const hasDiscount = product.discounted_price && product.discounted_price < product.regular_price;
  const discountPercent = hasDiscount
    ? Math.round(((product.regular_price - product.discounted_price!) / product.regular_price) * 100)
    : 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || isAdding) return;

    try {
      setIsAdding(true);
      await addToCart(product, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product);
  };

  const imageUrl = product.primary_image || 
    (product.images && product.images.length > 0 ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.image_url) : '') || 
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col justify-between hover:shadow-amazon-hover transition-all duration-200 relative group text-left">
      {/* Top Badges & Wishlist Button */}
      <div className="relative mb-2">
        {/* Wishlist toggle */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-1 right-1 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:scale-110 transition-all focus:outline-none"
          title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            size={18}
            className={inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}
          />
        </button>

        {/* Discount Badge */}
        {hasDiscount && (
          <span className="absolute top-1 left-1 z-10 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
            {discountPercent}% OFF
          </span>
        )}

        {/* Product Image */}
        <Link to={`/product/${product.slug}`} className="block overflow-hidden rounded bg-gray-50 aspect-square flex items-center justify-center p-2">
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80';
            }}
          />
        </Link>
      </div>

      {/* Product Content Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Subcategory */}
          <div className="text-[11px] text-gray-500 mb-1 flex items-center justify-between">
            <span className="font-medium text-gray-600 truncate">{product.brand || 'VK Technology'}</span>
            <span className="text-gray-400 text-[10px] uppercase font-mono">{product.sku}</span>
          </div>

          {/* Product Title */}
          <Link
            to={`/product/${product.slug}`}
            className="block text-sm font-medium text-gray-900 hover:text-amber-600 transition-colors line-clamp-2 leading-snug mb-1.5"
            title={product.name}
          >
            {product.name}
          </Link>

          {/* Ratings */}
          <div className="mb-2">
            <StarRating
              rating={product.rating_avg || 4.8}
              size={13}
              count={product.rating_count || 12}
            />
          </div>
        </div>

        <div>
          {/* Price Block in Indian Rupees */}
          <div className="mt-1 mb-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-lg font-bold text-gray-900">
                ₹{currentPrice.toLocaleString('en-IN')}
              </span>
              {hasDiscount && (
                <span className="text-xs text-gray-500 line-through">
                  ₹{Number(product.regular_price).toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {/* Delivery Promise */}
            <div className="flex items-center text-[11px] text-gray-600 mt-1">
              <span className="text-emerald-700 font-semibold flex items-center">
                <Zap size={12} className="mr-0.5 fill-emerald-600 text-emerald-600" />
                {currentPrice >= 999 ? 'FREE Delivery' : 'Standard Delivery'}
              </span>
              <span className="mx-1">•</span>
              <span className="text-gray-500">1-2 Weeks</span>
            </div>

            {/* Stock indicator */}
            {isOutOfStock ? (
              <span className="text-xs font-bold text-red-600 block mt-1">
                Currently Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="text-xs font-semibold text-orange-600 block mt-1">
                Only {product.stock_quantity} left in stock - order soon!
              </span>
            ) : (
              <span className="text-xs font-medium text-vk-stockGreen block mt-1">
                In Stock
              </span>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAdding}
            className={`w-full py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : added
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-400 hover:bg-amber-500 text-gray-900 active:scale-95'
            }`}
          >
            {added ? (
              <>
                <Check size={14} className="stroke-[3]" />
                <span>Added to Cart</span>
              </>
            ) : (
              <>
                <ShoppingCart size={14} />
                <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
