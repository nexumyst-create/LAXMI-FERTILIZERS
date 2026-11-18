import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Heart,
  MessageSquare,
  Share2,
  ShieldAlert,
  ShoppingCart,
  Star,
  Zap,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { getT } from '../../i18n/translations';
import { SafeImage } from '../common/SafeImage';
import { ProductCard } from './ProductCard';

interface ProductDetailPageProps {
  productId: string;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ productId }) => {
  const {
    products,
    reviews,
    questions,
    language,
    navigate,
    addToCart,
    wishlist,
    toggleWishlist,
    submitProductReview,
    submitProductQuestion,
    showToast,
  } = useStore();

  const t = getT(language);
  const product = products.find((p) => p.id === productId || p.slug === productId);

  const [imgIdx, setImgIdx] = useState(0);
  const [packIdx, setPackIdx] = useState(0);
  const [qty, setQty] = useState(1);

  // Review Form
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revBusy, setRevBusy] = useState(false);

  // Question Form
  const [questionText, setQuestionText] = useState('');
  const [qBusy, setQBusy] = useState(false);

  useEffect(() => {
    setImgIdx(0);
    setPackIdx(0);
    setQty(1);
  }, [productId]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.id !== product.id && p.active && p.categoryId === product.categoryId).slice(0, 4);
  }, [products, product]);

  const frequentlyBought = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.id !== product.id && p.active && p.categoryId !== product.categoryId).slice(0, 2);
  }, [products, product]);

  const productReviews = useMemo(
    () => reviews.filter((r) => r.productId === product?.id && r.approved),
    [reviews, product]
  );
  const productQuestions = useMemo(
    () => questions.filter((q) => q.productId === product?.id),
    [questions, product]
  );

  if (!product) {
    return (
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold mb-2">Product Not Found</h1>
        <p className="text-sm text-neutral-600 mb-6">This agricultural input may have been moved or disabled.</p>
        <button
          onClick={() => navigate('/catalog')}
          className="px-5 py-2.5 rounded-lg bg-[#176B3A] text-white text-sm font-semibold"
        >
          Back to Catalog
        </button>
      </main>
    );
  }

  const selectedPack = product.packSizes[packIdx] || {
    label: 'Standard Pack',
    mrp: product.mrp,
    price: product.price,
    stock: product.stock,
  };
  const discountPct =
    selectedPack.mrp > selectedPack.price
      ? Math.round(((selectedPack.mrp - selectedPack.price) / selectedPack.mrp) * 100)
      : 0;
  const inStock = product.stock > 0 && selectedPack.stock > 0;
  const isWished = wishlist.includes(product.id);
  const displayName = language === 'te' && product.nameTe ? product.nameTe : product.name;
  const displayDesc = language === 'te' && product.descriptionTe ? product.descriptionTe : product.description;

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    showToast('Product link copied to clipboard.', 'info');
  };

  const handleAddBundle = () => {
    addToCart(product, selectedPack, 1, false);
    frequentlyBought.forEach((fp) => addToCart(fp, fp.packSizes[0], 1, false));
    showToast('Bundle added to cart!', 'success');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revComment.trim()) return;
    setRevBusy(true);
    try {
      await submitProductReview(product.id, revRating, revTitle, revComment);
      setRevTitle('');
      setRevComment('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to submit review.', 'error');
    } finally {
      setRevBusy(false);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questionText.trim().length < 5) return;
    setQBusy(true);
    try {
      await submitProductQuestion(product.id, questionText);
      setQuestionText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to submit question.', 'error');
    } finally {
      setQBusy(false);
    }
  };

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Schema.org Product JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            sku: product.sku,
            brand: { '@type': 'Brand', name: product.brandName },
            description: product.description,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'INR',
              price: selectedPack.price,
              availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            },
          }),
        }}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-neutral-500 mb-6 flex-wrap">
        <button onClick={() => navigate('/')} className="hover:text-[#176B3A]">
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button onClick={() => navigate(`/catalog?category=${product.categoryId}`)} className="hover:text-[#176B3A]">
          {product.categoryName}
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#252525] font-medium truncate">{displayName}</span>
      </nav>

      {/* Main 2-Column PDP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Gallery */}
        <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-3">
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#F8FAF7] border border-neutral-200">
            <SafeImage
              src={product.images[imgIdx] || product.images[0]}
              alt={displayName}
              loading="eager"
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-20 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${
                    imgIdx === i ? 'border-[#176B3A]' : 'border-neutral-200'
                  }`}
                >
                  <SafeImage src={img} alt={`${displayName} view ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Purchase & Technical Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 text-xs text-neutral-500 mb-2">
              <span>
                {product.brandName} · {t.product.sku}: <span className="font-mono-num">{product.sku}</span>
              </span>
              <span className="font-medium">
                {product.categoryName} / {product.subcategory}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#252525] leading-snug mb-3">
              {displayName}
            </h1>

            <div className="flex items-center gap-3 text-xs mb-4">
              <div className="flex items-center gap-1 text-[#F5B82E]">
                <Star className="w-4 h-4 fill-[#F5B82E]" />
                <span className="font-bold text-[#252525] tabular-nums">{product.ratingAvg.toFixed(1)}</span>
              </div>
              <span className="text-neutral-400">·</span>
              <span className="text-neutral-600 tabular-nums">{product.ratingCount} ratings</span>
              <span className="text-neutral-400">·</span>
              <span className={inStock ? 'text-[#176B3A] font-semibold' : 'text-red-600 font-semibold'}>
                {inStock ? `${t.product.inStock} (${selectedPack.stock} units)` : t.product.outOfStock}
              </span>
            </div>

            {/* Price Block */}
            <div className="bg-[#F3F8F1] rounded-lg p-4 mb-5">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl font-bold text-[#252525] tabular-nums">
                  ₹{selectedPack.price.toLocaleString('en-IN')}
                </span>
                {selectedPack.mrp > selectedPack.price && (
                  <span className="text-sm text-neutral-500 line-through tabular-nums">
                    {t.product.mrp} ₹{selectedPack.mrp.toLocaleString('en-IN')}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="text-xs font-bold text-[#176B3A] tabular-nums">
                    Save {discountPct}%
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-600 mt-1">
                {t.product.gstIncluded} ({product.gstRate}% GST · {t.product.hsn}:{' '}
                <span className="font-mono-num">{product.hsnCode}</span>)
              </p>
            </div>

            {/* Pack Sizes */}
            {product.packSizes.length > 0 && (
              <div className="mb-5">
                <label className="block text-xs font-bold text-[#252525] mb-2">{t.product.packSize}</label>
                <div className="flex flex-wrap gap-2">
                  {product.packSizes.map((ps, idx) => (
                    <button
                      key={ps.label}
                      onClick={() => setPackIdx(idx)}
                      className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                        packIdx === idx
                          ? 'bg-[#176B3A] text-white border-[#176B3A]'
                          : 'bg-white text-[#252525] border-neutral-200 hover:border-[#176B3A]'
                      }`}
                    >
                      {ps.label} · ₹{ps.price.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center border border-neutral-300 rounded-lg">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-sm font-bold hover:bg-neutral-100"
                >
                  -
                </button>
                <span className="px-4 text-sm font-semibold tabular-nums">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(selectedPack.stock || 99, q + 1))}
                  className="px-3 py-2 text-sm font-bold hover:bg-neutral-100"
                >
                  +
                </button>
              </div>

              <button
                disabled={!inStock}
                onClick={() => addToCart(product, selectedPack, qty, true)}
                className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#176B3A] hover:bg-[#12552e] disabled:bg-neutral-200 text-white font-bold text-sm transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                {t.product.addToCart}
              </button>

              <button
                disabled={!inStock}
                onClick={() => {
                  addToCart(product, selectedPack, qty, false);
                  navigate('/checkout');
                }}
                className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#F5B82E] hover:bg-[#e5a820] disabled:bg-neutral-200 text-[#1D241E] font-bold text-sm transition-colors"
              >
                <Zap className="w-4 h-4" />
                {t.product.buyNow}
              </button>
            </div>

            <div className="flex items-center gap-4 pt-2 text-xs font-semibold text-neutral-600">
              <button
                onClick={() => toggleWishlist(product.id)}
                className="inline-flex items-center gap-1.5 hover:text-red-600"
              >
                <Heart className={`w-4 h-4 ${isWished ? 'fill-red-500 text-red-500' : ''}`} />
                {isWished ? 'Saved in Wishlist' : 'Add to Wishlist'}
              </button>
              <button onClick={handleShare} className="inline-flex items-center gap-1.5 hover:text-[#176B3A]">
                <Share2 className="w-4 h-4" />
                Share Product
              </button>
            </div>
          </div>

          {/* Product Details, Label Usage & Regulatory Compliance */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="font-display font-bold text-base text-[#252525] mb-2">Product Overview</h2>
              <p className="text-sm text-neutral-700 leading-relaxed">{displayDesc}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t border-neutral-100 pt-4">
              <div>
                <span className="text-neutral-500 block">Specifications</span>
                <span className="font-medium text-[#252525]">{product.specifications}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">{t.product.manufacturer}</span>
                <span className="font-medium text-[#252525]">{product.manufacturer}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Target Crops & Season</span>
                <span className="font-medium text-[#252525]">
                  {product.cropTags.join(', ')} · {product.season} Season
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">{t.product.registration}</span>
                <span className="font-medium text-[#252525]">
                  {product.registrationNumber || 'Standard Agricultural Input'}
                </span>
              </div>
              {product.batchNumber && (
                <div>
                  <span className="text-neutral-500 block">Batch / Expiry</span>
                  <span className="font-mono-num font-medium text-[#252525]">
                    {product.batchNumber} · Exp: {product.expiryDate || 'Check Pack'}
                  </span>
                </div>
              )}
            </div>

            {/* Label Usage & Safety Box */}
            <div className="bg-[#F3F8F1] rounded-lg p-4 space-y-3 border border-neutral-200">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#176B3A] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-[#252525]">{t.product.usageLabel}</p>
                  <p className="text-neutral-700 mt-0.5 leading-relaxed">{product.usageInstructions}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-[#252525]">{t.product.safetyLabel}</p>
                  <p className="text-neutral-700 mt-0.5 leading-relaxed">{product.safetyInstructions}</p>
                </div>
              </div>

              {product.licenseRequirement !== 'none' && (
                <div className="flex items-start gap-2.5 pt-2 border-t border-neutral-200">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-neutral-800 leading-relaxed">
                    <strong>{t.product.complianceNotice}:</strong>{' '}
                    {product.licenseRequirement === 'licensed_buyer'
                      ? 'Restricted crop protection input. Buyer license / authorization verification is required at checkout under applicable Indian regulations.'
                      : 'Regulated agricultural input. Farmer safe-usage label confirmation is required before checkout.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Frequently Bought Together */}
          {frequentlyBought.length > 0 && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6">
              <h2 className="font-display font-bold text-base text-[#252525] mb-4">{t.product.frequentlyBought}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {[product, ...frequentlyBought].map((bp, idx) => (
                    <React.Fragment key={bp.id}>
                      {idx > 0 && <span className="text-neutral-400 font-bold">+</span>}
                      <button
                        onClick={() => navigate(`/product/${bp.id}`)}
                        className="flex items-center gap-2 bg-[#F8FAF7] border border-neutral-200 rounded-lg p-2 max-w-[200px] text-left hover:border-[#176B3A]"
                      >
                        <SafeImage src={bp.images[0]} alt={bp.name} className="w-12 h-12 rounded object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{bp.name}</p>
                          <p className="text-xs font-bold text-[#176B3A] tabular-nums">₹{bp.price}</p>
                        </div>
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                <button
                  onClick={handleAddBundle}
                  className="px-4 py-2.5 rounded-lg bg-[#176B3A] text-white text-xs font-bold hover:bg-[#12552e] whitespace-nowrap shrink-0"
                >
                  Add Bundle to Cart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews & Q&A */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
        {/* Customer Reviews */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6">
          <h2 className="font-display font-bold text-lg text-[#252525] mb-4">{t.product.reviews}</h2>
          <div className="space-y-4 mb-6">
            {productReviews.length === 0 ? (
              <p className="text-xs text-neutral-500">No reviews yet. Be the first farmer to review this input.</p>
            ) : (
              productReviews.map((rv) => (
                <div key={rv.id} className="pb-4 border-b border-neutral-100 last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex text-[#F5B82E]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < rv.rating ? 'fill-[#F5B82E]' : 'text-neutral-200'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-[#252525]">{rv.title || 'Verified Review'}</span>
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed">{rv.comment}</p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    {rv.userName} {rv.verifiedPurchase ? '· Verified Buyer' : ''}
                  </p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleReviewSubmit} className="border-t border-neutral-200 pt-4 space-y-3">
            <h3 className="text-xs font-bold text-[#252525]">Write a Customer Review</h3>
            <div className="flex items-center gap-2 text-xs">
              <span>Rating:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRevRating(n)}
                  className={`px-2 py-1 rounded border ${
                    revRating === n ? 'bg-[#F5B82E] border-[#F5B82E] font-bold' : 'border-neutral-200'
                  }`}
                >
                  {n}★
                </button>
              ))}
            </div>
            <input
              type="text"
              value={revTitle}
              onChange={(e) => setRevTitle(e.target.value)}
              placeholder="Review headline"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs"
            />
            <textarea
              required
              rows={3}
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              placeholder="Share your experience with packaging, application, and quality..."
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={revBusy}
              className="px-4 py-2 rounded-lg bg-[#176B3A] text-white text-xs font-semibold hover:bg-[#12552e]"
            >
              {revBusy ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>

        {/* Ask a Question */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6">
          <h2 className="font-display font-bold text-lg text-[#252525] mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#176B3A]" />
            {t.product.askQuestion}
          </h2>
          <div className="space-y-4 mb-6">
            {productQuestions.length === 0 ? (
              <p className="text-xs text-neutral-500">No questions yet. Ask about pack sizes, compatibility, or label instructions.</p>
            ) : (
              productQuestions.map((q) => (
                <div key={q.id} className="pb-3 border-b border-neutral-100 last:border-b-0 text-xs">
                  <p className="font-semibold text-[#252525]">Q: {q.question}</p>
                  <p className="text-neutral-600 mt-1">
                    {q.answer ? `A: ${q.answer}` : 'Awaiting store team response'}
                  </p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleQuestionSubmit} className="border-t border-neutral-200 pt-4 space-y-3">
            <textarea
              required
              rows={2}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Ask about crop compatibility, pack weight, or delivery..."
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={qBusy}
              className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800"
            >
              {qBusy ? 'Sending...' : 'Post Question'}
            </button>
          </form>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display font-bold text-xl text-[#252525] mb-5">{t.product.relatedProducts}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
};
