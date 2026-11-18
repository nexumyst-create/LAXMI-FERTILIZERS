import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from './ProductCard';

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'bestselling' | 'rating' | 'discount';

export const CatalogPage: React.FC = () => {
  const { products, categories, brands, searchParams, language } = useStore();

  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const initialSub = searchParams.get('sub') || 'all';
  const initialBrand = searchParams.get('brand') || 'all';
  const initialOffers = searchParams.get('offers') === 'true';
  const initialSort = (searchParams.get('sort') as SortOption) || 'relevance';

  const [queryText, setQueryText] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSub, setSelectedSub] = useState(initialSub);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [onlyOffers, setOnlyOffers] = useState(initialOffers);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState('All');
  const [packFilter, setPackFilter] = useState('All');
  const [maxPrice, setMaxPrice] = useState<number>(6000);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setQueryText(searchParams.get('q') || '');
    setSelectedCategory(searchParams.get('category') || 'all');
    setSelectedSub(searchParams.get('sub') || 'all');
    setSelectedBrand(searchParams.get('brand') || 'all');
    setOnlyOffers(searchParams.get('offers') === 'true');
    setSortBy((searchParams.get('sort') as SortOption) || 'relevance');
    setPage(1);
  }, [searchParams]);

  const activeCategoryObj = categories.find((c) => c.id === selectedCategory);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const list = products.filter((p) => {
      if (!p.active) return false;
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
      if (selectedSub !== 'all' && p.subcategory !== selectedSub) return false;
      if (selectedBrand !== 'all' && p.brandId !== selectedBrand) return false;
      if (onlyInStock && p.stock <= 0) return false;
      if (onlyOffers && !(p.isTodaysDeal || p.mrp > p.price)) return false;
      if (seasonFilter !== 'All' && p.season !== seasonFilter && p.season !== 'All') return false;
      if (p.price > maxPrice) return false;
      if (packFilter !== 'All') {
        const hasPack = p.packSizes.some((ps) => ps.label.toLowerCase().includes(packFilter.toLowerCase()));
        if (!hasPack) return false;
      }
      if (q) {
        const hit =
          p.name.toLowerCase().includes(q) ||
          (p.nameTe && p.nameTe.toLowerCase().includes(q)) ||
          p.brandName.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.cropTags.some((c) => c.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });

    const sorted = [...list];
    switch (sortBy) {
      case 'price_asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        sorted.sort((a, b) => b.ratingAvg - a.ratingAvg);
        break;
      case 'bestselling':
        sorted.sort((a, b) => Number(b.isBestSeller) - Number(a.isBestSeller) || b.ratingCount - a.ratingCount);
        break;
      case 'discount':
        sorted.sort((a, b) => {
          const da = a.mrp > a.price ? (a.mrp - a.price) / a.mrp : 0;
          const db = b.mrp > b.price ? (b.mrp - b.price) / b.mrp : 0;
          return db - da;
        });
        break;
      case 'newest':
        sorted.reverse();
        break;
      default:
        break;
    }
    return sorted;
  }, [
    products,
    queryText,
    selectedCategory,
    selectedSub,
    selectedBrand,
    onlyOffers,
    onlyInStock,
    seasonFilter,
    packFilter,
    maxPrice,
    sortBy,
  ]);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedProducts = filtered.slice((page - 1) * pageSize, page * pageSize);

  const resetAllFilters = () => {
    setQueryText('');
    setSelectedCategory('all');
    setSelectedSub('all');
    setSelectedBrand('all');
    setOnlyOffers(false);
    setOnlyInStock(false);
    setSeasonFilter('All');
    setPackFilter('All');
    setMaxPrice(6000);
    setSortBy('relevance');
    setPage(1);
  };

  const FiltersPanel = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-sm text-[#252525] flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-[#176B3A]" />
          Filters
        </h2>
        <button onClick={resetAllFilters} className="text-xs font-semibold text-[#176B3A] hover:underline">
          Reset All
        </button>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-bold text-neutral-700 mb-1.5">Category</label>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedSub('all');
            setPage(1);
          }}
          className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white"
        >
          <option value="all">All Categories</option>
          {categories
            .filter((c) => c.active)
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {language === 'te' ? cat.nameTe : cat.name}
              </option>
            ))}
        </select>
      </div>

      {/* Subcategory */}
      {activeCategoryObj && activeCategoryObj.subcategories.length > 0 && (
        <div>
          <label className="block text-xs font-bold text-neutral-700 mb-1.5">Subcategory</label>
          <select
            value={selectedSub}
            onChange={(e) => {
              setSelectedSub(e.target.value);
              setPage(1);
            }}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white"
          >
            <option value="all">All Subcategories</option>
            {activeCategoryObj.subcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Brand */}
      <div>
        <label className="block text-xs font-bold text-neutral-700 mb-1.5">Brand</label>
        <select
          value={selectedBrand}
          onChange={(e) => {
            setSelectedBrand(e.target.value);
            setPage(1);
          }}
          className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white"
        >
          <option value="all">All Brands</option>
          {brands
            .filter((b) => b.active)
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
        </select>
      </div>

      {/* Max Price */}
      <div>
        <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1.5">
          <span>Max Price</span>
          <span className="tabular-nums text-[#176B3A]">₹{maxPrice.toLocaleString('en-IN')}</span>
        </div>
        <input
          type="range"
          min={200}
          max={6000}
          step={100}
          value={maxPrice}
          onChange={(e) => {
            setMaxPrice(Number(e.target.value));
            setPage(1);
          }}
          className="w-full accent-[#176B3A]"
        />
      </div>

      {/* Season */}
      <div>
        <label className="block text-xs font-bold text-neutral-700 mb-1.5">Crop Season</label>
        <select
          value={seasonFilter}
          onChange={(e) => {
            setSeasonFilter(e.target.value);
            setPage(1);
          }}
          className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white"
        >
          <option value="All">All Seasons</option>
          <option value="Kharif">Kharif</option>
          <option value="Rabi">Rabi</option>
          <option value="Summer">Summer</option>
        </select>
      </div>

      {/* Pack Size Keyword */}
      <div>
        <label className="block text-xs font-bold text-neutral-700 mb-1.5">Pack Size</label>
        <select
          value={packFilter}
          onChange={(e) => {
            setPackFilter(e.target.value);
            setPage(1);
          }}
          className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white"
        >
          <option value="All">Any Pack Size</option>
          <option value="ml">Liquid (ml / Litre)</option>
          <option value="1 kg">1 kg</option>
          <option value="5 kg">5 kg</option>
          <option value="25 kg">25 kg / 50 kg Bulk</option>
          <option value="g">Small Pack (g)</option>
        </select>
      </div>

      {/* Toggles */}
      <div className="space-y-2 pt-2 border-t border-neutral-200">
        <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => setOnlyInStock(e.target.checked)}
            className="accent-[#176B3A]"
          />
          In Stock Only
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyOffers}
            onChange={(e) => setOnlyOffers(e.target.checked)}
            className="accent-[#176B3A]"
          />
          Special Offers & Deals
        </label>
      </div>
    </div>
  );

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#252525]">
            {activeCategoryObj
              ? language === 'te'
                ? activeCategoryObj.nameTe
                : activeCategoryObj.name
              : onlyOffers
              ? "Today's Deals & Agricultural Offers"
              : 'All Agricultural Products'}
          </h1>
          <p className="text-xs text-neutral-500 mt-1 tabular-nums">
            Showing {filtered.length} product{filtered.length === 1 ? '' : 's'}
            {queryText ? ` for "${queryText}"` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={queryText}
              onChange={(e) => {
                setQueryText(e.target.value);
                setPage(1);
              }}
              placeholder="Filter within results..."
              className="pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-xs w-52 focus:outline-none focus:border-[#176B3A]"
            />
          </div>

          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-xs font-semibold"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </button>

          <select
            aria-label="Sort products"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:border-[#176B3A]"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="bestselling">Best Selling</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
            <option value="discount">Highest Discount</option>
            <option value="newest">New Arrivals</option>
          </select>
        </div>
      </div>

      <div className="flex gap-7">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 sticky top-28">{FiltersPanel}</div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1 min-w-0">
          {pagedProducts.length === 0 ? (
            <div className="bg-[#F3F8F1] rounded-xl border border-neutral-200 p-12 text-center">
              <p className="font-display font-bold text-base text-[#252525] mb-1">
                No agricultural products matched your filters
              </p>
              <p className="text-xs text-neutral-600 mb-4">
                Try clearing price caps or switching category filters.
              </p>
              <button
                onClick={resetAllFilters}
                className="px-4 py-2 rounded-lg bg-[#176B3A] text-white text-xs font-semibold hover:bg-[#12552e]"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {pagedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPage(idx + 1)}
                      className={`w-9 h-9 rounded-lg text-xs font-bold tabular-nums border ${
                        page === idx + 1
                          ? 'bg-[#176B3A] text-white border-[#176B3A]'
                          : 'bg-white text-[#252525] border-neutral-200 hover:border-[#176B3A]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative z-10 w-80 max-w-[85vw] bg-white h-full p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="font-display font-bold text-base">Filter Catalog</span>
              <button onClick={() => setMobileFiltersOpen(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            {FiltersPanel}
          </div>
        </div>
      )}
    </main>
  );
};
