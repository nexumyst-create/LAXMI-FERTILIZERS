import React from 'react';
import { Heart } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from './ProductCard';

export const WishlistPage: React.FC = () => {
  const { wishlist, products, navigate } = useStore();
  const wishedProducts = products.filter((p) => wishlist.includes(p.id) && p.active);

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#252525]">My Wishlist</h1>
          <p className="text-xs text-neutral-500 mt-1">{wishedProducts.length} saved agricultural products</p>
        </div>
        <button
          onClick={() => navigate('/catalog')}
          className="px-4 py-2 rounded-lg bg-[#176B3A] text-white text-xs font-semibold"
        >
          Browse Catalog
        </button>
      </div>

      {wishedProducts.length === 0 ? (
        <div className="bg-[#F3F8F1] rounded-xl border border-neutral-200 p-12 text-center">
          <Heart className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="font-display font-bold text-base mb-1">Your wishlist is empty</p>
          <p className="text-xs text-neutral-600">Tap the heart icon on any fertilizer, seed, or pesticide to save it for later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {wishedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
};
