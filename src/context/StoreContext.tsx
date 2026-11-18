import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import {
  DEFAULT_STORE_SETTINGS,
  DEMO_BANNERS,
  DEMO_BRANDS,
  DEMO_CATEGORIES,
  DEMO_COUPONS,
  DEMO_PRODUCTS,
  DEMO_REVIEWS,
  DEMO_SUPPLIERS,
} from '../data/demoCatalog';
import {
  AdminRole,
  AdminUserRecord,
  AppNotification,
  Banner,
  Brand,
  CartItem,
  Category,
  Coupon,
  DeliveryAddress,
  InvoiceRecord,
  Language,
  Order,
  OrderStatus,
  PackSizeOption,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductQuestion,
  Review,
  StockMovement,
  StoreSettings,
  Supplier,
  UserProfile,
} from '../types';

const SUPER_ADMIN_EMAIL = 'nexumyst@gmail.com';
const GUEST_CART_KEY = 'laksmi_guest_cart_v1';
const GUEST_WISHLIST_KEY = 'laksmi_guest_wishlist_v1';
const LANG_KEY = 'laksmi_lang_v1';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface PlaceOrderPayload {
  shippingAddress: DeliveryAddress;
  paymentMethod: PaymentMethod;
  paymentRef?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  regulatedConsentAccepted: boolean;
  buyerLicenseRef?: string;
  customerGstin?: string;
}

interface StoreContextValue {
  // Routing
  currentPath: string;
  searchParams: URLSearchParams;
  navigate: (to: string) => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Auth & RBAC
  firebaseUser: FirebaseUser | null;
  authReady: boolean;
  userProfile: UserProfile | null;
  adminRecord: AdminUserRecord | null;
  userRole: AdminRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  refreshUserSession: () => Promise<void>;
  logout: () => Promise<void>;
  saveUserProfile: (updates: Partial<UserProfile>) => Promise<void>;

  // Catalog & Settings (merged live Firestore + Demo fallback)
  products: Product[];
  categories: Category[];
  brands: Brand[];
  banners: Banner[];
  coupons: Coupon[];
  reviews: Review[];
  questions: ProductQuestion[];
  settings: StoreSettings;
  catalogSyncedToDb: boolean;
  seedDemoCatalogToFirestore: () => Promise<void>;

  // Cart & Wishlist
  cart: CartItem[];
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  appliedCoupon: Coupon | null;
  couponError: string | null;
  applyCouponCode: (code: string) => boolean;
  removeCoupon: () => void;
  addToCart: (product: Product, packSize?: PackSizeOption, qty?: number, openDrawer?: boolean) => void;
  updateCartQty: (productId: string, packSize: string, qty: number) => void;
  changeCartPackSize: (productId: string, oldPackSize: string, newPack: PackSizeOption) => void;
  removeFromCart: (productId: string, packSize: string) => void;
  clearCart: () => Promise<void>;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;

  // Cart Math
  cartSubtotal: number;
  cartDiscount: number;
  cartDeliveryFee: number;
  cartGstTotal: number;
  cartGrandTotal: number;
  cartCount: number;

  // Orders & Notifications
  myOrders: Order[];
  myNotifications: AppNotification[];
  placeOrder: (payload: PlaceOrderPayload) => Promise<Order>;
  cancelCustomerOrder: (orderId: string, reason: string) => Promise<void>;
  requestCustomerReturn: (orderId: string, reason: string) => Promise<void>;
  reorderFromOrder: (order: Order) => void;
  markNotificationRead: (id: string) => Promise<void>;

  // Reviews & Q&A
  submitProductReview: (productId: string, rating: number, title: string, comment: string) => Promise<void>;
  submitProductQuestion: (productId: string, question: string) => Promise<void>;
  subscribeNewsletter: (email: string) => Promise<void>;

  // Admin Collections (loaded only for Staff/Admin)
  allOrders: Order[];
  allUsers: UserProfile[];
  allSuppliers: Supplier[];
  allStockMovements: StockMovement[];
  allInvoices: InvoiceRecord[];
  logAdminAudit: (action: string, entityType: string, entityId: string, details: string) => Promise<void>;

