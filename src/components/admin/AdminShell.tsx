import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  FolderTree,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Package,
  RefreshCw,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Star,
  Store,
  Tag,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { BrandLogo } from '../common/BrandLogo';
import {
  AdminBannersPanel,
  AdminBrandsPanel,
  AdminCategoriesPanel,
  AdminCouponsPanel,
  AdminInventoryPanel,
  AdminProductsPanel,
  AdminReviewsPanel,
} from './AdminCatalogAndInventory';
import { AdminOverviewPanel, AdminReportsPanel } from './AdminDashboardOverview';
import {
  AdminAuditLogsPanel,
  AdminCustomersPanel,
  AdminOrdersPanel,
  AdminPaymentsAndInvoicesPanel,
  AdminSettingsPanel,
  AdminStaffPanel,
} from './AdminOperationsAndSettings';

type AdminTab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'brands'
  | 'orders'
  | 'customers'
  | 'inventory'
  | 'payments'
  | 'coupons'
  | 'banners'
  | 'reviews'
  | 'reports'
  | 'invoices'
  | 'delivery'
  | 'notifications'
  | 'staff'
  | 'roles'
  | 'business-settings'
  | 'website-settings'
  | 'audit-logs';

const ADMIN_MENU: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
  { id: 'products', label: '2. Products', icon: Package },
  { id: 'categories', label: '3. Categories', icon: FolderTree },
  { id: 'brands', label: '4. Brands', icon: Award },
  { id: 'orders', label: '5. Orders', icon: ClipboardList },
  { id: 'customers', label: '6. Customers', icon: Users },
  { id: 'inventory', label: '7. Inventory / Stock', icon: Boxes },
  { id: 'payments', label: '8. Payments', icon: CreditCard },
  { id: 'coupons', label: '9. Coupons & Discounts', icon: Tag },
  { id: 'banners', label: '10. Homepage Banners', icon: ImageIcon },
  { id: 'reviews', label: '11. Reviews & Ratings', icon: Star },
  { id: 'reports', label: '12. Reports & Analytics', icon: BarChart3 },
  { id: 'invoices', label: '13. GST & Invoices', icon: FileText },
  { id: 'delivery', label: '14. Delivery Management', icon: Truck },
  { id: 'notifications', label: '15. Notifications', icon: Bell },
  { id: 'staff', label: '16. Staff Management', icon: Shield },
  { id: 'roles', label: '17. Roles & Permissions', icon: Lock },
  { id: 'business-settings', label: '18. Business Settings', icon: Store },
  { id: 'website-settings', label: '19. Website Settings', icon: Globe },
  { id: 'audit-logs', label: '20. Security & Activity Logs', icon: Settings },
];

