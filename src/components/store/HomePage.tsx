import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  HeadphonesIcon,
  Lock,
  ShieldCheck,
  Sprout,
  Star,
  Truck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SHOP_BY_CATEGORY_CIRCLES } from '../../data/demoCatalog';
import { getT } from '../../i18n/translations';
import { CropSeason } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { ProductCard } from './ProductCard';

export const HomePage: React.FC = () => {
  const {
    language,
    navigate,
    products,
    banners,
    brands,
    reviews,
    settings,
    subscribeNewsletter,
  } = useStore();
  const t = getT(language);

  // Hero Slider
  const heroBanners = useMemo(
    () => banners.filter((b) => b.active && b.placement === 'hero'),
    [banners]
  );
  const promoBanners = useMemo(
    () => banners.filter((b) => b.active && b.placement === 'promo'),
    [banners]
  );
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % heroBanners.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [heroBanners.length]);

  const dealsRef = useRef<HTMLDivElement>(null);

  const todaysDeals = useMemo(
    () => products.filter((p) => p.active && p.isTodaysDeal),
    [products]
  );
  const bestSellers = useMemo(
    () => products.filter((p) => p.active && p.isBestSeller).slice(0, 8),
    [products]
  );

  // Seasonal & Crop Filtering
  const [seasonFilter, setSeasonFilter] = useState<CropSeason>('All');
  const [cropFilter, setCropFilter] = useState<string>('All');

  const seasonalProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (!p.active) return false;
        const seasonMatch = seasonFilter === 'All' || p.season === seasonFilter || p.season === 'All';
        const cropMatch = cropFilter === 'All' || p.cropTags.includes(cropFilter);
        return seasonMatch && cropMatch;
      })
      .slice(0, 8);
  }, [products, seasonFilter, cropFilter]);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterBusy, setNewsletterBusy] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterBusy(true);
    try {
      await subscribeNewsletter(newsletterEmail);
      setNewsletterEmail('');
    } catch {
      // handled in toast
    } finally {
      setNewsletterBusy(false);
    }
  };

  const handleBannerAction = (ctaLink: string) => {
    if (!ctaLink || ctaLink === 'catalog') {
      navigate('/catalog');
    } else if (ctaLink.startsWith('cat-')) {
      navigate(`/catalog?category=${ctaLink}`);
    } else {
      navigate(ctaLink);
    }
  };

  const activeHero = heroBanners[heroIdx] || heroBanners[0];
  const vis = settings.sectionsVisibility;

  return (
    <main className="bg-white">
      {/* D. HERO BANNER SLIDER */}
      {vis.hero && activeHero && (
        <section className="relative bg-[#114B29] overflow-hidden">
          <div className="max-w-[1440px] mx-auto relative min-h-[340px] sm:min-h-[420px] lg:min-h-[470px]">
            <SafeImage
              src={activeHero.imageUrl}
              alt={language === 'te' ? activeHero.titleTe : activeHero.title}
              loading="eager"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15" />

            <div className="relative z-10 max-w-2xl px-5 sm:px-10 lg:px-14 py-12 sm:py-16 lg:py-20 text-white">
              <p className="text-xs sm:text-sm font-medium text-[#F5B82E] mb-2">
                {t.brandName} · {t.tagline}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.12] tracking-tight mb-4 text-balance">
                {language === 'te' ? activeHero.titleTe || activeHero.title : activeHero.title}
              </h1>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed mb-7 max-w-xl">
                {language === 'te' ? activeHero.subtitleTe || activeHero.subtitle : activeHero.subtitle}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleBannerAction(activeHero.ctaLink)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#F5B82E] hover:bg-[#eab027] text-[#1D241E] font-bold text-sm transition-colors whitespace-nowrap"
                >
                  <span>{activeHero.ctaText || t.shopNow}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/catalog')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/30 font-semibold text-sm backdrop-blur-xs transition-colors whitespace-nowrap"
                >
                  {t.exploreProducts}
                </button>
              </div>
            </div>

            {heroBanners.length > 1 && (
              <>
                <button
                  onClick={() => setHeroIdx((prev) => (prev - 1 + heroBanners.length) % heroBanners.length)}
                  aria-label="Previous hero slide"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setHeroIdx((prev) => (prev + 1) % heroBanners.length)}
                  aria-label="Next hero slide"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                  {heroBanners.map((b, i) => (
                    <button
                      key={b.id}
                      onClick={() => setHeroIdx(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        i === heroIdx ? 'w-7 bg-[#F5B82E]' : 'w-2 bg-white/50 hover:bg-white'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* E. TRUST FEATURES */}
      {vis.trustFeatures && (
        <section className="bg-[#F3F8F1] border-b border-neutral-200">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: ShieldCheck, title: t.trust.genuineTitle, desc: t.trust.genuineDesc },
              { icon: Truck, title: t.trust.deliveryTitle, desc: t.trust.deliveryDesc },
              { icon: Lock, title: t.trust.paymentsTitle, desc: t.trust.paymentsDesc },
              { icon: HeadphonesIcon, title: t.trust.supportTitle, desc: t.trust.supportDesc },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-white rounded-xl border border-neutral-200 p-4 flex items-start gap-3.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#F3F8F1] text-[#176B3A] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-sm text-[#252525]">{item.title}</h2>
                    <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* F. SHOP BY CATEGORY (10 Circular Category Cards) */}
      {vis.shopByCategory && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#252525]">
              {t.sections.shopByCategory}
            </h2>
            <button
              onClick={() => navigate('/catalog')}
              className="text-sm font-semibold text-[#176B3A] hover:underline inline-flex items-center gap-1"
            >
              <span>{t.viewAll}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-4">
            {SHOP_BY_CATEGORY_CIRCLES.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  navigate(
                    `/catalog?category=${cat.categoryId}${cat.sub ? `&sub=${encodeURIComponent(cat.sub)}` : ''}`
                  )
                }
                className="group flex flex-col items-center text-center p-2 rounded-xl hover:bg-[#F3F8F1] transition-colors"
              >
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden border-2 border-[#4CAF50]/30 group-hover:border-[#176B3A] transition-colors bg-[#F3F8F1] mb-2.5 shadow-xs">
                  <SafeImage
                    src={cat.image}
                    alt={language === 'te' ? cat.labelTe : cat.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="text-xs font-semibold text-[#252525] group-hover:text-[#176B3A] leading-snug">
                  {language === 'te' ? cat.labelTe : cat.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* H. TODAY'S DEALS (Horizontal Carousel) */}
      {vis.todaysDeals && todaysDeals.length > 0 && (
        <section className="bg-[#F3F8F1] py-10 border-y border-neutral-200">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#252525]">
                  {t.sections.todaysDeals}
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Limited-period seasonal savings configured in store catalog
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dealsRef.current?.scrollBy({ left: -340, behavior: 'smooth' })}
                  aria-label="Scroll deals left"
                  className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center hover:border-[#176B3A]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => dealsRef.current?.scrollBy({ left: 340, behavior: 'smooth' })}
                  aria-label="Scroll deals right"
                  className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center hover:border-[#176B3A]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/catalog?offers=true')}
                  className="text-sm font-semibold text-[#176B3A] hover:underline ml-2 whitespace-nowrap"
                >
                  {t.viewAll}
                </button>
              </div>
            </div>

            <div
              ref={dealsRef}
              className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x"
            >
              {todaysDeals.map((product) => (
                <div key={product.id} className="w-[260px] sm:w-[280px] shrink-0 snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* G. BEST SELLING PRODUCTS */}
      {vis.bestSellers && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#252525]">
                {t.sections.bestSellers}
              </h2>
              <p className="text-xs text-neutral-600 mt-0.5">
                Popular fertilizers, hybrid seeds, crop protection, and sprayers
              </p>
            </div>
            <button
              onClick={() => navigate('/catalog?sort=bestselling')}
              className="text-sm font-semibold text-[#176B3A] hover:underline inline-flex items-center gap-1"
            >
              <span>{t.viewAll}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* K. PROMOTIONAL BANNERS */}
      {vis.promoBanners && promoBanners.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-10">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#252525] mb-5">
            {t.sections.promoBanners}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {promoBanners.map((pb) => (
              <div
                key={pb.id}
                onClick={() => handleBannerAction(pb.ctaLink)}
                className="relative rounded-xl overflow-hidden border border-neutral-200 aspect-[4/3] cursor-pointer group"
              >
                <SafeImage
                  src={pb.imageUrl}
                  alt={pb.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="font-display font-bold text-base leading-snug">
                    {language === 'te' ? pb.titleTe || pb.title : pb.title}
                  </h3>
                  <p className="text-xs text-white/85 mt-0.5 line-clamp-1">
                    {language === 'te' ? pb.subtitleTe || pb.subtitle : pb.subtitle}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#F5B82E] mt-2">
                    {pb.ctaText || t.shopNow}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* J. SEASONAL & CROP-SPECIFIC PRODUCTS */}
      {vis.seasonalProducts && (
        <section className="bg-[#F3F8F1] py-10 border-y border-neutral-200">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#252525]">
                  {t.sections.seasonalProducts}
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Filter inputs by agricultural season and target crop
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Season Segmented Tabs */}
                <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-neutral-200">
                  {(['All', 'Kharif', 'Rabi', 'Summer'] as CropSeason[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeasonFilter(s)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                        seasonFilter === s
                          ? 'bg-[#176B3A] text-white'
                          : 'text-neutral-600 hover:text-[#252525]'
                      }`}
                    >
                      {s === 'All' ? 'All Seasons' : `${s} Season`}
                    </button>
                  ))}
                </div>

                {/* Crop Selector */}
                <select
                  aria-label="Filter by crop"
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                  className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold text-[#252525] focus:outline-none focus:border-[#176B3A]"
                >
                  <option value="All">All Crops</option>
                  <option value="Paddy">Paddy (వరి)</option>
                  <option value="Cotton">Cotton (పత్తి)</option>
                  <option value="Chilli">Chilli (మిర్చి)</option>
                  <option value="Maize">Maize (మొక్కజొన్న)</option>
                  <option value="Vegetables">Vegetables (కూరగాయలు)</option>
                </select>
              </div>
            </div>

            {seasonalProducts.length === 0 ? (
              <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
                <Sprout className="w-8 h-8 text-[#176B3A] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#252525]">No inputs matched that crop & season filter.</p>
                <button
                  onClick={() => {
                    setSeasonFilter('All');
                    setCropFilter('All');
                  }}
                  className="mt-3 text-xs font-semibold text-[#176B3A] hover:underline"
                >
                  Reset Seasonal Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {seasonalProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* I. FEATURED BRANDS */}
      {vis.featuredBrands && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#252525]">
              {t.sections.featuredBrands}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {brands
              .filter((b) => b.active)
              .map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => navigate(`/catalog?brand=${brand.id}`)}
                  className="bg-white border border-neutral-200 hover:border-[#176B3A] rounded-xl p-4 text-left transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#F3F8F1] text-[#176B3A] flex items-center justify-center font-display font-bold text-sm mb-2.5">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="font-display font-bold text-sm text-[#252525] truncate">{brand.name}</p>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{brand.description}</p>
                </button>
              ))}
          </div>
        </section>
      )}

      {/* L. VERIFIED CUSTOMER REVIEWS */}
      {vis.reviews && reviews.length > 0 && (
        <section className="bg-[#F3F8F1] py-10 border-t border-neutral-200">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#252525] mb-6">
              {t.sections.customerReviews}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {reviews
                .filter((r) => r.approved)
                .slice(0, 3)
                .map((rev) => (
                  <div key={rev.id} className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col">
                    <div className="flex items-center gap-1 text-[#F5B82E] mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < rev.rating ? 'fill-[#F5B82E]' : 'text-neutral-200'}`}
                        />
                      ))}
                    </div>
                    {rev.title && (
                      <h3 className="font-display font-bold text-sm text-[#252525] mb-1">{rev.title}</h3>
                    )}
                    <p className="text-sm text-neutral-600 leading-relaxed flex-1 mb-4">{rev.comment}</p>
                    <div className="text-xs text-neutral-500 border-t border-neutral-100 pt-3 flex items-center justify-between">
                      <span className="font-semibold text-[#252525]">{rev.userName}</span>
                      {rev.verifiedPurchase && <span className="text-[#176B3A] font-medium">Verified Buyer</span>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* M. NEWSLETTER */}
      {vis.newsletter && (
        <section className="bg-[#176B3A] text-white py-10">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold">{t.sections.newsletterTitle}</h2>
              <p className="text-sm text-emerald-100/90 mt-1">{t.sections.newsletterDesc}</p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="flex w-full md:w-auto max-w-md gap-2">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 bg-white text-[#252525] px-4 py-2.5 rounded-lg text-sm focus:outline-none"
              />
              <button
                type="submit"
                disabled={newsletterBusy}
                className="px-5 py-2.5 rounded-lg bg-[#F5B82E] hover:bg-[#e5a820] text-[#1D241E] font-bold text-sm whitespace-nowrap transition-colors"
              >
                {newsletterBusy ? 'Saving...' : t.sections.subscribe}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
};