  // Toasts
  toasts: ToastItem[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Routing state synced with window.location
  const [locationUrl, setLocationUrl] = useState<string>(() => window.location.pathname + window.location.search);

  useEffect(() => {
    const handlePop = () => {
      setLocationUrl(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigate = useCallback((to: string) => {
    const normalized = to.startsWith('/') ? to : `/${to}`;
    window.history.pushState({}, '', normalized);
    setLocationUrl(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [currentPath, searchParams] = useMemo(() => {
    const [pathPart, queryPart] = locationUrl.split('?');
    return [pathPart || '/', new URLSearchParams(queryPart || '')];
  }, [locationUrl]);

  // Language
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'te' ? 'te' : 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_KEY, lang);
  }, []);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Auth & RBAC
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [adminRecord, setAdminRecord] = useState<AdminUserRecord | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Public Firestore State
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbBrands, setDbBrands] = useState<Brand[]>([]);
  const [dbBanners, setDbBanners] = useState<Banner[]>([]);
  const [dbCoupons, setDbCoupons] = useState<Coupon[]>([]);
  const [dbReviews, setDbReviews] = useState<Review[]>([]);
  const [dbQuestions, setDbQuestions] = useState<ProductQuestion[]>([]);
  const [dbSettings, setDbSettings] = useState<StoreSettings | null>(null);

  // User State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myNotifications, setMyNotifications] = useState<AppNotification[]>([]);

  // Admin State
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [allStockMovements, setAllStockMovements] = useState<StockMovement[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceRecord[]>([]);

  const seededOnceRef = useRef(false);

  // Role computation
  const isSuperAdmin = Boolean(
    firebaseUser?.email === SUPER_ADMIN_EMAIL && firebaseUser?.emailVerified
  );

  const userRole: AdminRole = useMemo(() => {
    if (isSuperAdmin) return 'SUPER_ADMIN';
    if (firebaseUser?.emailVerified && adminRecord?.active) {
      return adminRecord.role;
    }
    return 'CUSTOMER';
  }, [isSuperAdmin, firebaseUser, adminRecord]);

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'STAFF';

  // Effective Storefront Data (Firestore when populated, Demo fallback when empty)
  const catalogSyncedToDb = dbProducts.length > 0;
  const products = useMemo(() => (dbProducts.length > 0 ? dbProducts : DEMO_PRODUCTS), [dbProducts]);
  const categories = useMemo(
    () =>
      (dbCategories.length > 0 ? dbCategories : DEMO_CATEGORIES)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [dbCategories]
  );
  const brands = useMemo(() => (dbBrands.length > 0 ? dbBrands : DEMO_BRANDS), [dbBrands]);
  const banners = useMemo(
    () =>
      (dbBanners.length > 0 ? dbBanners : DEMO_BANNERS)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [dbBanners]
  );
  const coupons = useMemo(() => (dbCoupons.length > 0 ? dbCoupons : DEMO_COUPONS), [dbCoupons]);
  const reviews = useMemo(() => (dbReviews.length > 0 ? dbReviews : DEMO_REVIEWS), [dbReviews]);
  const questions = dbQuestions;
  const settings = useMemo(() => dbSettings || DEFAULT_STORE_SETTINGS, [dbSettings]);

  // Seed Demo Catalog into Firestore (for Admin / Super Admin)
  const seedDemoCatalogToFirestore = useCallback(async () => {
    if (!auth.currentUser || !isAdmin) return;
    try {
      const batch = writeBatch(db);
      for (const cat of DEMO_CATEGORIES) {
        batch.set(doc(db, 'categories', cat.id), { ...cat, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      }
      for (const br of DEMO_BRANDS) {
        batch.set(doc(db, 'brands', br.id), { ...br, createdAt: serverTimestamp() }, { merge: true });
      }
      for (const bn of DEMO_BANNERS) {
        batch.set(doc(db, 'banners', bn.id), bn, { merge: true });
      }
      for (const prod of DEMO_PRODUCTS) {
        batch.set(
          doc(db, 'products', prod.id),
          { ...prod, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
          { merge: true }
        );
        batch.set(
          doc(db, 'inventory', `inv_${prod.id}`),
          {
            productId: prod.id,
            sku: prod.sku,
            currentStock: prod.stock,
            reservedStock: 0,
            minThreshold: prod.minStockAlert,
            warehouseLocation: 'Main Agri Depot',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      for (const cp of DEMO_COUPONS) {
        batch.set(doc(db, 'coupons', cp.id), cp, { merge: true });
      }
      for (const sup of DEMO_SUPPLIERS) {
        batch.set(doc(db, 'suppliers', sup.id), sup, { merge: true });
      }
      batch.set(
        doc(db, 'settings', 'business'),
        { ...DEFAULT_STORE_SETTINGS, updatedAt: serverTimestamp() },
        { merge: true }
      );
      await batch.commit();

      for (const rv of DEMO_REVIEWS) {
        await setDoc(
          doc(db, 'reviews', rv.id),
          {
            productId: rv.productId,
            userId: auth.currentUser.uid,
            userName: rv.userName,
            rating: rv.rating,
            title: rv.title || '',
            comment: rv.comment,
            verifiedPurchase: true,
            approved: true,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      showToast('Demo agricultural catalog synced to Firestore.', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products/seed');
    }
  }, [isAdmin, showToast]);

  // Listen to Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      setAuthReady(true);
      if (u && u.emailVerified) {
        try {
          const userRef = doc(db, 'users', u.uid);
          const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', u.uid)));
          if (snap.empty) {
            await setDoc(userRef, {
              uid: u.uid,
              fullName: u.displayName || u.email?.split('@')[0] || 'Farmer Customer',
              email: u.email || '',
              phone: u.phoneNumber || '',
              addresses: [],
              language: 'en',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch {
          // Ignore non-fatal profile init race
        }
      } else if (!u) {
        setUserProfile(null);
        setAdminRecord(null);
        setMyOrders([]);
        setMyNotifications([]);
      }
    });
    return () => unsub();
  }, []);

  // Listen to Public Catalog Collections
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        collection(db, 'products'),
        (snap) => {
          const list = snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }));
          setDbProducts(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'products')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'categories'),
        (snap) => setDbCategories(snap.docs.map((d) => ({ ...(d.data() as Category), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'brands'),
        (snap) => setDbBrands(snap.docs.map((d) => ({ ...(d.data() as Brand), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'brands')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'banners'),
        (snap) => setDbBanners(snap.docs.map((d) => ({ ...(d.data() as Banner), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'banners')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'coupons'),
        (snap) => setDbCoupons(snap.docs.map((d) => ({ ...(d.data() as Coupon), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'coupons')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'reviews'),
        (snap) => setDbReviews(snap.docs.map((d) => ({ ...(d.data() as Review), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'reviews')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'questions'),
        (snap) => setDbQuestions(snap.docs.map((d) => ({ ...(d.data() as ProductQuestion), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'questions')
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'settings', 'business'),
        (snap) => {
          if (snap.exists()) {
            setDbSettings(snap.data() as StoreSettings);
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'settings/business')
      )
    );

    return () => unsubs.forEach((fn) => fn());
  }, []);

  // Auto-seed demo catalog once when Super Admin logs in and Firestore products are empty
  useEffect(() => {
    if (isSuperAdmin && !seededOnceRef.current && dbProducts.length === 0) {
      seededOnceRef.current = true;
      const timer = setTimeout(() => {
        if (dbProducts.length === 0) {
          seedDemoCatalogToFirestore().catch(() => {});
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuperAdmin, dbProducts.length, seedDemoCatalogToFirestore]);

  // Listen to User-Scoped Documents when Authenticated & Verified
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) return;
    const uid = firebaseUser.uid;
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'admins', uid),
        (snap) => {
          setAdminRecord(snap.exists() ? (snap.data() as AdminUserRecord) : null);
        },
        (err) => handleFirestoreError(err, OperationType.GET, `admins/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'carts', uid),
        (snap) => {
          if (snap.exists()) {
            const dbCart = (snap.data().items as CartItem[]) || [];
            setCart(dbCart);
            localStorage.setItem(GUEST_CART_KEY, JSON.stringify(dbCart));
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `carts/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'wishlists', uid),
        (snap) => {
          if (snap.exists()) {
            const ids = (snap.data().productIds as string[]) || [];
            setWishlist(ids);
            localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(ids));
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `wishlists/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'orders'), where('userId', '==', uid), orderBy('createdAt', 'desc')),
        (snap) => setMyOrders(snap.docs.map((d) => ({ ...(d.data() as Order), id: d.id }))),
        () => {
          // Fallback without composite index if needed
          onSnapshot(
            query(collection(db, 'orders'), where('userId', '==', uid)),
            (snap2) => setMyOrders(snap2.docs.map((d) => ({ ...(d.data() as Order), id: d.id }))),
            (err2) => handleFirestoreError(err2, OperationType.LIST, 'orders')
          );
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', uid)),
        (snap) => setMyNotifications(snap.docs.map((d) => ({ ...(d.data() as AppNotification), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    return () => unsubs.forEach((fn) => fn());
  }, [authReady, firebaseUser]);

  // Listen to Admin Collections when user is Admin/Staff
  useEffect(() => {
    if (!authReady || !firebaseUser || !isAdmin) return;
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        collection(db, 'orders'),
        (snap) => setAllOrders(snap.docs.map((d) => ({ ...(d.data() as Order), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'users'),
        (snap) => setAllUsers(snap.docs.map((d) => ({ ...(d.data() as UserProfile), id: d.id } as UserProfile))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'suppliers'),
        (snap) => setAllSuppliers(snap.docs.map((d) => ({ ...(d.data() as Supplier), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'suppliers')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'stockMovements'),
        (snap) => setAllStockMovements(snap.docs.map((d) => ({ ...(d.data() as StockMovement), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'stockMovements')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'invoices'),
        (snap) => setAllInvoices(snap.docs.map((d) => ({ ...(d.data() as InvoiceRecord), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'invoices')
      )
    );

    return () => unsubs.forEach((fn) => fn());
  }, [authReady, firebaseUser, isAdmin]);

  // Sync Cart helper
  const persistCart = useCallback(
    async (nextCart: CartItem[], couponCode?: string) => {
      setCart(nextCart);
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextCart));
      if (firebaseUser && firebaseUser.emailVerified) {
        try {
          await setDoc(doc(db, 'carts', firebaseUser.uid), {
            userId: firebaseUser.uid,
            items: nextCart.slice(0, 50),
            couponCode: couponCode || appliedCoupon?.code || '',
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `carts/${firebaseUser.uid}`);
        }
      }
    },
    [firebaseUser, appliedCoupon]
  );

  const persistWishlist = useCallback(
    async (nextIds: string[]) => {
      setWishlist(nextIds);
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(nextIds));
      if (firebaseUser && firebaseUser.emailVerified) {
        try {
          await setDoc(doc(db, 'wishlists', firebaseUser.uid), {
            userId: firebaseUser.uid,
            productIds: nextIds.slice(0, 100),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `wishlists/${firebaseUser.uid}`);
        }
      }
    },
    [firebaseUser]
  );

  // Auth Actions
  const signInWithGoogle = useCallback(async () => {
    const res = await signInWithPopup(auth, googleProvider);
    setAuthModalOpen(false);
    showToast(`Welcome, ${res.user.displayName || res.user.email}`, 'success');
  }, [showToast]);

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await sendEmailVerification(cred.user);
      if (phone) {
        localStorage.setItem('laksmi_pending_phone', phone);
      }
      showToast('Account created! Verification email sent. Please verify your inbox.', 'info');
    },
    [showToast]
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        showToast('Please verify your email address to unlock checkout and account writes.', 'info');
      } else {
        setAuthModalOpen(false);
        showToast(`Signed in as ${cred.user.email}`, 'success');
      }
    },
    [showToast]
  );

  const sendPasswordReset = useCallback(
    async (email: string) => {
      await sendPasswordResetEmail(auth, email);
      showToast('Password reset link sent to your email.', 'success');
    },
    [showToast]
  );

  const resendEmailVerification = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      showToast('Verification email resent.', 'success');
    }
  }, [showToast]);

  const refreshUserSession = useCallback(async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      setFirebaseUser({ ...auth.currentUser });
      if (auth.currentUser.emailVerified) {
        setAuthModalOpen(false);
        showToast('Email verified! Welcome to Laksmi Agri Store.', 'success');
      } else {
        showToast('Email is not verified yet. Please click the link in your inbox.', 'info');
      }
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setAdminRecord(null);
    setUserProfile(null);
    showToast('Signed out successfully.', 'info');
  }, [showToast]);

  const saveUserProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!firebaseUser || !firebaseUser.emailVerified) {
        throw new Error('Please sign in with a verified email to save profile.');
      }
      const ref = doc(db, 'users', firebaseUser.uid);
      try {
        await updateDoc(ref, {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        showToast('Profile updated.', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    },
    [firebaseUser, showToast]
  );

  // Cart Actions
  const addToCart = useCallback(
    (product: Product, packSize?: PackSizeOption, qty = 1, openDrawer = true) => {
      const selectedPack = packSize || product.packSizes[0] || {
        label: 'Standard Pack',
        mrp: product.mrp,
        price: product.price,
        stock: product.stock,
      };
      if (product.stock <= 0 || selectedPack.stock <= 0) {
        showToast('This product pack is currently out of stock.', 'error');
        return;
      }

      const existingIdx = cart.findIndex(
        (c) => c.productId === product.id && c.packSize === selectedPack.label
      );
      const nextCart = [...cart];
      if (existingIdx >= 0) {
        const nextQty = Math.min(selectedPack.stock, nextCart[existingIdx].qty + qty);
        nextCart[existingIdx] = { ...nextCart[existingIdx], qty: nextQty };
      } else {
        nextCart.push({
          productId: product.id,
          productName: product.name,
          productImage: product.images[0] || '',
          packSize: selectedPack.label,
          unitPrice: selectedPack.price,
          mrp: selectedPack.mrp,
          gstRate: product.gstRate,
          hsnCode: product.hsnCode || '3105',
          qty: Math.min(selectedPack.stock, Math.max(1, qty)),
          licenseRequirement: product.licenseRequirement,
        });
      }
      persistCart(nextCart);
      showToast(`Added ${product.name} (${selectedPack.label}) to cart`, 'success');
      if (openDrawer) setCartDrawerOpen(true);
    },
    [cart, persistCart, showToast]
  );

  const updateCartQty = useCallback(
    (productId: string, packSize: string, qty: number) => {
      if (qty <= 0) {
        persistCart(cart.filter((i) => !(i.productId === productId && i.packSize === packSize)));
        return;
      }
      const product = products.find((p) => p.id === productId);
      const maxStock = product?.packSizes.find((ps) => ps.label === packSize)?.stock ?? product?.stock ?? 99;
      const clamped = Math.min(maxStock, qty);
      persistCart(
        cart.map((item) =>
          item.productId === productId && item.packSize === packSize ? { ...item, qty: clamped } : item
        )
      );
    },
    [cart, products, persistCart]
  );

  const changeCartPackSize = useCallback(
    (productId: string, oldPackSize: string, newPack: PackSizeOption) => {
      const nextCart = cart.map((item) =>
        item.productId === productId && item.packSize === oldPackSize
          ? {
              ...item,
              packSize: newPack.label,
              unitPrice: newPack.price,
              mrp: newPack.mrp,
              qty: Math.min(item.qty, Math.max(1, newPack.stock)),
            }
          : item
      );
      persistCart(nextCart);
    },
    [cart, persistCart]
  );

  const removeFromCart = useCallback(
    (productId: string, packSize: string) => {
      persistCart(cart.filter((i) => !(i.productId === productId && i.packSize === packSize)));
    },
    [cart, persistCart]
  );

  const clearCart = useCallback(async () => {
    setAppliedCoupon(null);
    setCouponError(null);
    await persistCart([], '');
  }, [persistCart]);

  const toggleWishlist = useCallback(
    (productId: string) => {
      const exists = wishlist.includes(productId);
      const next = exists ? wishlist.filter((id) => id !== productId) : [...wishlist, productId];
      persistWishlist(next);
      showToast(exists ? 'Removed from Wishlist' : 'Saved to Wishlist', 'info');
    },
    [wishlist, persistWishlist, showToast]
  );

  // Cart Calculations
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    [cart]
  );

  const applyCouponCode = useCallback(
    (rawCode: string): boolean => {
      const code = rawCode.trim().toUpperCase();
      if (!code) {
        setCouponError('Enter a coupon code');
        return false;
      }
      const found = coupons.find((c) => c.code.toUpperCase() === code && c.active);
      if (!found) {
        setCouponError('Invalid or inactive coupon code.');
        return false;
      }
      const now = new Date().toISOString().slice(0, 10);
      if (found.startDate && now < found.startDate) {
        setCouponError('This coupon is not active yet.');
        return false;
      }
      if (found.expiryDate && now > found.expiryDate) {
        setCouponError('This coupon has expired.');
        return false;
      }
      if (found.usageLimit && found.usedCount >= found.usageLimit) {
        setCouponError('Coupon usage limit reached.');
        return false;
      }
      if (cartSubtotal < found.minOrderValue) {
        setCouponError(`Minimum order value of ₹${found.minOrderValue} required.`);
        return false;
      }
      if (found.categoryId) {
        const hasCat = cart.some((item) => {
          const p = products.find((pr) => pr.id === item.productId);
          return p?.categoryId === found.categoryId;
        });
        if (!hasCat) {
          setCouponError('Coupon applies only to eligible category products in cart.');
          return false;
        }
      }
      setAppliedCoupon(found);
      setCouponError(null);
      showToast(`Coupon ${found.code} applied!`, 'success');
      return true;
    },
    [coupons, cartSubtotal, cart, products, showToast]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponError(null);
  }, []);

  const cartDiscount = useMemo(() => {
    if (!appliedCoupon || cartSubtotal < appliedCoupon.minOrderValue) return 0;
    if (appliedCoupon.discountType === 'FIXED') {
      return Math.min(cartSubtotal, appliedCoupon.discountValue);
    }
    const pct = (cartSubtotal * appliedCoupon.discountValue) / 100;
    return Math.round(appliedCoupon.maxDiscount ? Math.min(pct, appliedCoupon.maxDiscount) : pct);
  }, [appliedCoupon, cartSubtotal]);

  const cartDeliveryFee = useMemo(() => {
    if (cart.length === 0) return 0;
    return cartSubtotal - cartDiscount >= settings.freeDeliveryThreshold ? 0 : settings.standardDeliveryFee;
  }, [cart.length, cartSubtotal, cartDiscount, settings]);

  // GST calculated proportionally on discounted line items (Prices shown are GST-inclusive as standard in Indian agri retail, and GST component is itemized for invoice)
  const cartGstTotal = useMemo(() => {
    if (cartSubtotal === 0) return 0;
    const discountRatio = Math.max(0, (cartSubtotal - cartDiscount) / cartSubtotal);
    return Math.round(
      cart.reduce((sum, item) => {
        const line = item.unitPrice * item.qty * discountRatio;
        const gstPart = line - line / (1 + item.gstRate / 100);
        return sum + gstPart;
      }, 0)
    );
  }, [cart, cartSubtotal, cartDiscount]);

  const cartGrandTotal = useMemo(
    () => Math.max(0, cartSubtotal - cartDiscount + cartDeliveryFee),
    [cartSubtotal, cartDiscount, cartDeliveryFee]
  );

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  // Place Order with Server Payment Verification & Stock Transaction
  const placeOrder = useCallback(
    async (payload: PlaceOrderPayload): Promise<Order> => {
      if (!firebaseUser || !firebaseUser.emailVerified) {
        throw new Error('Please sign in with a verified account before placing an order.');
      }
      if (cart.length === 0) {
        throw new Error('Your cart is empty.');
      }

      // Enforce regulated product consent
      const needsConsent = cart.some((c) => c.licenseRequirement !== 'none');
      const needsLicense = cart.some((c) => c.licenseRequirement === 'licensed_buyer');
      if (needsConsent && !payload.regulatedConsentAccepted) {
        throw new Error('Please confirm the agricultural input safety & label usage declaration.');
      }
      if (needsLicense && !payload.buyerLicenseRef?.trim()) {
        throw new Error('A valid Buyer / Dealer Agricultural License Reference is required for restricted crop protection items in your cart.');
      }

      // Server-side Payment Verification
      let paymentStatus: PaymentStatus = 'PENDING';
      let verifiedRef = payload.paymentRef || '';
      let verifiedByServer = false;

      if (payload.paymentMethod === 'RAZORPAY') {
        const verifyRes = await fetch('/api/payments/razorpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: payload.razorpayOrderId,
            razorpay_payment_id: payload.razorpayPaymentId,
            razorpay_signature: payload.razorpaySignature,
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.verified) {
          throw new Error(verifyData.error || 'Server payment verification failed.');
        }
        paymentStatus = 'PAID';
        verifiedRef = verifyData.paymentId;
        verifiedByServer = true;
      } else {
        const verifyRes = await fetch('/api/payments/verify-reference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: payload.paymentMethod,
            reference: payload.paymentRef || '',
            amount: cartGrandTotal,
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.verified) {
          throw new Error(verifyData.error || 'Payment reference validation failed.');
        }
        paymentStatus = verifyData.paymentStatus;
        verifiedRef = `${payload.paymentRef ? payload.paymentRef + ' · ' : ''}${verifyData.verificationToken}`;
        verifiedByServer = true;
      }

      const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const orderNumber = `LKS-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
      const nowIso = new Date().toISOString();

      const timeline = [
        {
          status: 'ORDER_PLACED' as OrderStatus,
          label: 'Order Placed',
          timestamp: nowIso,
          note: `Payment via ${payload.paymentMethod} (${paymentStatus})`,
        },
      ];

      // Decrement Firestore product stock inside transaction where product exists in Firestore
      try {
        await runTransaction(db, async (tx) => {
          for (const item of cart) {
            const pRef = doc(db, 'products', item.productId);
            const pSnap = await tx.get(pRef);
            if (pSnap.exists()) {
              const currentStock = Number(pSnap.data().stock || 0);
              if (currentStock < item.qty) {
                throw new Error(`Insufficient stock for ${item.productName} (Available: ${currentStock})`);
              }
              tx.update(pRef, {
                stock: currentStock - item.qty,
                updatedAt: serverTimestamp(),
              });
            }
          }
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes('Insufficient stock')) {
          throw err;
        }
        // If permission/offline issue on stock tx, report via handleFirestoreError
        handleFirestoreError(err, OperationType.WRITE, 'products/stock-transaction');
      }

      const orderDoc = {
        orderNumber,
        userId: firebaseUser.uid,
        customerName: payload.shippingAddress.fullName,
        customerPhone: payload.shippingAddress.phone,
        customerEmail: firebaseUser.email || '',
        shippingAddress: payload.shippingAddress,
        items: cart,
        subtotal: cartSubtotal,
        discountTotal: cartDiscount,
        couponCode: appliedCoupon?.code || '',
        deliveryCharge: cartDeliveryFee,
        gstTotal: cartGstTotal,
        grandTotal: cartGrandTotal,
        paymentMethod: payload.paymentMethod,
        paymentStatus,
        paymentRef: verifiedRef,
        orderStatus: 'ORDER_PLACED' as OrderStatus,
        regulatedConsentAccepted: payload.regulatedConsentAccepted,
        buyerLicenseRef: payload.buyerLicenseRef || '',
        timeline,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'orders', orderId), orderDoc);

        cart.forEach((item, idx) => {
          const lineTotal = item.unitPrice * item.qty;
          const gstAmount = Math.round(lineTotal - lineTotal / (1 + item.gstRate / 100));
          batch.set(doc(db, 'orderItems', `${orderId}_${idx}`), {
            orderId,
            userId: firebaseUser.uid,
            productId: item.productId,
            productName: item.productName,
            packSize: item.packSize,
            qty: item.qty,
            unitPrice: item.unitPrice,
            gstRate: item.gstRate,
            gstAmount,
            lineTotal,
          });
        });

        batch.set(doc(db, 'payments', `pay_${orderId}`), {
          orderId,
          userId: firebaseUser.uid,
          amount: cartGrandTotal,
          method: payload.paymentMethod,
          status: paymentStatus,
          gatewayRef: verifiedRef,
          verifiedByServer,
          createdAt: serverTimestamp(),
        });

        const taxableValue = Math.max(0, cartGrandTotal - cartDeliveryFee - cartGstTotal);
        batch.set(doc(db, 'invoices', `inv_${orderId}`), {
          invoiceNumber: `INV-${orderNumber}`,
          orderId,
          userId: firebaseUser.uid,
          customerName: payload.shippingAddress.fullName,
          customerGstin: payload.customerGstin || '',
          items: cart,
          taxableValue,
          cgst: Math.round(cartGstTotal / 2),
          sgst: Math.round(cartGstTotal - Math.round(cartGstTotal / 2)),
          grandTotal: cartGrandTotal,
          issuedAt: serverTimestamp(),
        });

        batch.set(doc(db, 'notifications', `notif_${orderId}`), {
          userId: firebaseUser.uid,
          channel: 'IN_APP',
          title: `Order ${orderNumber} Placed`,
          message: `Thank you! Your order of ₹${cartGrandTotal.toLocaleString('en-IN')} has been placed and is awaiting confirmation.`,
          orderId,
          status: 'SENT',
          read: false,
          createdAt: serverTimestamp(),
        });

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
      }

      // Trigger server notification webhook if configured
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'SMS',
          recipient: payload.shippingAddress.phone,
          title: `Order ${orderNumber} Placed`,
          message: `Laksmi Agri Store: Order ${orderNumber} for ₹${cartGrandTotal} placed.`,
          orderNumber,
        }),
      }).catch(() => {});

      await clearCart();
      showToast(`Order ${orderNumber} placed successfully!`, 'success');
      return { ...orderDoc, id: orderId };
    },
    [
      firebaseUser,
      cart,
      cartSubtotal,
      cartDiscount,
      cartDeliveryFee,
      cartGstTotal,
      cartGrandTotal,
      appliedCoupon,
      clearCart,
      showToast,
    ]
  );

  const cancelCustomerOrder = useCallback(
    async (orderId: string, reason: string) => {
      const target = myOrders.find((o) => o.id === orderId);
      if (!target) return;
      const nextTimeline = [
        ...(target.timeline || []),
        {
          status: 'CANCELLED' as OrderStatus,
          label: 'Cancelled by Customer',
          timestamp: new Date().toISOString(),
          note: reason,
        },
      ];
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          orderStatus: 'CANCELLED',
          cancellationReason: reason.slice(0, 500),
          timeline: nextTimeline.slice(-15),
          updatedAt: serverTimestamp(),
        });
        showToast('Order cancelled.', 'info');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
      }
    },
    [myOrders, showToast]
  );

  const requestCustomerReturn = useCallback(
    async (orderId: string, reason: string) => {
      const target = myOrders.find((o) => o.id === orderId);
      if (!target) return;
      const nextTimeline = [
        ...(target.timeline || []),
        {
          status: target.orderStatus,
          label: 'Return Requested',
          timestamp: new Date().toISOString(),
          note: reason,
        },
      ];
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          returnReason: reason.slice(0, 500),
          timeline: nextTimeline.slice(-15),
          updatedAt: serverTimestamp(),
        });
        showToast('Return / refund request submitted.', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
      }
    },
    [myOrders, showToast]
  );

  const reorderFromOrder = useCallback(
    (order: Order) => {
      let added = 0;
      order.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod && prod.stock > 0) {
          const pack = prod.packSizes.find((ps) => ps.label === item.packSize) || prod.packSizes[0];
          addToCart(prod, pack, item.qty, false);
          added++;
        }
      });
      if (added > 0) {
        setCartDrawerOpen(true);
      } else {
        showToast('None of the items from this order are currently in stock.', 'error');
      }
    },
    [products, addToCart, showToast]
  );

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  }, []);

  const submitProductReview = useCallback(
    async (productId: string, rating: number, title: string, comment: string) => {
      if (!firebaseUser || !firebaseUser.emailVerified) {
        setAuthModalOpen(true);
        throw new Error('Sign in with a verified account to submit a review.');
      }
      const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const verifiedPurchase = myOrders.some((o) => o.items.some((i) => i.productId === productId));
      try {
        await setDoc(doc(db, 'reviews', id), {
          productId,
          userId: firebaseUser.uid,
          userName: userProfile?.fullName || firebaseUser.displayName || 'Verified Farmer',
          rating: Math.max(1, Math.min(5, rating)),
          title: title.slice(0, 140),
          comment: comment.slice(0, 1200),
          verifiedPurchase,
          approved: true,
          createdAt: serverTimestamp(),
        });
        showToast('Thank you for your review!', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `reviews/${id}`);
      }
    },
    [firebaseUser, userProfile, myOrders, showToast]
  );

  const submitProductQuestion = useCallback(
    async (productId: string, question: string) => {
      if (!firebaseUser || !firebaseUser.emailVerified) {
        setAuthModalOpen(true);
        throw new Error('Sign in with a verified account to ask a question.');
      }
      const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        await setDoc(doc(db, 'questions', id), {
          productId,
          userId: firebaseUser.uid,
          userName: userProfile?.fullName || firebaseUser.displayName || 'Customer',
          question: question.slice(0, 500),
          createdAt: serverTimestamp(),
        });
        showToast('Question submitted to Laksmi Agri Team.', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `questions/${id}`);
      }
    },
    [firebaseUser, userProfile, showToast]
  );

  const subscribeNewsletter = useCallback(
    async (email: string) => {
      const clean = email.trim().toLowerCase();
      if (!clean.includes('@')) throw new Error('Enter a valid email address.');
      const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        await setDoc(doc(db, 'newsletter', id), {
          email: clean.slice(0, 180),
          createdAt: serverTimestamp(),
        });
        showToast('Subscribed to seasonal crop updates & offers!', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `newsletter/${id}`);
      }
    },
    [showToast]
  );

  const logAdminAudit = useCallback(
    async (action: string, entityType: string, entityId: string, details: string) => {
      if (!firebaseUser) return;
      const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        await setDoc(doc(db, 'auditLogs', id), {
          actorUid: firebaseUser.uid,
          actorEmail: firebaseUser.email || '',
          action: action.slice(0, 120),
          entityType: entityType.slice(0, 60),
          entityId: entityId.slice(0, 128),
          details: details.slice(0, 1000),
          createdAt: serverTimestamp(),
        });
      } catch {
        // Non-blocking audit log
      }
    },
    [firebaseUser]
  );

  return (
    <StoreContext.Provider
      value={{
        currentPath,
        searchParams,
        navigate,
        language,
        setLanguage,
        firebaseUser,
        authReady,
        userProfile,
        adminRecord,
        userRole,
        isAdmin,
        isSuperAdmin,
        authModalOpen,
        setAuthModalOpen,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        sendPasswordReset,
        resendEmailVerification,
        refreshUserSession,
        logout,
        saveUserProfile,
        products,
        categories,
        brands,
        banners,
        coupons,
        reviews,
        questions,
        settings,
        catalogSyncedToDb,
        seedDemoCatalogToFirestore,
        cart,
        cartDrawerOpen,
        setCartDrawerOpen,
        appliedCoupon,
        couponError,
        applyCouponCode,
        removeCoupon,
        addToCart,
        updateCartQty,
        changeCartPackSize,
        removeFromCart,
        clearCart,
        wishlist,
        toggleWishlist,
        cartSubtotal,
        cartDiscount,
        cartDeliveryFee,
        cartGstTotal,
        cartGrandTotal,
        cartCount,
        myOrders,
        myNotifications,
        placeOrder,
        cancelCustomerOrder,
        requestCustomerReturn,
        reorderFromOrder,
        markNotificationRead,
        submitProductReview,
        submitProductQuestion,
        subscribeNewsletter,
        allOrders,
        allUsers,
        allSuppliers,
        allStockMovements,
        allInvoices,
        logAdminAudit,
        toasts,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
