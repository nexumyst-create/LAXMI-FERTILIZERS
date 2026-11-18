import React, { useState } from 'react';
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SafeImage } from '../common/SafeImage';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    cartDrawerOpen,
    setCartDrawerOpen,
    products,
    updateCartQty,
    changeCartPackSize,
    removeFromCart,
    appliedCoupon,
    couponError,
    applyCouponCode,
    removeCoupon,
    cartSubtotal,
    cartDiscount,
    cartDeliveryFee,
    cartGstTotal,
    cartGrandTotal,
    settings,
    navigate,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');

  if (!cartDrawerOpen) return null;

  const freeDeliveryRemaining = Math.max(0, settings.freeDeliveryThreshold - (cartSubtotal - cartDiscount));

  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print">
      <div className="fixed inset-0 bg-black/50" onClick={() => setCartDrawerOpen(false)} />

      <aside className="relative z-10 w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 bg-[#176B3A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#F5B82E]" />
            <h2 className="font-display font-bold text-base">Shopping Cart ({cart.length})</h2>
          </div>
          <button
            onClick={() => setCartDrawerOpen(false)}
            aria-label="Close cart drawer"
            className="p-1.5 rounded hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Delivery Progress */}
        {cart.length > 0 && (
          <div className="px-5 py-2.5 bg-[#F3F8F1] border-b border-neutral-200 text-xs text-[#176B3A] font-medium">
            {freeDeliveryRemaining === 0 ? (
              <span>Eligible for Free Delivery!</span>
            ) : (
              <span>
                Add ₹{freeDeliveryRemaining.toLocaleString('en-IN')} more for Free Delivery (above ₹
                {settings.freeDeliveryThreshold.toLocaleString('en-IN')})
              </span>
            )}
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="font-display font-semibold text-base text-[#252525]">Your agri cart is empty</p>
              <p className="text-xs text-neutral-500 mt-1 mb-5">
                Explore fertilizers, seeds, crop protection, and sprayers.
              </p>
              <button
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/catalog');
                }}
                className="px-5 py-2.5 rounded-lg bg-[#176B3A] text-white text-sm font-semibold hover:bg-[#12552e]"
              >
                Browse Products
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const fullProd = products.find((p) => p.id === item.productId);
              return (
                <div
                  key={`${item.productId}_${item.packSize}`}
                  className="flex gap-3 pb-4 border-b border-neutral-200 last:border-b-0"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#F8FAF7] border border-neutral-200 shrink-0">
                    <SafeImage src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => {
                        setCartDrawerOpen(false);
                        navigate(`/product/${item.productId}`);
                      }}
                      className="font-display font-semibold text-sm text-[#252525] hover:text-[#176B3A] text-left line-clamp-2"
                    >
                      {item.productName}
                    </button>

                    {fullProd && fullProd.packSizes.length > 1 ? (
                      <select
                        aria-label="Change pack size"
                        value={item.packSize}
                        onChange={(e) => {
                          const np = fullProd.packSizes.find((ps) => ps.label === e.target.value);
                          if (np) changeCartPackSize(item.productId, item.packSize, np);
                        }}
                        className="mt-1 text-xs border border-neutral-200 rounded px-2 py-0.5 bg-neutral-50"
                      >
                        {fullProd.packSizes.map((ps) => (
                          <option key={ps.label} value={ps.label}>
                            {ps.label} (₹{ps.price})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-neutral-500 mt-0.5">{item.packSize}</p>
                    )}

                    <div className="flex items-center justify-between mt-2.5">
                      <div className="inline-flex items-center border border-neutral-200 rounded-lg">
                        <button
                          onClick={() => updateCartQty(item.productId, item.packSize, item.qty - 1)}
                          aria-label="Decrease quantity"
                          className="p-1.5 hover:bg-neutral-100"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold tabular-nums">{item.qty}</span>
                        <button
                          onClick={() => updateCartQty(item.productId, item.packSize, item.qty + 1)}
                          aria-label="Increase quantity"
                          className="p-1.5 hover:bg-neutral-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm tabular-nums">
                          ₹{(item.unitPrice * item.qty).toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.productId, item.packSize)}
                          aria-label="Remove item"
                          className="text-neutral-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Totals */}
        {cart.length > 0 && (
          <div className="border-t border-neutral-200 p-5 bg-[#F8FAF7] space-y-3">
            {/* Coupon Box */}
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-[#F3F8F1] border border-[#4CAF50]/40 rounded-lg px-3 py-2 text-xs">
                <span className="font-semibold text-[#176B3A] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Coupon {appliedCoupon.code} applied (-₹{cartDiscount})
                </span>
                <button onClick={removeCoupon} className="text-red-600 font-semibold hover:underline">
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Coupon code (e.g. KISAN10)"
                    className="flex-1 border border-neutral-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-[#176B3A]"
                  />
                  <button
                    onClick={() => applyCouponCode(couponInput)}
                    className="px-3.5 py-1.5 rounded-lg bg-neutral-800 text-white text-xs font-semibold hover:bg-neutral-900"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-[11px] text-red-600 mt-1">{couponError}</p>}
              </div>
            )}

            <div className="space-y-1 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium">₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-[#176B3A]">
                  <span>Coupon Discount</span>
                  <span className="tabular-nums font-medium">-₹{cartDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="tabular-nums font-medium">
                  {cartDeliveryFee === 0 ? 'FREE' : `₹${cartDeliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Included GST</span>
                <span className="tabular-nums">₹{cartGstTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-base font-display font-bold text-[#252525] pt-2 border-t border-neutral-200">
                <span>Total Payable</span>
                <span className="tabular-nums">₹{cartGrandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setCartDrawerOpen(false);
                navigate('/checkout');
              }}
              className="w-full py-3 rounded-lg bg-[#F5B82E] hover:bg-[#e5a820] text-[#1D241E] font-bold text-sm transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
