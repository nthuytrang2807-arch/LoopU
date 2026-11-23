import {
  AdminOverviewData,
  GreenCreditSummary,
  GreenVoucher,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductCategory,
  ProductCondition,
  ProductReview,
  SupportMessage,
  UserProfile,
} from '../types';

// Session tokens held strictly in JS memory (never localStorage/sessionStorage)
let studentToken: string | null = null;
let adminToken: string | null = null;

export function setStudentToken(token: string | null) {
  studentToken = token;
}

export function getStudentToken(): string | null {
  return studentToken;
}

export function setAdminToken(token: string | null) {
  adminToken = token;
}

export function getAdminToken(): string | null {
  return adminToken;
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  authScope: 'student' | 'admin' | 'none' = 'none'
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (authScope === 'student' && studentToken) {
    headers.set('Authorization', `Bearer ${studentToken}`);
  } else if (authScope === 'admin' && adminToken) {
    headers.set('Authorization', `Bearer ${adminToken}`);
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Yêu cầu thất bại.');
  }
  return data as T;
}

export const api = {
  // Products
  getProducts(params?: {
    q?: string;
    category?: string;
    condition?: string;
    sellerId?: string;
    sort?: string;
  }) {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.category && params.category !== 'all') sp.set('category', params.category);
    if (params?.condition && params.condition !== 'all') sp.set('condition', params.condition);
    if (params?.sellerId) sp.set('sellerId', params.sellerId);
    if (params?.sort) sp.set('sort', params.sort);
    const qs = sp.toString();
    return request<{ products: Product[] }>(`/api/products${qs ? `?${qs}` : ''}`);
  },

  getProductDetail(id: string) {
    return request<{ product: Product; reviews: ProductReview[] }>(`/api/products/${encodeURIComponent(id)}`);
  },

  createProduct(payload: {
    title: string;
    titleEn?: string;
    category: ProductCategory;
    condition: ProductCondition;
    price: number;
    originalPrice?: number;
    stock: number;
    campus: string;
    imageUrl: string;
    description: string;
  }) {
    return request<{ product: Product }>(
      '/api/products',
      { method: 'POST', body: JSON.stringify(payload) },
      'student'
    );
  },

  updateProduct(
    id: string,
    payload: Partial<Pick<Product, 'title' | 'price' | 'stock' | 'condition' | 'featured'>>,
    scope: 'student' | 'admin' = 'student'
  ) {
    return request<{ product: Product }>(
      `/api/products/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
      scope
    );
  },

  deleteProduct(id: string, scope: 'student' | 'admin' = 'student') {
    return request<{ deleted: boolean; id: string }>(
      `/api/products/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      scope
    );
  },

  addReview(
    productId: string,
    payload: { authorName: string; authorUniversity: string; rating: number; comment: string }
  ) {
    return request<{ review: ProductReview; product: Product }>(
      `/api/products/${encodeURIComponent(productId)}/reviews`,
      { method: 'POST', body: JSON.stringify(payload) },
      studentToken ? 'student' : 'none'
    );
  },

  // Orders
  getOrders(params?: { orderCode?: string; mine?: boolean }) {
    const sp = new URLSearchParams();
    if (params?.orderCode) sp.set('orderCode', params.orderCode);
    if (params?.mine) sp.set('mine', 'true');
    const qs = sp.toString();
    return request<{ orders: Order[] }>(
      `/api/orders${qs ? `?${qs}` : ''}`,
      {},
      studentToken ? 'student' : 'none'
    );
  },

  createOrder(payload: {
    customerName: string;
    customerPhone: string;
    customerUniversity: string;
    deliveryAddress: string;
    paymentMethod: PaymentMethod;
    note: string;
    items: Array<{ productId: string; quantity: number }>;
  }) {
    return request<{ order: Order }>(
      '/api/orders',
      { method: 'POST', body: JSON.stringify(payload) },
      studentToken ? 'student' : 'none'
    );
  },

  orderAction(id: string, action: 'complete' | 'cancel') {
    return request<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}/action`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
  },

  // Student Auth
  register(payload: {
    email: string;
    password: string;
    fullName: string;
    university: string;
    studentId: string;
    dormAddress: string;
  }) {
    return request<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  registerCccd(payload: {
    cccdNumber: string;
    fullName: string;
    dateOfBirth: string;
    issueDate: string;
    permanentAddress: string;
    email: string;
    password: string;
    university?: string;
    frontVerified: boolean;
    backVerified: boolean;
  }) {
    return request<{ token: string; user: UserProfile }>('/api/auth/register-cccd', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login(payload: { email: string; password: string }) {
    return request<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getProfile() {
    return request<{ user: UserProfile }>('/api/auth/me', {}, 'student');
  },

  updateProfile(payload: Partial<Pick<UserProfile, 'fullName' | 'university' | 'studentId' | 'dormAddress' | 'bio'>>) {
    return request<{ user: UserProfile }>(
      '/api/auth/profile',
      { method: 'PATCH', body: JSON.stringify(payload) },
      'student'
    );
  },

  resetPassword(payload: { email: string; studentId: string; newPassword: string }) {
    return request<{ reset: boolean }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Admin
  getAdminStatus() {
    return request<{ configured: boolean; viaEnv: boolean }>('/api/admin/status');
  },

  claimAdmin(passcode: string) {
    return request<{ token: string }>('/api/admin/claim', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    });
  },

  loginAdmin(passcode: string) {
    return request<{ token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    });
  },

  getAdminOverview() {
    return request<AdminOverviewData>('/api/admin/overview', {}, 'admin');
  },

  updateAdminOrderStatus(orderId: string, status: OrderStatus) {
    return request<{ order: Order }>(
      `/api/admin/orders/${encodeURIComponent(orderId)}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      'admin'
    );
  },

  toggleSupportStatus(supportId: string) {
    return request<{ supportMessage: SupportMessage }>(
      `/api/admin/support/${encodeURIComponent(supportId)}`,
      { method: 'PATCH' },
      'admin'
    );
  },

  // Support
  submitSupport(payload: { name: string; email: string; topic: string; message: string }) {
    return request<{ supportMessage: SupportMessage }>('/api/support', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Green Credit
  getGreenCredit() {
    return request<GreenCreditSummary>('/api/green-credit');
  },

  checkinGreenCredit() {
    return request<GreenCreditSummary>('/api/green-credit/checkin', {
      method: 'POST',
    });
  },

  redeemGreenCredit(rewardId: string) {
    return request<{ voucher: GreenVoucher; summary: GreenCreditSummary }>(
      '/api/green-credit/redeem',
      {
        method: 'POST',
        body: JSON.stringify({ rewardId }),
      }
    );
  },
};
