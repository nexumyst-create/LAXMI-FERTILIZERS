import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, ShieldCheck, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { DeliveryAddress, PaymentMethod } from '../../types';

export const CheckoutPage: React.FC = () => {
  const {
    firebaseUser,
    userProfile,
    setAuthModalOpen,
    cart,
    cartSubtotal,
    cartDiscount,
    cartDeliveryFee,
    cartGstTotal,
    cartGrandTotal,
    appliedCoupon,
    applyCouponCode,
    removeCoupon,
    placeOrder,
    navigate,
    showToast,
  } = useStore();

  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [address, setAddress] = useState<DeliveryAddress>({
    id: 'addr_checkout',
    label: 'Farm / Home',
    fullName: userProfile?.fullName || firebaseUser?.displayName || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
    village: userProfile?.village || '',
    mandal: userProfile?.mandal || '',
    district: userProfile?.district || '',
    state: userProfile?.state || 'Andhra Pradesh',
    pinCode: userProfile?.pinCode || '',
  });

  useEffect(() => {
    if (userProfile) {
      setAddress((prev) => ({
        ...prev,
        fullName: prev.fullName || userProfile.fullName || '',
        phone: prev.phone || userProfile.phone || '',
        address: prev.address || userProfile.address || '',
        village: prev.village || userProfile.village || '',
        mandal: prev.mandal || userProfile.mandal || '',
        district: prev.district || userProfile.district || '',
        state: prev.state || userProfile.state || 'Andhra Pradesh',
        pinCode: prev.pinCode || userProfile.pinCode || '',
      }));
      if (userProfile.addresses && userProfile.addresses.length > 0 && selectedAddressId === 'new') {
        const def = userProfile.addresses.find((a) => a.isDefault) || userProfile.addresses[0];
        setSelectedAddressId(def.id);
        setAddress(def);
      }
    }
  }, [userProfile]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [paymentRef, setPaymentRef] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [regulatedConsent, setRegulatedConsent] = useState(false);
  const [buyerLicenseRef, setBuyerLicenseRef] = useState(userProfile?.buyerLicenseNo || '');
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/payments/config')
      .then((r) => r.json())
      .then((d) => setRazorpayConfigured(Boolean(d.razorpayConfigured)))
      .catch(() => {});
  }, []);

  const hasRegulatedItem = cart.some((item) => item.licenseRequirement !== 'none');
  const hasLicensedBuyerItem = cart.some((item) => item.licenseRequirement === 'licensed_buyer');

  if (completedOrderNumber) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#F3F8F1] text-[#176B3A] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#252525] mb-2">Order Placed Successfully!</h1>
          <p className="text-sm text-neutral-600 mb-4">
            Your order <span className="font-mono-num font-bold text-[#176B3A]">{completedOrderNumber}</span> has been
            recorded and verified. You can track status and download your GST invoice anytime.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="px-5 py-2.5 rounded-lg bg-[#176B3A] text-white text-sm font-semibold hover:bg-[#12552e]"
            >
              Track My Order
            </button>
            <button
              onClick={() => navigate('/catalog')}
              className="px-5 py-2.5 rounded-lg border border-neutral-300 text-sm font-semibold hover:bg-neutral-50"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold mb-2">Your Cart is Empty</h1>
        <p className="text-sm text-neutral-600 mb-6">Add fertilizers, seeds, or crop protection products before checkout.</p>
        <button
          onClick={() => navigate('/catalog')}
          className="px-5 py-2.5 rounded-lg bg-[#176B3A] text-white text-sm font-semibold"
        >
          Browse Products
        </button>
      </main>
    );
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firebaseUser || !firebaseUser.emailVerified) {
      setAuthModalOpen(true);
      setErrorMsg('Please sign in with a verified email account to place your order.');
      return;
    }

    if (!address.fullName || !address.phone || !address.address || !address.district || !address.pinCode) {
      setErrorMsg('Please complete all required delivery address fields.');
      return;
    }

    setSubmitting(true);
    try {
      if (paymentMethod === 'RAZORPAY') {
        const rpOrderRes = await fetch('/api/payments/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountInRupees: cartGrandTotal, receipt: `LKS_${Date.now()}` }),
        });
        const rpOrder = await rpOrderRes.json();
        if (!rpOrderRes.ok) {
          throw new Error(rpOrder.error || 'Razorpay gateway is not configured on the server.');
        }
        // Launch Razorpay checkout script dynamically if available
        const win = window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } };
        if (!win.Razorpay) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
            document.body.appendChild(s);
          });
        }
        await new Promise<void>((resolve, reject) => {
          const rzp = new win.Razorpay!({
            key: rpOrder.keyId,
            amount: rpOrder.amount,
            currency: rpOrder.currency,
            name: 'Laksmi Fertilizers Pesticides and Seeds',
            order_id: rpOrder.orderId,
            prefill: {
              name: address.fullName,
              email: firebaseUser.email || '',
              contact: address.phone,
            },
            handler: async (response: {
              razorpay_order_id: string;
              razorpay_payment_id: string;
              razorpay_signature: string;
            }) => {
              try {
                const ord = await placeOrder({
                  shippingAddress: address,
                  paymentMethod: 'RAZORPAY',
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  regulatedConsentAccepted: regulatedConsent,
                  buyerLicenseRef,
                  customerGstin,
                });
                setCompletedOrderNumber(ord.orderNumber);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => reject(new Error('Payment cancelled before completion.')),
            },
          });
          rzp.open();
        });
      } else {
        const order = await placeOrder({
          shippingAddress: address,
          paymentMethod,
          paymentRef,
          regulatedConsentAccepted: regulatedConsent,
          buyerLicenseRef,
          customerGstin,
        });
        setCompletedOrderNumber(order.orderNumber);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Checkout failed.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-2xl font-bold text-[#252525] mb-6">Secure Checkout</h1>

      {!firebaseUser && (
        <div className="mb-6 bg-[#F3F8F1] border border-[#4CAF50]/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#252525]">
            Sign in to save your delivery address, verify agricultural compliance, and track your order.
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#176B3A] text-white text-xs font-bold"
          >
            Sign In / Create Account
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2.5 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Shipping + Compliance + Payment */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Delivery Address */}
          <section className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6">
            <h2 className="font-display font-bold text-base text-[#252525] mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#176B3A]" />
              1. Delivery Address (Village / Mandal / District)
            </h2>

            {userProfile?.addresses && userProfile.addresses.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {userProfile.addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setSelectedAddressId(addr.id);
                      setAddress(addr);
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold text-left ${
                      selectedAddressId === addr.id
                        ? 'border-[#176B3A] bg-[#F3F8F1] text-[#176B3A]'
                        : 'border-neutral-200'
                    }`}
                  >
                    {addr.label}: {addr.village || addr.district} ({addr.pinCode})
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedAddressId('new')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold ${
                    selectedAddressId === 'new' ? 'border-[#176B3A] bg-[#F3F8F1]' : 'border-neutral-200'
                  }`}
                >
                  + Use Custom Address
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  required
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Mobile Number *</label>
                <input
                  required
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">House / Street / Landmark *</label>
                <input
                  required
                  value={address.address}
                  onChange={(e) => setAddress({ ...address, address: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Village / Town *</label>
                <input
                  required
                  value={address.village}
                  onChange={(e) => setAddress({ ...address, village: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Mandal / Taluk *</label>
                <input
                  required
                  value={address.mandal}
                  onChange={(e) => setAddress({ ...address, mandal: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">District *</label>
                <input
                  required
                  value={address.district}
                  onChange={(e) => setAddress({ ...address, district: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">State *</label>
                  <input
                    required
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">PIN Code *</label>
                  <input
                    required
                    maxLength={6}
                    value={address.pinCode}
                    onChange={(e) => setAddress({ ...address, pinCode: e.target.value })}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 font-mono-num"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Buyer GSTIN (Optional for B2B Invoice)</label>
                <input
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                  placeholder="Optional 15-char GSTIN"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 font-mono-num"
                />
              </div>
            </div>
          </section>

          {/* 2. Regulated Agricultural Input Verification */}
          {hasRegulatedItem && (
            <section className="bg-amber-50/70 rounded-xl border border-amber-200 p-5 sm:p-6 space-y-3">
              <h2 className="font-display font-bold text-base text-[#252525] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-700" />
                2. Agricultural Input Compliance & Buyer Verification
              </h2>
              <p className="text-xs text-neutral-700 leading-relaxed">
                Your order includes regulated fertilizers or crop protection inputs. In compliance with Indian
                agricultural input regulations, please review product labels and confirm authorized use.
              </p>

              {hasLicensedBuyerItem && (
                <div>
                  <label className="block text-xs font-bold text-[#252525] mb-1">
                    Authorized Buyer / Dealer License or Farmer ID Reference *
                  </label>
                  <input
                    required
                    value={buyerLicenseRef}
                    onChange={(e) => setBuyerLicenseRef(e.target.value)}
                    placeholder="Enter valid license or farmer passbook reference"
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              )}

              <label className="flex items-start gap-2.5 text-xs text-[#252525] cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={regulatedConsent}
                  onChange={(e) => setRegulatedConsent(e.target.checked)}
                  className="mt-0.5 accent-[#176B3A]"
                />
                <span>
                  I confirm these agricultural inputs are for lawful crop protection/nutrition use only, and I will
                  follow the approved product label dosage, PPE safety gear, and storage instructions.
                </span>
              </label>
            </section>
          )}

          {/* 3. Payment Method */}
          <section className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6 space-y-4">
            <h2 className="font-display font-bold text-base text-[#252525] flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#176B3A]" />
              {hasRegulatedItem ? '3.' : '2.'} Payment Method (Server Verified)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { id: 'COD' as PaymentMethod, title: 'Cash on Delivery (COD)', sub: 'Pay cash/UPI at doorstep delivery' },
                { id: 'UPI' as PaymentMethod, title: 'UPI Transfer (GPay / PhonePe / BHIM)', sub: 'Verify via 12-digit UTR reference' },
                { id: 'CARD' as PaymentMethod, title: 'Debit / Credit Card', sub: 'Server-validated card transaction ref' },
                { id: 'NET_BANKING' as PaymentMethod, title: 'Net Banking', sub: 'Bank NEFT / IMPS / NetBanking ref' },
                ...(razorpayConfigured
                  ? [{ id: 'RAZORPAY' as PaymentMethod, title: 'Razorpay Instant Checkout', sub: 'Live HMAC-SHA256 verified gateway' }]
                  : []),
              ].map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === m.id ? 'border-[#176B3A] bg-[#F3F8F1]' : 'border-neutral-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                    className="mt-0.5 accent-[#176B3A]"
                  />
                  <div>
                    <span className="font-bold text-[#252525] block">{m.title}</span>
                    <span className="text-neutral-500">{m.sub}</span>
                  </div>
                </label>
              ))}
            </div>

            {!razorpayConfigured && (
              <p className="text-[11px] text-neutral-500">
                Note: Live Razorpay checkout enables automatically when <code>RAZORPAY_KEY_ID</code> and{' '}
                <code>RAZORPAY_KEY_SECRET</code> are configured in server environment variables.
              </p>
            )}

            {paymentMethod !== 'COD' && paymentMethod !== 'RAZORPAY' && (
              <div className="bg-[#F8FAF7] border border-neutral-200 rounded-lg p-4 space-y-2">
                <label className="block text-xs font-bold text-[#252525]">
                  Enter {paymentMethod} Transaction / UTR Reference *
                </label>
                <input
                  required
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UTR429104829104 or TXN-REF"
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-mono-num"
                />
                <p className="text-[11px] text-neutral-500">
                  Server verifies reference integrity before marking order payment status as VERIFIED.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-4 bg-white rounded-xl border border-neutral-200 p-5 sm:p-6 sticky top-28 space-y-4">
          <h2 className="font-display font-bold text-base text-[#252525]">Order Summary</h2>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={`${item.productId}_${item.packSize}`} className="flex justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-[#252525] truncate">{item.productName}</p>
                  <p className="text-neutral-500">
                    {item.packSize} × {item.qty}
                  </p>
                </div>
                <span className="font-bold tabular-nums shrink-0">
                  ₹{(item.unitPrice * item.qty).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-200 pt-3">
            {appliedCoupon ? (
              <div className="flex justify-between text-xs text-[#176B3A] font-semibold">
                <span>Coupon: {appliedCoupon.code}</span>
                <button type="button" onClick={removeCoupon} className="text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Promo coupon (KISAN10)"
                  className="flex-1 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => applyCouponCode(couponInput)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-neutral-600 border-t border-neutral-200 pt-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums font-semibold">₹{cartSubtotal.toLocaleString('en-IN')}</span>
            </div>
            {cartDiscount > 0 && (
              <div className="flex justify-between text-[#176B3A]">
                <span>Discount</span>
                <span className="tabular-nums font-semibold">-₹{cartDiscount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Charges</span>
              <span className="tabular-nums font-semibold">
                {cartDeliveryFee === 0 ? 'FREE' : `₹${cartDeliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Included GST (CGST + SGST)</span>
              <span className="tabular-nums">₹{cartGstTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-base font-display font-bold text-[#252525] pt-2 border-t border-neutral-200">
              <span>Grand Total</span>
              <span className="tabular-nums">₹{cartGrandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-[#F5B82E] hover:bg-[#e5a820] disabled:opacity-60 text-[#1D241E] font-bold text-sm transition-colors"
          >
            {submitting ? 'Verifying & Placing Order...' : `Place Order · ₹${cartGrandTotal.toLocaleString('en-IN')}`}
          </button>
        </aside>
      </form>
    </main>
  );
};
