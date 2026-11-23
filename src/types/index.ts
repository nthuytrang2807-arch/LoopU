export type AppLang = 'vi' | 'en';

export type ActiveView = 'marketplace' | 'sell' | 'orders' | 'green_credit' | 'admin' | 'account';

export type ProductCategory =
  | 'textbooks'
  | 'tech'
  | 'dorm'
  | 'stationery'
  | 'mobility';

export type ProductCondition = 'new' | 'like_new' | 'good';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'vietqr' | 'loop_wallet';

export interface ProductReview {
  id: string;
  productId: string;
  authorName: string;
  authorUniversity: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  titleEn: string;
  category: ProductCategory;
  condition: ProductCondition;
  price: number;
  originalPrice: number;
  stock: number;
  campus: string;
  sellerId: string;
  sellerName: string;
  sellerUniversity: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  description: string;
  descriptionEn: string;
  featured: boolean;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  title: string;
  titleEn: string;
  price: number;
  quantity: number;
  imageUrl: string;
  campus: string;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerUniversity: string;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  note: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  university: string;
  studentId: string;
  dormAddress: string;
  bio: string;
  role: 'student' | 'admin';
  verificationMethod?: 'student_email' | 'cccd';
  cccdVerified?: boolean;
  cccdMasked?: string | null;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
}

export interface AdminOverviewData {
  kpis: {
    totalRevenue: number;
    activeOrders: number;
    totalProducts: number;
    totalStudents: number;
    completedOrders: number;
  };
  categoryStats: Array<{
    category: ProductCategory;
    productCount: number;
    revenue: number;
    unitsSold: number;
  }>;
  orders: Order[];
  products: Product[];
  users: UserProfile[];
  supportMessages: SupportMessage[];
}

export interface GreenCreditTransaction {
  id: string;
  type: 'earn' | 'redeem';
  points: number;
  title: string;
  titleEn: string;
  category: 'checkin' | 'order' | 'listing' | 'reward';
  createdAt: string;
}

export interface GreenVoucher {
  id: string;
  rewardId: string;
  code: string;
  title: string;
  titleEn: string;
  pointsCost: number;
  discountLabel: string;
  createdAt: string;
}

export interface GreenRewardOption {
  id: string;
  pointsCost: number;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  discountLabel: string;
}

export interface GreenCreditSummary {
  balance: number;
  lastCheckinDate: string | null;
  canCheckinToday: boolean;
  circularItemsCount: number;
  co2SavedKg: number;
  rewards: GreenRewardOption[];
  transactions: GreenCreditTransaction[];
  vouchers: GreenVoucher[];
}

