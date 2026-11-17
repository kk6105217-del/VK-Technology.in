import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Filter,
  X,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  Search,
  Check
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { StarRating } from '../components/StarRating';
import { api } from '../services/api';
import { Product, Category } from '../types';
import { useCatalogSync } from '../hooks/useCatalogSync';

interface ProductsPageProps {
  fixedCategorySlug?: string;
  categoryTitle?: string;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ fixedCategorySlug, categoryTitle }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filter state
  const queryParams = new URLSearchParams(location.search);
  const [searchQuery, setSearchQuery] = useState(queryParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(fixedCategorySlug || queryParams.get('category') || '');
  const [selectedBrand, setSelectedBrand] = useState(queryParams.get('brand') || '');
  const [minPrice, setMinPrice] = useState(queryParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(queryParams.get('max_price') || '');
  const [inStockOnly, setInStockOnly] = useState(queryParams.get('in_stock') === 'true');
  const [selectedRating, setSelectedRating] = useState(queryParams.get('rating') || '');
  const [sortBy, setSortBy] = useState(queryParams.get('sort') || 'relevance');

  // Load categories
  useEffect(() => {
    api.categories.getAll()
      .then(res => {
        if (Array.isArray(res?.categories)) {
          setCategories(res.categories);
        }
      })
      .catch(() => {});
  }, []);

  // Sync state with URL params
  useEffect(() => {
    const q = queryParams.get('q') || '';
    const cat = fixedCategorySlug || queryParams.get('category') || '';
    const br = queryParams.get('brand') || '';
    const minP = queryParams.get('min_price') || '';
    const maxP = queryParams.get('max_price') || '';
    const stock = queryParams.get('in_stock') === 'true';
    const rat = queryParams.get('rating') || '';
    const s = queryParams.get('sort') || 'relevance';

    setSearchQuery(q);
    setSelectedCategory(cat);
    setSelectedBrand(br);
    setMinPrice(minP);
    setMaxPrice(maxP);
    setInStockOnly(stock);
    setSelectedRating(rat);
    setSortBy(s);

    fetchProducts({
      q,
      category: cat,
      brand: br,
      min_price: minP ? parseFloat(minP) : undefined,
      max_price: maxP ? parseFloat(maxP) : undefined,
      in_stock: stock,
      rating: rat ? parseFloat(rat) : undefined,
      sort: s
    });
  }, [location.search, fixedCategorySlug]);

  const fetchProducts = async (filters: any) => {
    try {
      setIsLoading(true);
      const res = await api.products.getAll({
        ...filters,
        limit: 48
      });
      setProducts(Array.isArray(res?.products) ? res.products : []);
      setTotalProducts(res?.pagination?.total || (Array.isArray(res?.products) ? res.products.length : 0));
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time Live Catalog Synchronization
  useCatalogSync(() => {
    fetchProducts({
      q: searchQuery,
      category: selectedCategory,
      brand: selectedBrand,
      min_price: minPrice ? parseFloat(minPrice) : undefined,
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
      in_stock: inStockOnly,
      rating: selectedRating ? parseFloat(selectedRating) : undefined,
      sort: sortBy
    });
  }, [searchQuery, selectedCategory, selectedBrand, minPrice, maxPrice, inStockOnly, selectedRating, sortBy]);

  const applyFilters = (updates: Record<string, string | boolean | undefined>) => {
    const params = new URLSearchParams(location.search);

    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined || val === '' || val === false) {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });

    if (fixedCategorySlug) {
      navigate(`/category/${fixedCategorySlug}?${params.toString()}`);
    } else {
      navigate(`/products?${params.toString()}`);
    }
  };

  const clearAllFilters = () => {
    if (fixedCategorySlug) {
      navigate(`/category/${fixedCategorySlug}`);
    } else {
      navigate('/products');
    }
  };

  const brandsList = ['VK Technology', 'Arduino Compatible', 'Espressif Systems', 'Raspberry Pi Foundation', 'Ai-Thinker', 'TowerPro', 'Orange RC'];

  const currentCategory = categories.find(c => c.slug === selectedCategory);
  const displayTitle = categoryTitle || currentCategory?.name || (searchQuery ? `Search results for "${searchQuery}"` : 'All DIY Products');

  return (
    <div className="bg-[#eaeded] min-h-screen py-4 sm:py-6">
      <div className="max-w-[1500px] mx-auto px-2 sm:px-4">
        {/* Breadcrumb Bar */}
        <div className="text-xs text-gray-500 mb-3 flex items-center space-x-1">
          <Link to="/" className="hover:underline hover:text-gray-800">Home</Link>
          <span>›</span>
          <Link to="/products" className="hover:underline hover:text-gray-800">Products</Link>
          {selectedCategory && (
            <>
              <span>›</span>
              <span className="font-semibold text-gray-900">{currentCategory?.name || selectedCategory}</span>
            </>
          )}
        </div>

        {/* Top Header / Result summary */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
              {displayTitle}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Showing {products.length} of {totalProducts} items available for delivery in India
            </p>
          </div>

          {/* Sort selector & Mobile filter toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded text-xs font-bold flex items-center space-x-1.5 border border-gray-300"
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
            </button>

            <div className="flex items-center space-x-1.5 text-xs text-gray-700">
              <span className="font-semibold text-gray-500 hidden sm:inline">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  applyFilters({ sort: e.target.value });
                }}
                className="bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-medium py-1.5 px-2.5 rounded cursor-pointer focus:outline-none"
              >
                <option value="relevance">Featured / Relevance</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
                <option value="bestselling">Best Sellers</option>
                <option value="rating">Customer Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex gap-4 items-start">
          {/* Desktop Left Sidebar Filters */}
          <aside className="hidden lg:block w-64 bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-xs shrink-0 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <span className="font-bold text-sm text-gray-900 flex items-center">
                <Filter size={15} className="mr-1.5 text-amber-500" />
                Filters
              </span>
              <button
                onClick={clearAllFilters}
                className="text-vk-blue hover:underline text-[11px] font-semibold"
              >
                Clear all
              </button>
            </div>

            {/* Category Filter (if not fixed) */}
            {!fixedCategorySlug && (
              <div className="mb-5">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide mb-2">
                  Category
                </h4>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  <button
                    onClick={() => applyFilters({ category: undefined })}
                    className={`block w-full text-left py-1 px-1 rounded transition text-xs ${
                      !selectedCategory ? 'font-bold text-amber-700 bg-amber-50' : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    All Categories
                  </button>
                  {(categories ?? []).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => applyFilters({ category: cat.slug })}
                      className={`block w-full text-left py-1 px-1 rounded transition text-xs flex justify-between ${
                        selectedCategory === cat.slug
                          ? 'font-bold text-amber-700 bg-amber-50'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      {cat.product_count !== undefined && (
                        <span className="text-[10px] text-gray-400">({cat.product_count})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price Filter */}
            <div className="mb-5 border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide mb-2">
                Price Range (₹)
              </h4>
              <div className="space-y-1.5 mb-3">
                <button
                  onClick={() => applyFilters({ min_price: undefined, max_price: '250' })}
                  className="block text-left py-0.5 text-gray-700 hover:text-amber-600"
                >
                  Under ₹250
                </button>
                <button
                  onClick={() => applyFilters({ min_price: '250', max_price: '500' })}
                  className="block text-left py-0.5 text-gray-700 hover:text-amber-600"
                >
                  ₹250 - ₹500
                </button>
                <button
                  onClick={() => applyFilters({ min_price: '500', max_price: '1000' })}
                  className="block text-left py-0.5 text-gray-700 hover:text-amber-600"
                >
                  ₹500 - ₹1,000
                </button>
                <button
                  onClick={() => applyFilters({ min_price: '1000', max_price: undefined })}
                  className="block text-left py-0.5 text-gray-700 hover:text-amber-600"
                >
                  Over ₹1,000
                </button>
              </div>

              {/* Custom Min / Max inputs */}
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                />
                <button
                  onClick={() => applyFilters({ min_price: minPrice, max_price: maxPrice })}
                  className="bg-amber-400 hover:bg-amber-500 font-bold px-2 py-1 rounded text-gray-900"
                >
                  Go
                </button>
              </div>
            </div>

            {/* Availability */}
            <div className="mb-5 border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide mb-2">
                Availability
              </h4>
              <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    applyFilters({ in_stock: e.target.checked });
                  }}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Include In Stock Only</span>
              </label>
            </div>

            {/* Brand Filter */}
            <div className="mb-5 border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide mb-2">
                Brand & Manufacturer
              </h4>
              <div className="space-y-1">
                {brandsList.map((b) => (
                  <label key={b} className="flex items-center space-x-2 text-gray-700 cursor-pointer py-0.5">
                    <input
                      type="radio"
                      name="brand"
                      checked={selectedBrand === b}
                      onChange={() => {
                        setSelectedBrand(b);
                        applyFilters({ brand: b });
                      }}
                      className="text-amber-500 focus:ring-amber-400"
                    />
                    <span className="truncate">{b}</span>
                  </label>
                ))}
                {selectedBrand && (
                  <button
                    onClick={() => {
                      setSelectedBrand('');
                      applyFilters({ brand: undefined });
                    }}
                    className="text-[11px] text-amber-600 hover:underline pt-1 block"
                  >
                    Clear brand filter
                  </button>
                )}
              </div>
            </div>

            {/* Customer Rating */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide mb-2">
                Customer Rating
              </h4>
              <div className="space-y-1.5">
                {[4, 3, 2].map((stars) => (
                  <button
                    key={stars}
                    onClick={() => applyFilters({ rating: String(stars) })}
                    className={`flex items-center space-x-1.5 text-xs py-0.5 ${
                      selectedRating === String(stars) ? 'font-bold text-amber-700' : 'text-gray-700 hover:text-amber-600'
                    }`}
                  >
                    <StarRating rating={stars} size={13} />
                    <span>& Up</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse space-y-3">
                    <div className="bg-gray-200 aspect-square rounded" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded mt-4" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white p-8 sm:p-12 rounded-lg border border-gray-200 text-center max-w-lg mx-auto shadow-sm">
                <Search size={48} className="text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  No matching products found
                </h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  We couldn't find any products matching your current filters or search terms. Try loosening your criteria or explore our popular categories.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={clearAllFilters}
                    className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold px-4 py-2 rounded text-xs transition"
                  >
                    Clear All Filters
                  </button>
                  <Link
                    to="/products"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded text-xs transition"
                  >
                    Browse All Products
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
                {(products ?? []).map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="relative ml-auto w-80 max-w-full bg-white h-full shadow-2xl p-5 overflow-y-auto text-xs z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
                <h3 className="font-bold text-sm text-gray-900">Filter Products</h3>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Price */}
              <div className="mb-4">
                <h4 className="font-bold mb-2 text-gray-800">Price Presets</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      applyFilters({ min_price: undefined, max_price: '250' });
                      setIsMobileFilterOpen(false);
                    }}
                    className="border border-gray-200 p-2 rounded text-left hover:bg-amber-50"
                  >
                    Under ₹250
                  </button>
                  <button
                    onClick={() => {
                      applyFilters({ min_price: '250', max_price: '500' });
                      setIsMobileFilterOpen(false);
                    }}
                    className="border border-gray-200 p-2 rounded text-left hover:bg-amber-50"
                  >
                    ₹250 - ₹500
                  </button>
                  <button
                    onClick={() => {
                      applyFilters({ min_price: '500', max_price: '1000' });
                      setIsMobileFilterOpen(false);
                    }}
                    className="border border-gray-200 p-2 rounded text-left hover:bg-amber-50"
                  >
                    ₹500 - ₹1000
                  </button>
                  <button
                    onClick={() => {
                      applyFilters({ min_price: '1000', max_price: undefined });
                      setIsMobileFilterOpen(false);
                    }}
                    className="border border-gray-200 p-2 rounded text-left hover:bg-amber-50"
                  >
                    Over ₹1000
                  </button>
                </div>
              </div>

              {/* In stock */}
              <div className="mb-4">
                <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => {
                      setInStockOnly(e.target.checked);
                      applyFilters({ in_stock: e.target.checked });
                    }}
                    className="rounded text-amber-500"
                  />
                  <span>Show In-Stock Products Only</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => {
                  clearAllFilters();
                  setIsMobileFilterOpen(false);
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 rounded"
              >
                Reset
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-2 rounded"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
