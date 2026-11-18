import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  Globe,
  Heart,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { getT } from '../../i18n/translations';
import { BrandLogo } from '../common/BrandLogo';

export const Header: React.FC = () => {
  const {
    language,
    setLanguage,
    navigate,
    currentPath,
    firebaseUser,
    isAdmin,
    setAuthModalOpen,
    cartCount,
    setCartDrawerOpen,
    wishlist,
    products,
    categories,
    settings,
  } = useStore();

  const t = getT(language);
  const [promoVisible, setPromoVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCatFilter, setSelectedCatFilter] = useState('all');

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return products
      .filter((p) => {
        if (!p.active) return false;
        if (selectedCatFilter !== 'all' && p.categoryId !== selectedCatFilter) return false;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.nameTe && p.nameTe.toLowerCase().includes(q)) ||
          p.brandName.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.cropTags.some((c) => c.toLowerCase().includes(q))
        );
      })
      .slice(0, 6);
  }, [searchQuery, products, selectedCatFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCatFilter !== 'all') params.set('category', selectedCatFilter);
    navigate(`/catalog?${params.toString()}`);
  };

  const categoryNavItems = [
    { label: t.nav.home, action: () => navigate('/') },
    { label: t.nav.fertilizers, action: () => navigate('/catalog?category=cat-fertilizers') },
    { label: t.nav.pesticides, action: () => navigate('/catalog?category=cat-pesticides') },
    { label: t.nav.seeds, action: () => navigate('/catalog?category=cat-seeds') },
    { label: t.nav.bioFertilizers, action: () => navigate('/catalog?category=cat-bio-products') },
    {
      label: t.nav.organicProducts,
      action: () => navigate('/catalog?category=cat-fertilizers&sub=Organic+Fertilizers'),
    },
    { label: t.nav.micronutrients, action: () => navigate('/catalog?category=cat-micronutrients') },
    { label: t.nav.farmingTools, action: () => navigate('/catalog?category=cat-farming-accessories') },
    { label: t.nav.offers, action: () => navigate('/catalog?offers=true') },
    { label: t.nav.contactUs, action: () => navigate('/contact') },
  ];

  const announcement =
    language === 'te' ? settings.topBarAnnouncementTe || settings.topBarAnnouncement : settings.topBarAnnouncement;

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm no-print">
      {/* A. Top Promotional Bar */}
      {promoVisible && announcement && (
        <div className="bg-[#114B29] text-white text-xs py-1.5 px-4">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="truncate font-medium">{announcement}</span>
              <button
                onClick={() => navigate('/catalog?offers=true')}
                className="shrink-0 bg-[#F5B82E] text-[#1D241E] font-semibold px-2.5 py-0.5 rounded text-[11px] hover:bg-[#eab027] transition-colors whitespace-nowrap"
              >
                {t.shopNow}
              </button>
            </div>
            <button
              onClick={() => setPromoVisible(false)}
              aria-label="Dismiss announcement"
              className="text-emerald-100/80 hover:text-white p-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* B. Main Navigation Header */}
      <div className="bg-[#176B3A] text-white">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-2.5 flex items-center gap-3 lg:gap-5">
          {/* Brand Logo */}
          <div className="flex items-center shrink-0">
            <button onClick={() => navigate('/')} className="text-left focus:outline-none">
              <BrandLogo onDark compact />
            </button>
          </div>

          {/* Large Amazon-style Product Search Bar (Desktop & Tablet) */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 relative max-w-2xl mx-auto">
            <div className="flex w-full rounded-lg overflow-hidden bg-white text-[#252525] shadow-sm ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#F5B82E]">
              <div className="relative hidden lg:flex items-center bg-neutral-100 border-r border-neutral-200">
                <select
                  aria-label="Filter search by category"
                  value={selectedCatFilter}
                  onChange={(e) => setSelectedCatFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-neutral-700 pl-3 pr-7 py-2.5 appearance-none focus:outline-none cursor-pointer"
                >
                  <option value="all">All Inputs</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {language === 'te' ? cat.nameTe : cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2 pointer-events-none" />
              </div>

              <input
                type="search"
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder={t.searchPlaceholder}
                className="flex-1 px-3.5 py-2 text-sm focus:outline-none min-w-0"
              />

              <button
                type="submit"
                aria-label={t.searchBtn}
                className="bg-[#F5B82E] hover:bg-[#e5a820] text-[#1D241E] px-4 flex items-center justify-center font-semibold text-sm transition-colors shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Live Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white text-[#252525] rounded-lg border border-neutral-200 shadow-lg z-50 overflow-hidden">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={() => {
                      setShowSuggestions(false);
                      navigate(`/product/${item.id}`);
                    }}
                    className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#F3F8F1] text-left border-b border-neutral-100 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#252525] truncate">
                        {language === 'te' && item.nameTe ? item.nameTe : item.name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {item.brandName} · {item.categoryName} · {item.sku}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#176B3A] tabular-nums shrink-0">
                      ₹{item.price.toLocaleString('en-IN')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1 sm:gap-2.5 ml-auto shrink-0">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}
              aria-label="Toggle language between English and Telugu"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px]"
            >
              <Globe className="w-4 h-4 text-[#F5B82E]" />
              <span>{language === 'en' ? 'EN / తెలుగు' : 'తెలుగు / EN'}</span>
            </button>

            {/* Admin Shortcut if authorized */}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
                  currentPath.startsWith('/admin')
                    ? 'bg-[#F5B82E] text-[#1D241E]'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t.adminPanel}</span>
              </button>
            )}

            {/* Orders */}
            <button
              onClick={() => (firebaseUser ? navigate('/orders') : setAuthModalOpen(true))}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs font-medium transition-colors whitespace-nowrap min-h-[40px]"
            >
              <Package className="w-4 h-4" />
              <span className="hidden xl:inline">{t.orders}</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={() => navigate('/wishlist')}
              aria-label={`${t.wishlist} (${wishlist.length})`}
              className="relative flex items-center justify-center px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors min-w-[40px] min-h-[40px]"
            >
              <span className="relative inline-flex">
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-2 -right-2.5 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-[#F5B82E] text-[#1D241E] text-[10px] font-bold leading-none tabular-nums shadow-sm">
                    {wishlist.length}
                  </span>
                )}
              </span>
            </button>

            {/* Shopping Cart */}
            <button
              onClick={() => setCartDrawerOpen(true)}
              aria-label={`${t.cart} (${cartCount})`}
              className="relative flex items-center justify-center bg-[#114B29] hover:bg-[#0d3b20] px-3 py-1.5 rounded-lg transition-colors min-w-[42px] min-h-[40px]"
            >
              <span className="relative inline-flex">
                <ShoppingCart className="w-5 h-5 text-[#F5B82E]" />
                <span className="absolute -top-2 -right-2.5 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-[#F5B82E] text-[#1D241E] text-[10px] font-bold leading-none tabular-nums shadow-sm">
                  {cartCount}
                </span>
              </span>
            </button>

            {/* Account / Profile (Last after Cart) */}
            <button
              onClick={() => (firebaseUser ? navigate('/account') : setAuthModalOpen(true))}
              aria-label={firebaseUser ? t.account : t.signIn}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs transition-colors whitespace-nowrap min-h-[40px]"
            >
              <User className="w-4 h-4" />
              <span className="hidden lg:inline font-medium">
                {firebaseUser ? firebaseUser.displayName?.split(' ')[0] || t.account : t.signIn}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-3 pb-2.5">
          <form onSubmit={handleSearchSubmit} className="flex w-full rounded-lg overflow-hidden bg-white text-[#252525]">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
            />
            <button
              type="submit"
              aria-label={t.searchBtn}
              className="bg-[#F5B82E] text-[#1D241E] px-3.5 flex items-center justify-center"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* C. Secondary Category Navigation Bar */}
      <nav aria-label="Primary categories" className="bg-[#12552E] text-white border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 flex items-center justify-start lg:justify-center gap-1 overflow-x-auto no-scrollbar py-1.5 text-xs font-medium">
          {categoryNavItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="px-2.5 lg:px-3 py-1.5 rounded hover:bg-white/15 transition-colors whitespace-nowrap shrink-0"
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
};
