import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Printer,
  AlertTriangle,
  MapPin,
  User,
  ShoppingBag,
  Info,
  QrCode,
  Copy,
  Check,
  Upload,
  Clock,
  Smartphone,
  Sparkles,
  Trash2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Address } from '../types';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    items,
    subtotal,
    appliedCoupon,
    discountAmount,
    shippingFee: baseShippingFee,
    clearCart
  } = useCart();

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | null>(null);

  // Form fields
  const [customerName, setCustomerName] = useState(user?.full_name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');

  // Address fields
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Andhra Pradesh');
  const [postalCode, setPostalCode] = useState(() => localStorage.getItem('vk_user_pincode') || '500001');
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(false);

  // UPI QR Code State
  const [upiConfig, setUpiConfig] = useState<{
    enabled: boolean;
    upi_id: string;
    payee_name: string;
    qr_image_url: string;
    owner_whatsapp: string;
  }>({
    enabled: true,
    upi_id: '8555997052@ibl',
    payee_name: 'Mr Suroju Jnana Venkata Karthik',
    qr_image_url: '/upi-qr-code.jpg',
    owner_whatsapp: '+91 8555997052'
  });
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [qrMode, setQrMode] = useState<'dynamic' | 'standee'>('dynamic');

  // YouPI-PG style 5:00 countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'upi_qr' | 'razorpay' | 'cod'>('upi_qr');
  const [orderNotes, setOrderNotes] = useState('');

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Confirmation state
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [mockPaymentModalOpen, setMockPaymentModalOpen] = useState(false);
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState<any>(null);

  useEffect(() => {
    if (user) {
      api.auth.getAddresses().then(res => {
        setSavedAddresses(res.addresses || []);
        if (res.addresses && res.addresses.length > 0) {
          const defaultAddr = res.addresses.find((a: any) => a.is_default) || res.addresses[0];
          applyAddress(defaultAddr);
        }
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    api.upi.getConfig().then(cfg => {
      if (cfg) {
        setUpiConfig({
          enabled: cfg.enabled !== false,
          upi_id: cfg.upi_id || '8555997052@ibl',
          payee_name: cfg.payee_name || 'Mr Suroju Jnana Venkata Karthik',
          qr_image_url: cfg.qr_image_url || '/upi-qr-code.jpg',
          owner_whatsapp: cfg.owner_whatsapp || '+91 8555997052'
        });
      }
    }).catch(() => {});
  }, []);

  const handleCopyUpi = () => {
    if (upiConfig.upi_id) {
      navigator.clipboard.writeText(upiConfig.upi_id);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingScreenshot(true);
      try {
        const res = await api.upload.single(file);
        if (res.url) {
          setPaymentScreenshot(res.url);
          return;
        }
      } catch (backendErr) {
        // Fallback: convert to Base64 Data URL for instant offline preview & attachment
        const reader = new FileReader();
        reader.onload = (uploadEvt) => {
          if (uploadEvt.target?.result) {
            setPaymentScreenshot(uploadEvt.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      alert('Could not attach payment screenshot.');
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  function applyAddress(addr: Address) {
    setCustomerName(addr.full_name);
    setCustomerPhone(addr.phone);
    setAddressLine1(addr.address_line1);
    setAddressLine2(addr.address_line2 || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city);
    setStateName(addr.state);
    setPostalCode(addr.postal_code);
  }

  if (items.length === 0 && !confirmedOrder) {
    return (
      <div className="bg-[#eaeded] min-h-screen py-12 text-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <ShoppingBag size={48} className="text-gray-300 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is currently empty</h2>
          <p className="text-xs text-gray-500 mb-6">Add items to your cart before proceeding to checkout.</p>
          <Link
            to="/products"
            className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold px-6 py-2.5 rounded text-xs"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  // Calculate final amounts
  const codFee = paymentMethod === 'cod' ? 40 : 0;
  const shippingFee = baseShippingFee + codFee;
  const finalPayable = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName || !customerEmail || !customerPhone || !addressLine1 || !city || !stateName || !postalCode) {
      setErrorMsg('Please complete all required customer and delivery address fields.');
      return;
    }

    if (postalCode.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit Indian postal PIN code.');
      return;
    }

    if (paymentMethod === 'upi_qr') {
      const cleanUtr = utrNumber.trim();
      if (!cleanUtr) {
        setErrorMsg('Please enter your 12-digit UPI Reference / UTR Number after completing payment.');
        return;
      }
      if (cleanUtr.length < 6) {
        setErrorMsg('Please enter a valid UPI transaction reference or UTR number.');
        return;
      }
    }

    const shippingAddress = {
      full_name: customerName.trim(),
      phone: customerPhone.trim(),
      address_line1: addressLine1.trim(),
      address_line2: addressLine2.trim() || undefined,
      landmark: landmark.trim() || undefined,
      city: city.trim(),
      state: stateName.trim(),
      postal_code: postalCode.trim()
    };

    // Optionally save address
    if (user && saveAddressToAccount) {
      api.auth.addAddress({ ...shippingAddress, is_default: false }).catch(() => {});
    }

    try {
      setIsSubmitting(true);

      const orderPayload = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim().toLowerCase(),
        customer_phone: customerPhone.trim(),
        shipping_address: shippingAddress,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        coupon_code: appliedCoupon?.code,
        payment_method: paymentMethod,
        utr_number: paymentMethod === 'upi_qr' ? utrNumber.trim() : undefined,
        payment_screenshot: paymentMethod === 'upi_qr' && paymentScreenshot ? paymentScreenshot : undefined,
        notes: orderNotes.trim() || undefined
      };

      const res = await api.orders.create(orderPayload);
      const createdOrder = res.order;

      if (paymentMethod === 'upi_qr') {
        // UPI QR payment recorded: Pending Verification
        await clearCart();
        setConfirmedOrder({
          ...createdOrder,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_address: shippingAddress,
          items: [...items],
          subtotal,
          discount_amount: discountAmount,
          shipping_fee: shippingFee,
          total_amount: finalPayable,
          payment_method: 'UPI QR Code',
          payment_status: 'Pending Verification',
          utr_number: utrNumber.trim(),
          payment_screenshot: paymentScreenshot
        });

        if (res.notifications?.whatsappFallbackLink) {
          setWhatsappLink(res.notifications.whatsappFallbackLink);
        } else {
          const cleanOwner = (upiConfig.owner_whatsapp || '+91 8555997052').replace(/[^0-9]/g, '') || '918555997052';
          const msg = `Hello VK Technology,\nI placed order #${createdOrder.order_number} for ₹${finalPayable} via UPI QR.\nMy UTR: ${utrNumber.trim()}\nCustomer: ${customerName} (${customerPhone}).\nPlease verify my payment.`;
          setWhatsappLink(`https://api.whatsapp.com/send?phone=${cleanOwner}&text=${encodeURIComponent(msg)}`);
        }

        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      } else if (paymentMethod === 'cod') {
        // Cash on delivery completed
        await clearCart();
        setConfirmedOrder({
          ...createdOrder,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_address: shippingAddress,
          items: [...items],
          subtotal,
          discount_amount: discountAmount,
          shipping_fee: shippingFee,
          total_amount: finalPayable,
          payment_method: 'Cash on Delivery (COD)'
        });

        if (res.notifications?.whatsappFallbackLink) {
          setWhatsappLink(res.notifications.whatsappFallbackLink);
        }

        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } else {
        // Online Payment via Razorpay
        setPendingPaymentOrder({
          order_id: createdOrder.id,
          order_number: createdOrder.order_number,
          total_amount: finalPayable,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_address: shippingAddress
        });

        // Initialize Razorpay order on server
        const rzpRes = await api.orders.createRazorpayOrder(createdOrder.id);

        if (rzpRes.is_mock) {
          // No live Razorpay keys configured: show safe sandbox modal
          setMockPaymentModalOpen(true);
        } else {
          // Open official Razorpay modal
          launchRazorpayCheckout(rzpRes, createdOrder.id, shippingAddress);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order. Please review your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const launchRazorpayCheckout = (rzpData: any, orderId: number, shippingAddress: any) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      const options = {
        key: rzpData.key,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: 'VK Technology',
        description: `Order #${rzpData.order_number}`,
        order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await api.orders.verifyPayment({
              order_id: orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              is_mock: false
            });

            await clearCart();
            setConfirmedOrder({
              order_number: rzpData.order_number,
              customer_name: customerName,
              customer_email: customerEmail,
              customer_phone: customerPhone,
              shipping_address: shippingAddress,
              items: [...items],
              subtotal,
              discount_amount: discountAmount,
              shipping_fee: shippingFee,
              total_amount: finalPayable,
              payment_method: 'Online Payment (Razorpay)',
              payment_status: 'Paid'
            });

            if (verifyRes.notifications?.whatsappFallbackLink) {
              setWhatsappLink(verifyRes.notifications.whatsappFallbackLink);
            }

            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          } catch (e: any) {
            alert(e.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone
        },
        theme: {
          color: '#131921'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };
    document.body.appendChild(script);
  };

  const handleSimulatePayment = async (success: boolean) => {
    if (!pendingPaymentOrder) return;

    if (!success) {
      setMockPaymentModalOpen(false);
      setErrorMsg('Payment simulation was cancelled/failed. You can retry payment.');
      return;
    }

    try {
      setIsSubmitting(true);
      const verifyRes = await api.orders.verifyPayment({
        order_id: pendingPaymentOrder.order_id,
        razorpay_order_id: `rzp_mock_${Date.now()}`,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        is_mock: true
      });

      await clearCart();
      setMockPaymentModalOpen(false);
      setConfirmedOrder({
        order_number: pendingPaymentOrder.order_number,
        customer_name: pendingPaymentOrder.customer_name,
        customer_email: pendingPaymentOrder.customer_email,
        customer_phone: pendingPaymentOrder.customer_phone,
        shipping_address: pendingPaymentOrder.shipping_address,
        items: [...items],
        subtotal,
        discount_amount: discountAmount,
        shipping_fee: shippingFee,
        total_amount: finalPayable,
        payment_method: 'Razorpay UPI/Netbanking (Test Sandbox)',
        payment_status: 'Paid'
      });

      if (verifyRes.notifications?.whatsappFallbackLink) {
        setWhatsappLink(verifyRes.notifications.whatsappFallbackLink);
      }

      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (e: any) {
      setErrorMsg(e.message || 'Payment verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order Confirmed Screen
  if (confirmedOrder) {
    return (
      <div className="bg-[#eaeded] min-h-screen py-8 sm:py-12 text-left">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center space-x-3 text-emerald-700 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={30} className="text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Thank you! Your order has been placed.
                </h1>
                <p className="text-xs text-emerald-800 font-semibold">
                  Confirmation sent to {confirmedOrder.customer_email} and karthik.suroju@gmail.com
                </p>
              </div>
            </div>

            {/* Order Highlight Box */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block">Order Number:</span>
                <strong className="text-sm font-mono text-gray-900">{confirmedOrder.order_number}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Payment Method:</span>
                <strong className="text-gray-900">{confirmedOrder.payment_method}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Total Amount:</span>
                <strong className="text-sm text-vk-price">₹{confirmedOrder.total_amount?.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            {/* UPI Verification Pending Box */}
            {confirmedOrder.payment_status === 'Pending Verification' && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-purple-900 font-bold text-sm">
                  <Clock size={18} className="text-purple-600" />
                  <span>Payment Verification Pending</span>
                </div>
                <p className="text-purple-800 leading-relaxed">
                  Thank you! Your payment details (UTR: <strong className="font-mono bg-purple-100 px-1 py-0.5 rounded">{confirmedOrder.utr_number}</strong>) have been submitted.
                  Our team is verifying the payment against bank records. Once verified by the store owner, your order status will be updated to Confirmed.
                </p>
                {confirmedOrder.payment_screenshot && (
                  <div className="pt-1">
                    <span className="text-gray-500 block mb-1">Attached Payment Screenshot:</span>
                    <img src={confirmedOrder.payment_screenshot} alt="Payment Proof" className="w-20 h-20 object-cover rounded border shadow-sm" />
                  </div>
                )}
              </div>
            )}

            {/* Delivery Details */}
            <div className="border border-gray-200 rounded p-4 text-xs space-y-1">
              <span className="font-bold text-gray-800 block text-sm mb-1">Shipping & Delivery Address:</span>
              <p className="text-gray-700 font-semibold">{confirmedOrder.shipping_address?.full_name}</p>
              <p className="text-gray-600">
                {confirmedOrder.shipping_address?.address_line1} {confirmedOrder.shipping_address?.address_line2 || ''}
              </p>
              <p className="text-gray-600">
                {confirmedOrder.shipping_address?.city}, {confirmedOrder.shipping_address?.state} - {confirmedOrder.shipping_address?.postal_code}
              </p>
              <p className="text-gray-600">Phone: {confirmedOrder.customer_phone}</p>
            </div>

            {/* WhatsApp Fallback Button */}
            {whatsappLink && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-emerald-900">
                  <strong>Send WhatsApp Confirmation:</strong> Keep your order receipt on your phone and share details directly with the owner on WhatsApp (+91 8555997052).
                </div>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded flex items-center space-x-1.5 shadow shrink-0"
                >
                  <span>Open WhatsApp</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/orders"
                className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-5 py-2.5 rounded text-xs shadow transition"
              >
                View Your Orders
              </Link>
              <Link
                to="/products"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-5 py-2.5 rounded text-xs transition"
              >
                Continue Shopping
              </Link>
              <button
                onClick={() => window.print()}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded text-xs flex items-center space-x-1 ml-auto"
              >
                <Printer size={14} />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#eaeded] min-h-screen py-4 sm:py-6 text-left">
      <div className="max-w-[1300px] mx-auto px-2 sm:px-4">
        {/* Header Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock size={20} className="text-emerald-600" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              Checkout & Secure Order Placement
            </h1>
          </div>
          <span className="text-xs text-gray-500 hidden sm:inline">
            100% Purchase Protection • VK Technology Secure Checkout
          </span>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded-md text-xs mb-4 flex items-center">
            <AlertTriangle size={16} className="mr-2 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Checkout Form (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Step 1: Customer Contact Details */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 font-bold text-sm text-gray-900 mb-3 border-b border-gray-100 pb-2">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-gray-950 flex items-center justify-center text-xs">1</span>
                <span>Customer Contact Information</span>
                {!user && (
                  <span className="text-[11px] text-gray-500 font-normal ml-auto">
                    Guest checkout enabled
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Karthik Suroju"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Email Address (for Invoice) *</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phone Number (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Address */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 font-bold text-sm text-gray-900 mb-3 border-b border-gray-100 pb-2">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-gray-950 flex items-center justify-center text-xs">2</span>
                <span>Delivery / Shipping Address</span>
              </div>

              {/* Saved addresses selector */}
              {savedAddresses.length > 0 && (
                <div className="mb-4 space-y-2 text-xs">
                  <span className="font-semibold text-gray-700 block">Select from saved addresses:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {savedAddresses.map((addr, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedAddressIndex(idx);
                          applyAddress(addr);
                        }}
                        className={`p-3 border rounded cursor-pointer transition ${
                          selectedAddressIndex === idx
                            ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-400'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <strong className="block text-gray-900">{addr.full_name} ({addr.phone})</strong>
                        <p className="text-gray-600 line-clamp-1">{addr.address_line1}, {addr.city}</p>
                        <span className="text-[11px] text-gray-500 font-mono">PIN: {addr.postal_code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Flat, House no., Building, Company, Apartment *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Door No. 3-45, Main Road"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Area, Street, Sector, Village
                    </label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="Apartment, suite, unit, building, floor"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="Near College / Hospital / Park"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">City / Town *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City / District"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">State *</label>
                    <select
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white focus:outline-none"
                    >
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Kerala">Kerala</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="West Bengal">West Bengal</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Other State">Other Indian State</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">6-digit PIN Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="534204"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-semibold tracking-wider focus:outline-none"
                    />
                  </div>
                </div>

                {user && (
                  <label className="flex items-center space-x-2 pt-1 text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAddressToAccount}
                      onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                      className="rounded text-amber-500"
                    />
                    <span>Save this address to my account for future orders</span>
                  </label>
                )}
              </div>
            </div>

            {/* Step 3: Payment Method */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 font-bold text-sm text-gray-900 mb-3 border-b border-gray-100 pb-2">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-gray-950 flex items-center justify-center text-xs">3</span>
                <span>Payment Method</span>
              </div>

              <div className="space-y-3 text-xs">
                {/* 1. UPI QR Code Payment */}
                <div className={`border rounded-lg transition overflow-hidden ${
                  paymentMethod === 'upi_qr' ? 'border-purple-500 bg-purple-50/20 ring-1 ring-purple-400' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <label className="p-3.5 flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value="upi_qr"
                      checked={paymentMethod === 'upi_qr'}
                      onChange={() => setPaymentMethod('upi_qr')}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-gray-900 text-sm flex items-center gap-1.5">
                          <QrCode size={16} className="text-purple-600" />
                          <span>Direct UPI QR Code (PhonePe / Google Pay / Paytm / BHIM)</span>
                        </strong>
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          Recommended • Zero Surcharge
                        </span>
                      </div>
                      <p className="text-gray-500 mt-0.5">
                        Scan the official PhonePe QR code directly using any UPI app on your phone.
                      </p>
                    </div>
                  </label>

                  {/* Dedicated UPI QR Code Section */}
                  {paymentMethod === 'upi_qr' && (
                    <div className="px-4 pb-6 pt-3 border-t border-purple-100 bg-white space-y-4">
                      {/* YouPI Gateway Active Status & Expiry Bar */}
                      <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 text-white px-3.5 py-2.5 rounded-lg text-xs font-medium gap-2 shadow-sm">
                        <div className="flex items-center space-x-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span className="font-bold text-white tracking-wide flex items-center gap-1.5">
                            <span>YouPI Direct Gateway</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">0% Fee</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 font-mono text-amber-300 font-bold text-xs bg-slate-800 px-2.5 py-1 rounded">
                          <Clock size={13} className="text-amber-400 animate-pulse" />
                          <span>Session window: {formatTimer(timerSeconds)}</span>
                        </div>
                      </div>

                      {/* Top Payee and Amount Banner */}
                      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
                        <div>
                          <span className="text-gray-500 block text-[11px] uppercase tracking-wider font-semibold">Payee Account:</span>
                          <strong className="text-gray-900 text-base block">{upiConfig.payee_name || 'Mr Suroju Jnana Venkata Karthik'}</strong>
                          <span className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                            <ShieldCheck size={13} className="text-emerald-600" /> NPCI Verified Merchant: VK Technology
                          </span>
                        </div>
                        <div className="text-center sm:text-right bg-white sm:bg-transparent px-4 py-2 rounded-lg sm:p-0 border sm:border-0 border-purple-200 w-full sm:w-auto">
                          <span className="text-gray-500 block text-[11px] uppercase tracking-wider font-semibold">Exact Amount Payable:</span>
                          <strong className="text-2xl font-black text-purple-700">₹{finalPayable.toLocaleString('en-IN')}</strong>
                          <span className="block text-[10px] text-emerald-600 font-bold">No gateway convenience fee</span>
                        </div>
                      </div>

                      {/* QR Mode Switcher Tabs */}
                      <div className="flex items-center justify-center p-1 bg-gray-100 rounded-lg max-w-sm mx-auto text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setQrMode('dynamic')}
                          className={`flex-1 py-1.5 px-3 rounded-md transition text-center cursor-pointer ${
                            qrMode === 'dynamic'
                              ? 'bg-white text-purple-700 shadow-sm font-bold'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          ⚡ Dynamic QR (Amount Pre-filled)
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrMode('standee')}
                          className={`flex-1 py-1.5 px-3 rounded-md transition text-center cursor-pointer ${
                            qrMode === 'standee'
                              ? 'bg-white text-purple-700 shadow-sm font-bold'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          🏪 Store Standee QR
                        </button>
                      </div>

                      {/* QR Display Card */}
                      <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-gray-50 to-white rounded-2xl border-2 border-purple-200 shadow-sm space-y-4">
                        <div className="relative bg-white p-3 rounded-xl border border-gray-200 shadow-md">
                          {qrMode === 'dynamic' ? (
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
                                `upi://pay?pa=${upiConfig.upi_id || '8555997052@ibl'}&pn=${encodeURIComponent(
                                  upiConfig.payee_name || 'Mr Suroju Jnana Venkata Karthik'
                                )}&am=${finalPayable}&cu=INR&tn=${encodeURIComponent('VK Technology Order')}`
                              )}`}
                              alt="Dynamic YouPI Pre-filled QR Code"
                              className="w-56 sm:w-64 h-56 sm:h-64 object-contain rounded-lg"
                            />
                          ) : (
                            <img
                              src={upiConfig.qr_image_url || '/upi-qr-code.jpg'}
                              alt="VK Technology PhonePe UPI Standee QR Code"
                              className="w-56 sm:w-64 h-auto max-h-80 object-contain rounded-lg"
                            />
                          )}
                          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow tracking-wider uppercase">
                            {qrMode === 'dynamic' ? `₹${finalPayable} Auto-Filled` : 'Scan via Any UPI App'}
                          </div>
                        </div>

                        {/* UPI ID pill and copy button */}
                        <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-full px-4 py-1.5 text-xs shadow-sm mt-1">
                          <span className="text-gray-500 font-medium">VPA / UPI ID:</span>
                          <span className="font-mono font-bold text-gray-900 select-all">{upiConfig.upi_id || '8555997052@ibl'}</span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="ml-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1 rounded-full text-[11px] flex items-center space-x-1 shadow-sm transition active:scale-95 cursor-pointer"
                          >
                            {copiedUpi ? (
                              <>
                                <Check size={12} />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy UPI</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* 1-Click Mobile UPI App Launchers (YouPI-PG Intent Integration) */}
                        <div className="w-full max-w-md pt-2 space-y-2">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center block">
                            Or Tap to Pay Directly on Mobile:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {/* Google Pay */}
                            <a
                              href={`upi://pay?pa=${upiConfig.upi_id || '8555997052@ibl'}&pn=${encodeURIComponent(
                                upiConfig.payee_name || 'Mr Suroju Jnana Venkata Karthik'
                              )}&am=${finalPayable}&cu=INR&tn=VK%20Technology`}
                              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition active:scale-95"
                            >
                              <Smartphone size={13} /> GPay
                            </a>
                            {/* PhonePe */}
                            <a
                              href={`upi://pay?pa=${upiConfig.upi_id || '8555997052@ibl'}&pn=${encodeURIComponent(
                                upiConfig.payee_name || 'Mr Suroju Jnana Venkata Karthik'
                              )}&am=${finalPayable}&cu=INR&tn=VK%20Technology`}
                              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs transition active:scale-95"
                            >
                              <Smartphone size={13} /> PhonePe
                            </a>
                            {/* Paytm */}
                            <a
                              href={`upi://pay?pa=${upiConfig.upi_id || '8555997052@ibl'}&pn=${encodeURIComponent(
                                upiConfig.payee_name || 'Mr Suroju Jnana Venkata Karthik'
                              )}&am=${finalPayable}&cu=INR&tn=VK%20Technology`}
                              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold text-xs transition active:scale-95"
                            >
                              <Smartphone size={13} /> Paytm
                            </a>
                            {/* BHIM / Cred */}
                            <a
                              href={`upi://pay?pa=${upiConfig.upi_id || '8555997052@ibl'}&pn=${encodeURIComponent(
                                upiConfig.payee_name || 'Mr Suroju Jnana Venkata Karthik'
                              )}&am=${finalPayable}&cu=INR&tn=VK%20Technology`}
                              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition active:scale-95"
                            >
                              <QrCode size={13} /> Any UPI
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Step-by-Step Payment Instructions */}
                      <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 text-xs text-gray-800 space-y-1.5">
                        <span className="font-bold text-purple-950 block text-[12px] flex items-center gap-1">
                          <Sparkles size={14} className="text-purple-600" />
                          <span>How to Complete Payment via YouPI:</span>
                        </span>
                        <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-700">
                          <li>Scan the QR code with <strong>PhonePe, GPay, Paytm, BHIM, Cred</strong> or tap an app button above.</li>
                          <li>Pay the exact amount of <strong className="text-purple-700 font-bold">₹{finalPayable.toLocaleString('en-IN')}</strong>.</li>
                          <li>Find the <strong>12-digit UPI Reference Number / UTR</strong> on your payment receipt and enter it below.</li>
                        </ol>
                      </div>

                      {/* Required UTR Input Field with Real-Time Validation */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block font-bold text-gray-900 text-xs">
                            12-Digit UPI Transaction Reference / UTR Number *
                          </label>
                          <span className={`text-[11px] font-bold ${
                            /^\d{12}$/.test(utrNumber.trim())
                              ? 'text-emerald-600'
                              : utrNumber.trim().length > 0
                              ? 'text-amber-600'
                              : 'text-gray-400'
                          }`}>
                            {/^\d{12}$/.test(utrNumber.trim()) ? '✓ Valid 12-Digit UTR' : `(${utrNumber.trim().length}/12 digits)`}
                          </span>
                        </div>
                        <input
                          type="text"
                          required={paymentMethod === 'upi_qr'}
                          maxLength={24}
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                          placeholder="e.g. 428901234567"
                          className={`w-full px-3.5 py-2.5 border-2 rounded-xl text-sm font-mono font-bold tracking-wider text-gray-900 focus:outline-none shadow-sm transition ${
                            /^\d{12}$/.test(utrNumber.trim())
                              ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20'
                              : 'border-purple-300 focus:border-purple-600'
                          }`}
                        />
                        <p className="text-[10px] text-gray-500">
                          The UTR is displayed on your payment successful screen (e.g., "UPI Ref No: 428901234567").
                        </p>
                      </div>

                      {/* Payment Screenshot Upload with Instant Preview */}
                      <div className="space-y-2">
                        <label className="block font-bold text-gray-900 text-xs">
                          Upload Payment Screenshot (Optional for express priority dispatch)
                        </label>
                        {!paymentScreenshot ? (
                          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-purple-400 bg-gray-50 hover:bg-purple-50/30 p-3.5 rounded-xl cursor-pointer transition text-xs text-gray-700">
                            <Upload size={16} className="text-purple-600" />
                            <span className="font-semibold">{isUploadingScreenshot ? 'Attaching Screenshot...' : 'Click to Upload Payment Receipt / Screenshot'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleScreenshotUpload}
                              disabled={isUploadingScreenshot}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <img
                                src={paymentScreenshot}
                                alt="Payment proof preview"
                                className="w-12 h-12 object-cover rounded-lg border border-emerald-300"
                              />
                              <div>
                                <span className="font-bold text-emerald-900 text-xs block">Screenshot Attached ✓</span>
                                <a
                                  href={paymentScreenshot}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-purple-700 underline font-semibold"
                                >
                                  View Full Image
                                </a>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPaymentScreenshot('')}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                              title="Remove screenshot"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* YouPI Protocol Guarantee Notice */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 flex items-start space-x-2.5">
                        <ShieldCheck size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                        <div>
                          <strong className="text-slate-900 block font-semibold">YouPI Zero-Intermediary Protection:</strong>
                          <span>Your payment settles 100% directly into VK Technology's bank account without 3rd-party holding accounts. Once you click "Place Order", your receipt and tracking will be generated immediately.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Razorpay Online Gateway */}
                <label className={`p-3.5 border rounded-lg flex items-start space-x-3 cursor-pointer transition ${
                  paymentMethod === 'razorpay' ? 'border-amber-500 bg-amber-50/30 ring-1 ring-amber-400' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={() => setPaymentMethod('razorpay')}
                    className="mt-0.5 text-amber-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-gray-900 text-sm">Online Gateway (Cards / Net Banking / Razorpay)</strong>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Automated Gateway
                      </span>
                    </div>
                    <p className="text-gray-500 mt-1">
                      Pay instantly using Debit/Credit cards (Visa/Mastercard/RuPay) or 50+ Net Banking portals.
                    </p>
                  </div>
                </label>
              </div>

              {/* Order Notes */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Order / Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Deliver during college lab hours, call before arrival"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Order Review Box (4 cols) */}
          <div className="lg:col-span-4 bg-white p-5 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
              Order Items ({items.length})
            </h3>

            {/* Compact items list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((i) => (
                <div key={i.product_id} className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2 truncate">
                    <img src={i.image_url} alt={i.name} className="w-8 h-8 object-contain shrink-0 rounded bg-gray-50 border" />
                    <span className="truncate text-gray-700">{i.name}</span>
                    <span className="text-gray-400 text-[10px]">x{i.quantity}</span>
                  </div>
                  <span className="font-bold text-gray-900 shrink-0 ml-2">
                    ₹{(i.price * i.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 pt-3 border-t border-gray-100 text-xs text-gray-700">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount ({appliedCoupon.code}):</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Standard Delivery:</span>
                <span>
                  {baseShippingFee === 0 ? <strong className="text-emerald-700">FREE</strong> : `₹${baseShippingFee}`}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between text-base font-extrabold text-gray-900">
                <span>Total Payable:</span>
                <span className="text-vk-price">
                  ₹{finalPayable.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold py-3 rounded-md text-sm shadow transition flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Processing Order...</span>
              ) : (
                <>
                  <span>Place Order • ₹{finalPayable.toLocaleString('en-IN')}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="text-[11px] text-gray-500 space-y-1 pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
                <Truck size={13} />
                <span>Fast dispatch across India with tracking</span>
              </div>
              <p>By placing this order, you agree to VK Technology's terms of service and shipping policy.</p>
            </div>
          </div>
        </form>

        {/* Razorpay Sandbox Simulation Modal (when live keys are not configured yet) */}
        {mockPaymentModalOpen && pendingPaymentOrder && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl text-xs space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center space-x-2 text-amber-600 font-bold text-sm">
                <Info size={18} />
                <span>Razorpay Payment Simulation (Sandbox Test)</span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-gray-800 space-y-1">
                <p className="font-semibold">Notice for Store Admin / Developer:</p>
                <p className="text-[11px]">
                  Razorpay API keys (<code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code>) are not yet configured in <code>server/.env</code>.
                </p>
                <p className="text-[11px]">
                  To test end-to-end checkout and email/WhatsApp order generation right now, choose a simulated outcome below:
                </p>
              </div>

              <div className="border border-gray-200 rounded p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order ID:</span>
                  <span className="font-mono font-bold text-gray-900">{pendingPaymentOrder.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount Due:</span>
                  <span className="font-bold text-vk-price">₹{pendingPaymentOrder.total_amount?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSimulatePayment(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 rounded transition"
                >
                  Simulate Failure
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulatePayment(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded transition shadow"
                >
                  Simulate Success (Pay)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
