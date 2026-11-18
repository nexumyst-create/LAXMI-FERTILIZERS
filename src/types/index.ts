export type Language = 'en' | 'te';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'CUSTOMER';

export type OrderStatus =
  | 'ORDER_PLACED'
  | 'PAYMENT_CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentMethod = 'COD' | 'UPI' | 'CARD' | 'NET_BANKING' | 'RAZORPAY';
export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'PAID' | 'FAILED' | 'REFUNDED';
export type LicenseRequirement = 'none' | 'farmer_declaration' | 'licensed_buyer';
export type CropSeason = 'Kharif' | 'Rabi' | 'Summer' | 'All';

export interface DeliveryAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  village: string;
  mandal: string;
  district: string;
  state: string;
  pinCode: string;
  isDefault?: boolean;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  village?: string;
  mandal?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  addresses?: DeliveryAddress[];
  language?: Language;
  buyerLicenseNo?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminUserRecord {
  uid: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
  permissions: string[];
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PackSizeOption {
  label: string;
  mrp: number;
  price: number;
  stock: number;
  skuSuffix?: string;
}

export interface Product {
  id: string;
  name: string;
  nameTe?: string;
  slug: string;
  sku: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  subcategory: string;
  description: string;
  descriptionTe?: string;
  packSizes: PackSizeOption[];
  mrp: number;
  price: number;
  costPrice?: number;
  gstRate: number;
  hsnCode: string;
  stock: number;
  minStockAlert: number;
  images: string[];
  specifications: string;
  manufacturer: string;
  registrationNumber?: string;
  licenseRequirement: LicenseRequirement;
  cropTags: string[];
  season: CropSeason;
  usageInstructions: string;
  safetyInstructions: string;
  batchNumber?: string;
  mfgDate?: string;
  expiryDate?: string;
  isFeatured: boolean;
  isBestSeller: boolean;
  isTodaysDeal: boolean;
  dealEndAt?: string;
  active: boolean;
  ratingAvg: number;
  ratingCount: number;
  isDemo?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Category {
  id: string;
  name: string;
  nameTe: string;
  slug: string;
  image: string;
  subcategories: string[];
  sortOrder: number;
  active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  description: string;
  featured: boolean;
  active: boolean;
}

export interface Banner {
  id: string;
  title: string;
  titleTe: string;
  subtitle: string;
  subtitleTe: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  placement: 'hero' | 'promo' | 'top_bar';
  sortOrder: number;
  active: boolean;
}

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  packSize: string;
  unitPrice: number;
  mrp: number;
  gstRate: number;
  hsnCode: string;
  qty: number;
  licenseRequirement: LicenseRequirement;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  label: string;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: DeliveryAddress;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  couponCode?: string;
  deliveryCharge: number;
  gstTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentRef?: string;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  courierName?: string;
  regulatedConsentAccepted?: boolean;
  buyerLicenseRef?: string;
  timeline: OrderTimelineEvent[];
  cancellationReason?: string;
  returnReason?: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  categoryId?: string;
  productId?: string;
  startDate?: string;
  expiryDate?: string;
  usageLimit?: number;
  perCustomerLimit?: number;
  usedCount: number;
  active: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  approved: boolean;
  createdAt: unknown;
}

export interface ProductQuestion {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  question: string;
  answer?: string;
  createdAt: unknown;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  active: boolean;
}

export interface PurchaseEntry {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  invoiceNo: string;
  createdAt: unknown;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RESERVE' | 'RELEASE';
  quantity: number;
  previousStock: number;
  newStock: number;
  batchNumber?: string;
  supplierId?: string;
  note?: string;
  actorUid: string;
  createdAt: unknown;
}

export interface AppNotification {
  id: string;
  userId: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
  title: string;
  message: string;
  orderId?: string;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  read: boolean;
  createdAt: unknown;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  orderId: string;
  userId: string;
  customerName: string;
  customerGstin?: string;
  items: CartItem[];
  taxableValue: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  issuedAt: unknown;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  fertilizerLicenseNo: string;
  pesticideLicenseNo: string;
  seedLicenseNo: string;
  freeDeliveryThreshold: number;
  standardDeliveryFee: number;
  topBarAnnouncement: string;
  topBarAnnouncementTe: string;
  sectionsVisibility: {
    hero: boolean;
    trustFeatures: boolean;
    shopByCategory: boolean;
    todaysDeals: boolean;
    bestSellers: boolean;
    seasonalProducts: boolean;
    featuredBrands: boolean;
    promoBanners: boolean;
    reviews: boolean;
    newsletter: boolean;
  };
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  createdAt: unknown;
}

export const FIELD_LIMITS = {
  NAME_MAX: 120,
  PRODUCT_NAME_MAX: 180,
  SKU_MAX: 64,
  DESC_MAX: 4000,
  COMMENT_MAX: 1200,
  QUESTION_MAX: 500,
  PHONE_MAX: 20,
  PIN_MAX: 10,
  ADDRESS_MAX: 300,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
};
