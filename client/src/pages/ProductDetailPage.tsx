import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Heart,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Share2,
  Check,
  ChevronRight,
  Package,
  Wrench,
  AlertCircle
} from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { PincodeChecker } from '../components/PincodeChecker';
import { ProductCard } from '../components/ProductCard';
import { api } from '../services/api';
import { Product, Review } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useCatalogSync } from '../hooks/useCatalogSync';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'features' | 'contents' | 'warranty'>('specs');
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Review submission state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');
  const [reviewErrorMsg, setReviewErrorMsg] = useState('');

  const loadProduct = () => {
    if (!slug) return;
    api.products.getBySlug(slug)
      .then(res => {
        const prod = res.product;
        setProduct(prod);

        // Pick primary image
        const prim = (prod.images && prod.images.length > 0)
          ? (prod.images.find((i: any) => i?.is_primary)?.image_url || (typeof prod.images[0] === 'string' ? prod.images[0] : prod.images[0]?.image_url) || prod.primary_image || '')
          : (prod.primary_image || '');
        setSelectedImage(prim);

        // Add to recently viewed in localStorage
        try {
          const stored = localStorage.getItem('vk_recently_viewed');
          let list: Product[] = stored ? JSON.parse(stored) : [];
          list = list.filter(p => p.id !== prod.id);
          list.unshift(prod);
          localStorage.setItem('vk_recently_viewed', JSON.stringify(list.slice(0, 8)));
        } catch (e) {}
      })
      .catch(err => {
        console.error('Failed to load product:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setIsLoading(true);
    setQuantity(1);
    loadProduct();
  }, [slug]);

  // Real-time live synchronization for this product
  useCatalogSync(() => {
    loadProduct();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-lg border border-gray-200 animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-10 bg-gray-200 rounded w-1/2" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto my-16 text-center bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <AlertCircle size={48} className="text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-xs text-gray-500 mb-6">
          The requested electronic component or kit may have been removed or unpublished.
        </p>
        <Link
          to="/products"
          className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold px-6 py-2 rounded text-xs transition"
        >
          Browse All Products
        </Link>
      </div>
    );
  }

  const currentPrice = product.discounted_price !== null && product.discounted_price !== undefined
    ? Number(product.discounted_price)
    : Number(product.regular_price);

  const hasDiscount = product.discounted_price && product.discounted_price < product.regular_price;
  const discountPercent = hasDiscount
    ? Math.round(((product.regular_price - product.discounted_price!) / product.regular_price) * 100)
    : 0;

  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = async () => {
    if (isOutOfStock || isAdding) return;
    try {
      setIsAdding(true);
      await addToCart(product, quantity);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to add item to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) return;
    try {
      await addToCart(product, quantity);
      navigate('/checkout');
    } catch (err: any) {
      alert(err.message || 'Failed to initiate purchase');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewErrorMsg('');
    setReviewSuccessMsg('');

    if (!reviewComment.trim()) {
      setReviewErrorMsg('Please write your review comment.');
      return;
    }

    try {
      setReviewSubmitting(true);
      const res = await api.reviews.submit({
        product_id: product.id,
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
        customer_name: reviewerName.trim() || (user ? user.full_name : 'Customer')
      });

      setReviewSuccessMsg(res.message);
      setReviewTitle('');
      setReviewComment('');
      // Reload product details to update reviews
      const updated = await api.products.getBySlug(product.slug);
      setProduct(updated.product);
    } catch (err: any) {
      setReviewErrorMsg(err.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const imagesList = product.images && product.images.length > 0
    ? product.images.map((i: any) => typeof i === 'string' ? i : (i.image_url || i.url)).filter(Boolean)
    : [product.primary_image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'];

  return (
    <div className="bg-[#eaeded] min-h-screen py-4 sm:py-6">
      <div className="max-w-[1500px] mx-auto px-2 sm:px-4 space-y-4">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 flex items-center space-x-1.5 flex-wrap">
          <Link to="/" className="hover:underline">Home</Link>
          <span>›</span>
          <Link to="/products" className="hover:underline">Products</Link>
          {product.category_slug && (
            <>
              <span>›</span>
              <Link to={`/category/${product.category_slug}`} className="hover:underline">
                {product.category_name || product.category_slug}
              </Link>
            </>
          )}
          <span>›</span>
          <span className="font-semibold text-gray-900 truncate max-w-xs">{product.name}</span>
        </div>

        {/* Main Product Box */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column: Image Gallery (5 cols) */}
            <div className="lg:col-span-5 flex flex-col-reverse sm:flex-row gap-3">
              {/* Thumbnails */}
              {imagesList.length > 1 && (
                <div className="flex sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 overflow-x-auto sm:overflow-y-auto max-h-96 shrink-0">
                  {imagesList.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded border-2 p-1 bg-gray-50 transition-all ${
                        selectedImage === img
                          ? 'border-amber-500 ring-2 ring-amber-200'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Main Image Display */}
              <div className="flex-1 bg-gray-50 rounded-lg border border-gray-100 p-4 aspect-square flex items-center justify-center relative overflow-hidden group">
                {hasDiscount && (
                  <span className="absolute top-3 left-3 bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded shadow">
                    {discountPercent}% OFF
                  </span>
                )}
                <img
                  src={selectedImage || imagesList[0]}
                  alt={product.name}
                  className="max-h-[420px] max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>

            {/* Middle Column: Details & Specs (4 cols) */}
            <div className="lg:col-span-4 space-y-4 text-left">
              <div>
                <span className="text-xs font-semibold text-vk-blue uppercase tracking-wide">
                  {product.brand || 'VK Technology'} • SKU: {product.sku}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug mt-1">
                  {product.name}
                </h1>
              </div>

              {/* Rating summary */}
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                <StarRating rating={product.rating_avg || 4.8} size={15} count={product.rating_count || 12} />
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-500">
                  {product.view_count || 45} views
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-xs font-semibold text-emerald-700">Verified VK Hardware</span>
              </div>

              {/* Price Details */}
              <div className="space-y-1">
                <div className="flex items-baseline space-x-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-vk-price font-sans">
                    ₹{currentPrice.toLocaleString('en-IN')}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-sm text-gray-500 line-through">
                        M.R.P: ₹{Number(product.regular_price).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Save ₹{(product.regular_price - product.discounted_price!).toLocaleString('en-IN')} ({discountPercent}%)
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Inclusive of all taxes. Free delivery on orders over ₹999.
                </p>
              </div>

              {/* Short Description */}
              {product.short_description && (
                <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded border border-gray-200">
                  {product.short_description}
                </p>
              )}

              {/* Key Features Bullet Points */}
              {product.features && product.features.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Key Features:
                  </h4>
                  <ul className="space-y-1.5 text-xs text-gray-700">
                    {product.features.map((feat, i) => (
                      <li key={i} className="flex items-start">
                        <Check size={14} className="text-emerald-600 mr-1.5 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pincode Estimator */}
              <div className="pt-2">
                <PincodeChecker />
              </div>
            </div>

            {/* Right Column: Buy Box (3 cols) */}
            <div className="lg:col-span-3">
              <div className="border border-gray-300 rounded-lg p-4 sm:p-5 shadow-sm space-y-4 bg-gray-50/50">
                <div className="text-2xl font-bold text-gray-900">
                  ₹{currentPrice.toLocaleString('en-IN')}
                </div>

                {/* Stock status */}
                <div>
                  {isOutOfStock ? (
                    <div className="text-sm font-bold text-red-600">
                      Currently unavailable / Out of stock.
                    </div>
                  ) : isLowStock ? (
                    <div className="text-sm font-bold text-orange-600">
                      Only {product.stock_quantity} left in stock - order soon!
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-vk-stockGreen">
                      In Stock.
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-0.5">
                    Ships from: <strong>VK Technology, India</strong>
                  </div>
                </div>

                {/* Quantity Selector */}
                {!isOutOfStock && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Quantity:
                    </label>
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded-md py-1.5 px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      {Array.from(
                        { length: Math.min(10, product.stock_quantity || 1) },
                        (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock || isAdding}
                    className={`w-full py-2.5 px-4 rounded-full font-bold text-xs flex items-center justify-center space-x-2 shadow transition-all ${
                      isOutOfStock
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : addedSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-400 hover:bg-amber-500 text-gray-950 active:scale-95'
                    }`}
                  >
                    {addedSuccess ? (
                      <>
                        <Check size={16} />
                        <span>Added to Cart!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleBuyNow}
                    disabled={isOutOfStock}
                    className={`w-full py-2.5 px-4 rounded-full font-bold text-xs flex items-center justify-center space-x-2 shadow transition-all ${
                      isOutOfStock
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-600 text-gray-950 active:scale-95'
                    }`}
                  >
                    <Zap size={16} />
                    <span>Buy Now</span>
                  </button>

                  <button
                    onClick={() => toggleWishlist(product)}
                    className="w-full py-2 px-4 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <Heart
                      size={15}
                      className={inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                    />
                    <span>{inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}</span>
                  </button>
                </div>

                {/* Trust Badges */}
                <div className="pt-3 border-t border-gray-200 space-y-2 text-[11px] text-gray-600">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                    <span>Secure Transaction (128-bit SSL & Razorpay)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RotateCcw size={14} className="text-blue-600 shrink-0" />
                    <span>7 Days Replacement Policy for Defects</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Truck size={14} className="text-amber-600 shrink-0" />
                    <span>All India Tracked Dispatch with SMS/WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Technical Specifications & Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-5 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'specs'
                  ? 'border-amber-500 text-amber-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-5 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'features'
                  ? 'border-amber-500 text-amber-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Detailed Description
            </button>
            <button
              onClick={() => setActiveTab('contents')}
              className={`px-5 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'contents'
                  ? 'border-amber-500 text-amber-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Package Contents & Contents
            </button>
            <button
              onClick={() => setActiveTab('warranty')}
              className={`px-5 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'warranty'
                  ? 'border-amber-500 text-amber-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Warranty & Returns
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6 text-xs text-gray-800">
            {activeTab === 'specs' && (
              <div className="max-w-3xl">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Technical Specifications</h3>
                {product.specifications && Object.keys(product.specifications).length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <tbody>
                        {Object.entries(product.specifications).map(([key, val], idx) => (
                          <tr key={key} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-4 py-2.5 font-bold text-gray-700 w-1/3 border-b border-gray-200">
                              {key}
                            </td>
                            <td className="px-4 py-2.5 text-gray-900 border-b border-gray-200">
                              {String(val)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">Standard electronic ratings apply for this component.</p>
                )}
              </div>
            )}

            {activeTab === 'features' && (
              <div className="max-w-3xl space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Product Overview & Features</h3>
                <p className="leading-relaxed whitespace-pre-line text-gray-700">
                  {product.description}
                </p>
                {product.compatibility && (
                  <div className="bg-amber-50 p-3 rounded border border-amber-200 mt-3">
                    <strong className="text-amber-900 font-bold block mb-1">Hardware & Software Compatibility:</strong>
                    <span className="text-amber-800">{product.compatibility}</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contents' && (
              <div className="max-w-2xl">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Package Contents & In-The-Box</h3>
                {product.package_contents && product.package_contents.length > 0 ? (
                  <ul className="space-y-2">
                    {product.package_contents.map((item, idx) => (
                      <li key={idx} className="flex items-center space-x-2 text-gray-800">
                        <Package size={15} className="text-amber-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">1x {product.name}</p>
                )}

                <div className="mt-4 pt-3 border-t border-gray-200 text-gray-500 text-[11px]">
                  Estimated shipping weight: {product.shipping_weight_grams || 250}g • Secure anti-static bubble wrap packaging.
                </div>
              </div>
            )}

            {activeTab === 'warranty' && (
              <div className="max-w-2xl space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Warranty & Returns Policy</h3>
                <p className="text-gray-700">
                  <strong>Warranty:</strong> {product.warranty_info || '6 Months Manufacturer Testing Warranty'}. Covers manufacturing defects and dead-on-arrival components.
                </p>
                <p className="text-gray-700">
                  <strong>Return Policy:</strong> 7-day replacement guarantee if the product arrives damaged or defective. Simply reach out with an unboxing photo to our support desk (admin@vktechnology.shop) or WhatsApp (+91 8555997052).
                </p>
                <p className="text-gray-500 text-[11px]">
                  Note: Burnt components resulting from incorrect input voltage or short circuits caused by user wiring errors are not covered under replacement.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Reviews & Verified Purchase Review Submission */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-2 mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Customer Ratings & Reviews</h2>
              <div className="flex items-center space-x-2 mt-1">
                <StarRating rating={product.rating_avg || 4.8} size={16} />
                <span className="font-bold text-sm text-gray-900">{product.rating_avg?.toFixed(1) || '4.8'} out of 5</span>
                <span className="text-xs text-gray-500">({product.reviews?.length || 0} customer reviews)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Reviews List (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((rev) => (
                  <div key={rev.id} className="border-b border-gray-100 pb-4 last:border-b-0 space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs text-gray-600">
                        {rev.customer_name[0]}
                      </div>
                      <span className="font-semibold text-xs text-gray-800">{rev.customer_name}</span>
                      {rev.is_verified_purchase ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          ✓ Verified Purchase
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center space-x-2">
                      <StarRating rating={rev.rating} size={12} />
                      {rev.title && <span className="font-bold text-xs text-gray-900">{rev.title}</span>}
                    </div>

                    <div className="text-[10px] text-gray-400">
                      Reviewed on {new Date(rev.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>

                    <p className="text-xs text-gray-700 leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 italic">
                  No customer reviews yet. Be the first to share your experience with this kit!
                </p>
              )}
            </div>

            {/* Submit Review Box (5 cols) */}
            <div className="lg:col-span-5 bg-gray-50 p-4 sm:p-5 rounded-lg border border-gray-200 h-fit">
              <h3 className="font-bold text-sm text-gray-900 mb-1">Review this Product</h3>
              <p className="text-xs text-gray-500 mb-3">
                Share your feedback to help student makers and engineers build better projects.
              </p>

              {reviewSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded text-xs mb-3 flex items-center">
                  <CheckCircle2 size={15} className="mr-1.5 shrink-0" />
                  <span>{reviewSuccessMsg}</span>
                </div>
              )}

              {reviewErrorMsg && (
                <div className="bg-red-50 border border-red-300 text-red-800 p-2.5 rounded text-xs mb-3">
                  {reviewErrorMsg}
                </div>
              )}

              <form onSubmit={handleReviewSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Overall Rating</label>
                  <StarRating
                    rating={reviewRating}
                    size={22}
                    interactive
                    onChange={(r) => setReviewRating(r)}
                  />
                </div>

                {!user && (
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Babu"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Headline / Review Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Great performance for obstacle avoidance robot"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Written Review</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Write your review here. Mention interfacing tips, build quality, and performance..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-2 rounded text-xs shadow-sm transition disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Submitting Review...' : 'Submit Review'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {product.relatedProducts && product.relatedProducts.length > 0 && (
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
              Related Components & Kits in {product.category_name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {product.relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