export const AdminShell: React.FC = () => {
  const {
    firebaseUser,
    authReady,
    isAdmin,
    userRole,
    signInWithGoogle,
    signInWithEmail,
    resendEmailVerification,
    refreshUserSession,
    logout,
    navigate,
    allOrders,
    myNotifications,
  } = useStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center text-sm">Verifying Admin Session...</div>;
  }

  const handleAdminEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signInWithEmail(adminEmail.trim(), adminPassword);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.';
      if (msg.includes('operation-not-allowed')) {
        setAuthError(
          'Email/Password authentication is not yet enabled in Firebase Console (Authentication → Sign-in method). Use Google Sign-In or enable Email/Password.'
        );
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAdminGoogleLogin = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  if (!firebaseUser || !isAdmin) {
    const needsEmailVerify = Boolean(firebaseUser && !firebaseUser.emailVerified);
    return (
      <div className="min-h-screen bg-[#F3F8F1] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 p-7 shadow-sm space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-[#252525]">
              {needsEmailVerify ? 'Verify Admin Email' : 'Administrator Sign In'}
            </h1>
            <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
              {needsEmailVerify
                ? `Signed in as ${firebaseUser?.email}. Click the verification link in your email inbox to activate admin access.`
                : firebaseUser
                ? `Signed in as ${firebaseUser.email} (${userRole}). This account does not have staff or admin access.`
                : 'Sign in with your administrator Email & Password or Super Admin Google account.'}
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 leading-relaxed">
              {authError}
            </div>
          )}

          {needsEmailVerify ? (
            <div className="space-y-2.5">
              <button
                onClick={refreshUserSession}
                className="w-full py-2.5 rounded-lg bg-[#176B3A] text-white text-xs font-bold inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                I Have Verified My Email
              </button>
              <button
                onClick={resendEmailVerification}
                className="w-full py-2.5 rounded-lg border border-neutral-300 text-xs font-semibold"
              >
                Resend Verification Email
              </button>
              <button
                onClick={logout}
                className="w-full py-2 text-xs text-neutral-500 hover:text-neutral-800"
              >
                Sign out and switch account
              </button>
            </div>
          ) : !firebaseUser ? (
            <div className="space-y-4">
              <button
                type="button"
                disabled={authBusy}
                onClick={handleAdminGoogleLogin}
                className="w-full py-2.5 px-4 rounded-lg border border-neutral-300 hover:bg-[#F3F8F1] flex items-center justify-center gap-2 text-xs font-bold text-[#252525] transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-[#176B3A]" />
                Continue with Google (Super Admin)
              </button>

              <div className="relative flex items-center justify-center text-[11px] text-neutral-400">
                <span className="bg-white px-2 z-10">OR SIGN IN WITH EMAIL</span>
                <div className="absolute inset-x-0 h-px bg-neutral-200" />
              </div>

              <form onSubmit={handleAdminEmailLogin} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Admin Email</label>
                  <input
                    required
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      required
                      type={showAdminPass ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className="w-full border border-neutral-200 rounded-lg pl-3 pr-9 py-2.5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass((p) => !p)}
                      aria-label={showAdminPass ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500"
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full py-2.5 rounded-lg bg-[#176B3A] hover:bg-[#12552e] text-white font-bold"
                >
                  {authBusy ? 'Signing In...' : 'Sign In as Administrator'}
                </button>
              </form>
            </div>
          ) : (
            <button
              onClick={logout}
              className="w-full py-2.5 rounded-lg bg-[#176B3A] text-white text-xs font-bold"
            >
              Sign Out & Switch Account
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-lg border border-neutral-300 text-xs font-semibold hover:bg-neutral-50"
          >
            Return to Storefront
          </button>
        </div>
      </div>
    );
  }

  const activeItem = ADMIN_MENU.find((m) => m.id === activeTab);

  const renderPanel = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminOverviewPanel />;
      case 'products':
        return <AdminProductsPanel />;
      case 'categories':
        return <AdminCategoriesPanel />;
      case 'brands':
        return <AdminBrandsPanel />;
      case 'orders':
      case 'delivery':
        return <AdminOrdersPanel />;
      case 'customers':
        return <AdminCustomersPanel />;
      case 'inventory':
        return <AdminInventoryPanel />;
      case 'payments':
        return <AdminPaymentsAndInvoicesPanel mode="payments" />;
      case 'invoices':
        return <AdminPaymentsAndInvoicesPanel mode="invoices" />;
      case 'coupons':
        return <AdminCouponsPanel />;
      case 'banners':
        return <AdminBannersPanel />;
      case 'reviews':
        return <AdminReviewsPanel />;
      case 'reports':
        return <AdminReportsPanel />;
      case 'notifications':
        return (
          <div className="bg-white rounded-xl border border-neutral-200 p-5 text-xs space-y-2">
            <h3 className="font-display font-bold text-base mb-2">Recent Order Notifications</h3>
            {allOrders.slice(0, 10).map((o) => (
              <div key={o.id} className="py-2 border-b border-neutral-100 flex justify-between">
                <span>
                  Order <strong>{o.orderNumber}</strong> ({o.customerName}) — {o.orderStatus}
                </span>
                <span className="text-neutral-500">{o.customerPhone}</span>
              </div>
            ))}
            {myNotifications.length === 0 && allOrders.length === 0 && (
              <p className="text-neutral-500">Order notifications will appear here as orders arrive.</p>
            )}
          </div>
        );
      case 'staff':
      case 'roles':
        return <AdminStaffPanel />;
      case 'business-settings':
      case 'website-settings':
        return <AdminSettingsPanel />;
      case 'audit-logs':
        return <AdminAuditLogsPanel />;
      default:
        return <AdminOverviewPanel />;
    }
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#0F3F23] text-emerald-50">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-left">
          <BrandLogo onDark compact />
        </button>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 text-xs">
        {ADMIN_MENU.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors text-left ${
                active ? 'bg-[#F5B82E] text-[#1D241E] font-bold' : 'text-emerald-100/85 hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-red-200 hover:bg-red-500/20 mt-3 text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>21. Logout</span>
        </button>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3F8F1] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">{SidebarContent}</aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 h-full">{SidebarContent}</aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden p-2 rounded-lg border border-neutral-200"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <p className="text-[11px] text-neutral-500">Admin Console / {userRole}</p>
              <h1 className="font-display font-bold text-base sm:text-lg text-[#252525]">{activeItem?.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-3.5 py-2 rounded-lg border border-neutral-200 text-xs font-semibold hover:bg-[#F3F8F1] whitespace-nowrap"
            >
              View Live Storefront
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">{renderPanel()}</main>
      </div>
    </div>
  );
};
