export type UserRole = 'admin' | 'customer' | 'SUPER_ADMIN' | 'PRODUCT_MANAGER' | 'ORDER_MANAGER' | 'INVENTORY_MANAGER';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  created_at?: string;
}

export interface Address {
  id?: number;
  user_id?: number;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postal_code: string;
  is_default?: boolean;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: number | boolean;
  product_count?: number;
}

export interface ProductImage {
  id: number;
  image_url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: number | boolean;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  sku: string;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  subcategory?: string | null;
  short_description?: string | null;
  description: string;
  regular_price: number;
  discounted_price?: number | null;
  stock_quantity: number;
  brand?: string;
  specifications?: Record<string, string>;
  specifications_json?: string;
  features?: string[];
  features_json?: string;
  compatibility?: string | null;
  package_contents?: string[];
  package_contents_json?: string;
  shipping_weight_grams?: number;
  estimated_dispatch_days?: number;
  warranty_info?: string;
  is_featured: number | boolean;
  is_active: number | boolean;
  view_count?: number;
  rating_avg: number;
  rating_count: number;
  primary_image?: string;
  images?: ProductImage[];
  reviews?: Review[];
  relatedProducts?: Product[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
}

export interface CartItem {
  cart_item_id?: number;
  product_id: number;
  name: string;
  slug: string;
  sku: string;
  price: number;
  regular_price: number;
  discounted_price?: number | null;
  stock_quantity: number;
  quantity: number;
  image_url: string;
  total: number;
}

export interface Coupon {
  id: number;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount_amount?: number | null;
  discount_amount?: number;
  usage_limit?: number | null;
  times_used?: number;
  start_date?: string | null;
  expiry_date?: string | null;
  is_active?: number | boolean;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number | null;
  product_name: string;
  product_sku: string;
  product_image?: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface Order {
  id: number;
  order_number: string;
  user_id?: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address_json: string;
  shipping_address?: Address;
  subtotal: number;
  discount_amount: number;
  coupon_code?: string | null;
  shipping_fee: number;
  tax_amount: number;
  total_amount: number;
  payment_method: 'razorpay' | 'cod' | 'upi_qr';
  payment_status: 'Pending Payment' | 'Pending Verification' | 'Paid' | 'Failed' | 'Refunded';
  order_status: 'Pending Payment' | 'Confirmed' | 'Processing' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered';
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  tracking_number?: string | null;
  notes?: string | null;
  utr_number?: string | null;
  payment_screenshot?: string | null;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
  total_items?: number;
}

export interface UpiPayment {
  id: number;
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  amount: number;
  utr_number: string;
  screenshot_url?: string | null;
  status: 'Pending Verification' | 'Approved' | 'Rejected';
  admin_notes?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at?: string;
  order_status?: string;
}

export interface Review {
  id: number;
  product_id: number;
  product_name?: string;
  product_slug?: string;
  user_id?: number | null;
  customer_name: string;
  rating: number;
  title?: string | null;
  comment: string;
  is_verified_purchase: number | boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Banner {
  id: number;
  title: string;
  subtitle?: string | null;
  image_url: string;
  link_url: string;
  button_text: string;
  display_order: number;
  is_active: number | boolean;
}

export interface StoreSettings {
  store_name?: string;
  owner_email?: string;
  owner_name?: string;
  business_phone?: string;
  business_address?: string;
  currency_code?: string;
  currency_symbol?: string;
  standard_shipping_fee?: string;
  free_shipping_threshold?: string;
  cod_available?: string;
  cod_fee?: string;
  estimated_dispatch?: string;
  support_hours?: string;
  announcement_text?: string;
  owner_whatsapp_number?: string;
  upi_qr_enabled?: string;
  upi_id?: string;
  upi_payee_name?: string;
  upi_qr_image_url?: string;
  [key: string]: string | undefined;
}

export interface ProjectComponent {
  id?: number;
  project_id?: number;
  product_id?: number | null;
  product_slug?: string | null;
  discounted_price?: number | null;
  regular_price?: number | null;
  stock_quantity?: number | null;
  name: string;
  quantity: number;
  notes?: string | null;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  short_description?: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimated_time: string;
  image_url: string;
  circuit_diagram_url?: string;
  code_url?: string;
  youtube_url?: string;
  view_count?: number;
  is_featured: number | boolean;
  is_active: number | boolean;
  components?: ProjectComponent[];
  component_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AppItem {
  id: number;
  slug: string;
  name: string;
  short_description?: string;
  description: string;
  platform: string;
  status: 'Live' | 'Beta' | 'Coming Soon';
  version: string;
  icon?: string;
  image_url: string;
  download_url?: string;
  play_store_url?: string;
  web_url?: string;
  features?: string[];
  features_json?: string;
  sort_order: number;
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
}
