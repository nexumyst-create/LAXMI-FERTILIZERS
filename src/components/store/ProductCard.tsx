import React, { useState } from 'react';
import { Heart, ShoppingCart, Star, Zap } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { getT } from '../../i18n/translations';
import { Product } from '../../types';
import { SafeImage } from '../common/SafeImage';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, compact = false }) => {
  const { language, navigate, addToCart, wishlist, toggleWishlist } = useStore();
  const t = getT(language);
  const [selectedPackIdx, setSelectedPackIdx] = useState(0);

  const pack = product.packSizes[selectedPackIdx] || {
    label: 'Standard Pack',
    mrp: product.mrp,
    price: product.price,
    stock: product.stock,
  };

  const discountPct = pack.mrp > pack.price ? Math.round(((pack.mrp - pack.price) / pack.mrp) * 100) : 0;
  const isWished = wishlist.includes(product.id);
  const inStock = product.stock > 0 && pack.stock > 0;
  const displayName = language === 'te' && product.nameTe ? product.nameTe : product.name;

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, pack, 1, false);
    navigate('/checkout');
  };

  return (
    <article
      className="group bg-white rounded-xl border border-neutral-200 hover:border-[#4CAF50]/60 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
    >
      {/* Image Area */}
      <div
        onClick={() => navigate(`/product/${product.id}`)}
        className="relative aspect-[4/3] bg-[#F8FAF7] overflow-hidden cursor-pointer"
      >
        <SafeImage
          src={product.images[0]}
          alt={displayName}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />

        {/* Wishlist Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/95 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-red-500 transition-colors shadow-xs"
        >
          <Heart className={`w-4 h-4 ${isWished ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Single crisp discount indicator if discounted */}
        {discountPct > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-[#176B3A] text-white text-[11px] font-semibold px-2 py-0.5 rounded tabular-nums">
            {discountPct}% {t.product.off}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1">
        {/* Clean unboxed metadata line */}
        <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 mb-1">
          <span className="truncate font-medium">{product.brandName}</span>
          <span className={inStock ? 'text-[#176B3A] font-medium shrink-0' : 'text-red-600 font-medium shrink-0'}>
            {inStock ? (product.stock <= product.minStockAlert ? t.product.lowStock : t.product.inStock) : t.product.outOfStock}
          </span>
        </div>

        {/* Product Title */}
        <h3
          onClick={() => navigate(`/product/${product.id}`)}
          className="font-display font-semibold text-sm sm:text-[15px] text-[#252525] leading-snug line-clamp-2 cursor-pointer hover:text-[#176B3A] mb-2 min-h-[2.6rem]"
        >
          {displayName}
        </h3>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-1.5 text-xs mb-2.5">
          <div className="flex items-center gap-0.5 text-[#F5B82E]">
            <Star className="w-3.5 h-3.5 fill-[#F5B82E]" />
            <span className="font-semibold text-[#252525] tabular-nums">{product.ratingAvg.toFixed(1)}</span>
          </div>
          <span className="text-neutral-400">·</span>
          <span className="text-neutral-500 tabular-nums">({product.ratingCount})</span>
          {product.licenseRequirement !== 'none' && (
            <>
              <span className="text-neutral-400">·</span>
              <span className="text-amber-700 font-medium truncate">Label Verified</span>
            </>
          )}
        </div>

        {/* Pack Size Selector */}
        {product.packSizes.length > 0 && (
          <div className="mb-3">
            <select
              aria-label={`Select pack size for ${product.name}`}
              value={selectedPackIdx}
              onChange={(e) => setSelectedPackIdx(Number(e.target.value))}
              className="w-full text-xs border border-neutral-200 rounded-md px-2.5 py-1.5 bg-[#F3F8F1]/60 text-[#252525] font-medium focus:outline-none focus:border-[#176B3A]"
            >
              {product.packSizes.map((ps, idx) => (
                <option key={ps.label} value={idx}>
                  {ps.label} — ₹{ps.price.toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Pricing */}
        <div className="mt-auto pt-1 flex items-baseline gap-2 mb-3">
          <span className="font-display text-lg font-bold text-[#252525] tabular-nums">
            ₹{pack.price.toLocaleString('en-IN')}
          </span>
          {pack.mrp > pack.price && (
            <span className="text-xs text-neutral-400 line-through tabular-nums">
              ₹{pack.mrp.toLocaleString('en-IN')}
            </span>
          )}
          <span className="text-[11px] text-neutral-500 ml-auto">
            {product.gstRate > 0 ? `+${product.gstRate}% GST incl.` : '0% GST'}
          </span>
        </div>

        {/* Actions */}
        <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <button
            disabled={!inStock}
            onClick={() => addToCart(product, pack, 1, true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#176B3A] hover:bg-[#12552e] disabled:bg-neutral-200 disabled:text-neutral-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{t.product.addToCart}</span>
          </button>
          {!compact && (
            <button
              disabled={!inStock}
              onClick={handleBuyNow}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#F5B82E] hover:bg-[#e5a820] disabled:bg-neutral-200 disabled:text-neutral-500 text-[#1D241E] text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{t.product.buyNow}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
