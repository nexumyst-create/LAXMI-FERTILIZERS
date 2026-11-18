import React from 'react';
import { Home, LayoutGrid, Package, ShoppingCart, User } from 'lucide-react';
import { AdminShell } from './components/admin/AdminShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AccountPage } from './components/store/AccountPage';
import { AuthModal } from './components/store/AuthModal';
import { CartDrawer } from './components/store/CartDrawer';
import { CatalogPage } from './components/store/CatalogPage';
import { CheckoutPage } from './components/store/CheckoutPage';
import { Footer } from './components/store/Footer';
import { Header } from './components/store/Header';
import { HomePage } from './components/store/HomePage';
import { OrdersPage } from './components/store/OrdersPage';
import { PolicyPage } from './components/store/PolicyPages';
import { ProductDetailPage } from './components/store/ProductDetailPage';
import { WishlistPage } from './components/store/WishlistPage';
import { StoreProvider, useStore } from './context/StoreContext';

const ToastStack: React.FC = () => {
  const { toasts } = useStore();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-16 sm:bottom-5 right-4 z-50 space-y-2 max-w-sm no-print">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold text-white ${
            t.type === 'error' ? 'bg-red-600' : t.type === 'info' ? 'bg-neutral-800' : 'bg-[#176B3A]'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
};

const MobileBottomNav: React.FC = () => {
  const { currentPath, navigate, cartCount, setCartDrawerOpen, firebaseUser, setAuthModalOpen } = useStore();
  if (currentPath.startsWith('/admin')) return null;

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-neutral-200 flex items-center justify-around py-1.5 text-[11px] font-semibold text-neutral-600 no-print"
    >
      <button
        onClick={() => navigate('/')}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 ${currentPath === '/' ? 'text-[#176B3A]' : ''}`}
      >
        <Home className="w-4 h-4" />
        <span>Home</span>
      </button>
      <button
        onClick={() => navigate('/catalog')}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 ${currentPath === '/catalog' ? 'text-[#176B3A]' : ''}`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>Shop</span>
      </button>
      <button
        onClick={() => (firebaseUser ? navigate('/orders') : setAuthModalOpen(true))}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 ${currentPath === '/orders' ? 'text-[#176B3A]' : ''}`}
      >
        <Package className="w-4 h-4" />
        <span>Orders</span>
      </button>
      <button
        onClick={() => setCartDrawerOpen(true)}
        className="relative flex flex-col items-center gap-0.5 px-2 py-1"
      >
        <ShoppingCart className="w-4 h-4" />
        <span>Cart ({cartCount})</span>
      </button>
      <button
        onClick={() => (firebaseUser ? navigate('/account') : setAuthModalOpen(true))}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 ${currentPath === '/account' ? 'text-[#176B3A]' : ''}`}
      >
        <User className="w-4 h-4" />
        <span>Account</span>
      </button>
    </nav>
  );
};

const RouterView: React.FC = () => {
  const { currentPath } = useStore();

  if (currentPath.startsWith('/admin')) {
    return (
      <>
        <AdminShell />
        <AuthModal />
        <ToastStack />
      </>
    );
  }

  let content: React.ReactNode = <HomePage />;
  if (currentPath === '/' || currentPath === '') {
    content = <HomePage />;
  } else if (currentPath === '/catalog') {
    content = <CatalogPage />;
  } else if (currentPath.startsWith('/product/')) {
    const id = currentPath.replace('/product/', '').split('/')[0];
    content = <ProductDetailPage productId={id} />;
  } else if (currentPath === '/checkout') {
    content = <CheckoutPage />;
  } else if (currentPath === '/orders') {
    content = <OrdersPage />;
  } else if (currentPath === '/account') {
    content = <AccountPage />;
  } else if (currentPath === '/wishlist') {
    content = <WishlistPage />;
  } else {
    content = <PolicyPage page={currentPath} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white pb-14 sm:pb-0">
      <Header />
      <div className="flex-1">{content}</div>
      <Footer />
      <CartDrawer />
      <AuthModal />
      <MobileBottomNav />
      <ToastStack />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <RouterView />
      </StoreProvider>
    </ErrorBoundary>
  );
}
