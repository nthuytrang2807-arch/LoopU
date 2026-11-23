import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

type ProductCategory = 'textbooks' | 'tech' | 'dorm' | 'stationery' | 'mobility';
type ProductCondition = 'new' | 'like_new' | 'good';
type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
type PaymentMethod = 'cod' | 'vietqr' | 'loop_wallet';

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string | null;
  fullName: string;
  university: string;
  studentId: string;
  dormAddress: string;
  bio: string;
  role: 'student' | 'admin';
  verificationMethod?: 'student_email' | 'cccd';
  cccdVerified?: boolean;
  cccdHash?: string | null;
  cccdMasked?: string | null;
  createdAt: string;
}

interface StoredProduct {
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

interface StoredReview {
  id: string;
  productId: string;
  authorName: string;
  authorUniversity: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface StoredOrderItem {
  productId: string;
  title: string;
  titleEn: string;
  price: number;
  quantity: number;
  imageUrl: string;
  campus: string;
}

interface StoredOrder {
  id: string;
  orderCode: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerUniversity: string;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  note: string;
  items: StoredOrderItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

interface StoredSupportMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

interface StoredGreenCreditTransaction {
  id: string;
  type: 'earn' | 'redeem';
  points: number;
  title: string;
  titleEn: string;
  category: 'checkin' | 'order' | 'listing' | 'reward';
  createdAt: string;
}

interface StoredGreenVoucher {
  id: string;
  rewardId: string;
  code: string;
  title: string;
  titleEn: string;
  pointsCost: number;
  discountLabel: string;
  createdAt: string;
}

interface StoredGreenCreditState {
  balance: number;
  lastCheckinDate: string | null;
  transactions: StoredGreenCreditTransaction[];
  vouchers: StoredGreenVoucher[];
}

interface GreenRewardDefinition {
  id: string;
  pointsCost: number;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  discountLabel: string;
}

interface StoreData {
  adminCredentialHash: string | null;
  users: StoredUser[];
  products: StoredProduct[];
  reviews: StoredReview[];
  orders: StoredOrder[];
  supportMessages: StoredSupportMessage[];
  greenCredit: StoredGreenCreditState;
}

const GREEN_REWARD_CATALOG: GreenRewardDefinition[] = [
  {
    id: 'voucher_freeship',
    pointsCost: 60,
    title: 'Miễn phí giao nội/ngoại khu',
    titleEn: 'Free Campus & Off-Campus Delivery',
    description: 'Áp dụng cho mọi đơn hàng đồ dùng học tập và ký túc xá tại LoopU.',
    descriptionEn: 'Valid on any study essentials or dorm goods order on LoopU.',
    discountLabel: 'FREESHIP',
  },
  {
    id: 'voucher_15k',
    pointsCost: 100,
    title: 'Voucher giảm trực tiếp 15.000₫',
    titleEn: '15,000₫ Direct Circular Voucher',
    description: 'Giảm 15.000₫ cho đơn hàng từ 150.000₫ khi thanh toán COD hoặc VietQR.',
    descriptionEn: 'Save 15,000₫ on orders from 150,000₫ via COD or VietQR.',
    discountLabel: '-15.000₫',
  },
  {
    id: 'voucher_30k',
    pointsCost: 180,
    title: 'Voucher Xanh 30.000₫ cho thiết bị',
    titleEn: '30,000₫ Green Tech & Dorm Voucher',
    description: 'Giảm 30.000₫ cho đơn từ 300.000₫ thuộc nhóm đồ điện tử hoặc nội thất KTX.',
    descriptionEn: 'Save 30,000₫ on orders from 300,000₫ in tech or dorm categories.',
    discountLabel: '-30.000₫',
  },
];

const VALID_CATEGORIES: ProductCategory[] = ['textbooks', 'tech', 'dorm', 'stationery', 'mobility'];
const VALID_CONDITIONS: ProductCondition[] = ['new', 'like_new', 'good'];
const VALID_ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];
const VALID_PAYMENT_METHODS: PaymentMethod[] = ['cod', 'vietqr', 'loop_wallet'];

function createInitialSeed(): StoreData {
  const now = new Date('2026-11-20T09:30:00.000Z').toISOString();
  const earlier = new Date('2026-11-18T14:15:00.000Z').toISOString();
  const oldest = new Date('2026-11-15T10:00:00.000Z').toISOString();

  return {
    adminCredentialHash: null,
    users: [
      {
        id: 'stu-minhanh',
        email: 'minhanh.bk@sv.hust.edu.vn',
        passwordHash: null,
        fullName: 'Trần Minh Anh',
        university: 'ĐH Bách Khoa Hà Nội',
        studentId: '20235012',
        dormAddress: 'KTX B9, Hai Bà Trưng, Hà Nội',
        bio: 'Sinh viên năm 3 Khoa học Máy tính, chuyên nhượng lại thiết bị bàn học và giáo trình.',
        role: 'student',
        createdAt: oldest,
      },
      {
        id: 'stu-thaovy',
        email: 'thaovy.neu@st.neu.edu.vn',
        passwordHash: null,
        fullName: 'Nguyễn Thảo Vy',
        university: 'ĐH Kinh Tế Quốc Dân',
        studentId: '11234089',
        dormAddress: 'KTX Khu A, Đồng Tâm, Hà Nội',
        bio: 'Chia sẻ bộ sách chuyên ngành Kinh tế, Ngoại thương & dụng cụ ghi chép gọn gàng.',
        role: 'student',
        createdAt: earlier,
      },
      {
        id: 'stu-hoangnam',
        email: 'hoangnam.vnu@vnu.edu.vn',
        passwordHash: null,
        fullName: 'Lê Hoàng Nam',
        university: 'ĐH Quốc Gia TP.HCM',
        studentId: '22520914',
        dormAddress: 'KTX Khu B, ĐHQG Thủ Đức',
        bio: 'Thanh lý xe đạp đi học và phụ kiện công nghệ bảo quản kỹ.',
        role: 'student',
        createdAt: now,
      },
    ],
    products: [
      {
        id: 'prd-keyboard-75',
        title: 'Bàn phím cơ không dây 75% Keycap PBT Xanh Rừng',
        titleEn: '75% Wireless Mechanical Keyboard — Forest PBT',
        category: 'tech',
        condition: 'like_new',
        price: 650000,
        originalPrice: 1200000,
        stock: 2,
        campus: 'KTX Bách Khoa — Hà Nội',
        sellerId: 'stu-minhanh',
        sellerName: 'Trần Minh Anh',
        sellerUniversity: 'ĐH Bách Khoa Hà Nội',
        rating: 4.9,
        reviewCount: 2,
        imageUrl: '/src/assets/images/product_mechanical_keyboard_1795325813109.jpg',
        description:
          'Bàn phím cơ layout 75% nhỏ gọn mang lên thư viện, switch linear êm ái không gây ồn, kết nối 3 chế độ Bluetooth/2.4GHz/USB-C kèm cáp xoắn.',
        descriptionEn:
          'Compact 75% mechanical keyboard suited for library study, quiet linear switches, tri-mode Bluetooth/2.4GHz/USB-C with coiled cable.',
        featured: true,
        createdAt: now,
      },
      {
        id: 'prd-textbook-set',
        title: 'Combo 4 giáo trình Kinh Tế & Nhập Môn Bìa Cứng + Sổ Tay',
        titleEn: '4-Volume Hardcover Economics & Sociology Textbook Set',
        category: 'textbooks',
        condition: 'like_new',
        price: 130000,
        originalPrice: 340000,
        stock: 4,
        campus: 'Khuôn viên Kinh Tế Quốc Dân',
        sellerId: 'stu-thaovy',
        sellerName: 'Nguyễn Thảo Vy',
        sellerUniversity: 'ĐH Kinh Tế Quốc Dân',
        rating: 5.0,
        reviewCount: 1,
        imageUrl: '/src/assets/images/product_textbooks_bundle_1795325812367.jpg',
        description:
          'Trọn bộ 4 cuốn giáo trình gốc giấy dày không quăn mép, không viết mực lên trang, tặng kèm sổ tay vải linen chưa sử dụng.',
        descriptionEn:
          'Complete 4-volume hardcover university textbook bundle with clean unmarked pages and an unused linen-bound notebook.',
        featured: true,
        createdAt: earlier,
      },
      {
        id: 'prd-laptop-stand',
        title: 'Giá đỡ Laptop Nhôm Nguyên Khối Anodized Công Thái Học',
        titleEn: 'Brushed Anodized Aluminum Ergonomic Laptop Stand',
        category: 'stationery',
        condition: 'new',
        price: 99000,
        originalPrice: 175000,
        stock: 5,
        campus: 'KTX Bách Khoa — Hà Nội',
        sellerId: 'stu-minhanh',
        sellerName: 'Trần Minh Anh',
        sellerUniversity: 'ĐH Bách Khoa Hà Nội',
        rating: 4.8,
        reviewCount: 1,
        imageUrl: '/src/assets/images/product_macbook_stand_1795325812839.jpg',
        description:
          'Giá đỡ nhôm nguyên khối nâng tầm mắt chống mỏi cổ khi làm đồ án dài giờ. Đệm silicon chống trượt phù hợp laptop 13–16 inch.',
        descriptionEn:
          'Solid brushed aluminum stand designed to elevate laptops 13–16 inch for ergonomic posture during long study sessions.',
        featured: true,
        createdAt: earlier,
      },
      {
        id: 'prd-headphones-anc',
        title: 'Tai nghe chụp tai chống ồn chủ động Studio Matte Black',
        titleEn: 'Matte Black Active Noise-Canceling Over-Ear Headphones',
        category: 'tech',
        condition: 'like_new',
        price: 1450000,
        originalPrice: 2990000,
        stock: 1,
        campus: 'KTX Khu B — ĐHQG TP.HCM',
        sellerId: 'stu-hoangnam',
        sellerName: 'Lê Hoàng Nam',
        sellerUniversity: 'ĐH Quốc Gia TP.HCM',
        rating: 4.9,
        reviewCount: 1,
        imageUrl: '/src/assets/images/product_headphones_desk_1795325812059.jpg',
        description:
          'Chống ồn chủ động lý tưởng khi ôn thi ở quán cà phê hoặc phòng KTX đông người. Pin 30 giờ, đệm tai da mềm như mới.',
        descriptionEn:
          'Active noise cancellation ideal for exam prep in busy dorms or cafes. 30-hour battery life and clean ear cushions.',
        featured: false,
        createdAt: oldest,
      },
      {
        id: 'prd-dorm-lamp',
        title: 'Đèn bàn LED chống cận tối giản + Khay gỗ sồi KTX',
        titleEn: 'Minimalist Forest Green LED Desk Lamp + Oak Organizer',
        category: 'dorm',
        condition: 'like_new',
        price: 179999,
        originalPrice: 390000,
        stock: 3,
        campus: 'Khuôn viên Kinh Tế Quốc Dân',
        sellerId: 'stu-thaovy',
        sellerName: 'Nguyễn Thảo Vy',
        sellerUniversity: 'ĐH Kinh Tế Quốc Dân',
        rating: 4.7,
        reviewCount: 1,
        imageUrl: '/src/assets/images/product_dorm_lamp_1795325813040.jpg',
        description:
          'Ánh sáng vàng ấm dịu mắt 4000K không nhấp nháy, cổ đèn linh hoạt kèm khay gỗ sồi đựng bút và cốc gọn gàng cho bàn học KTX.',
        descriptionEn:
          'Flicker-free 4000K warm LED architectural lamp with flexible neck and solid oak desk organizer tray.',
        featured: false,
        createdAt: oldest,
      },
      {
        id: 'prd-campus-bike',
        title: 'Tủ lạnh 2 ngăn Funiki 126 lít FR-135CD.1',
        titleEn: 'Funiki 126L 2-Door Dorm Refrigerator FR-135CD.1',
        category: 'dorm',
        condition: 'good',
        price: 1400000,
        originalPrice: 2970000,
        stock: 1,
        campus: 'KTX Khu B — ĐHQG TP.HCM',
        sellerId: 'stu-hoangnam',
        sellerName: 'Lê Hoàng Nam',
        sellerUniversity: 'ĐH Quốc Gia TP.HCM',
        rating: 4.8,
        reviewCount: 1,
        imageUrl: '/src/assets/images/product_dorm_fridge_1795328164451.jpg',
        description:
          'Tủ lạnh 2 ngăn dung tích 126 lít vận hành êm, làm lạnh nhanh và tiết kiệm điện, kích thước gọn gàng phù hợp phòng trọ và ký túc xá sinh viên.',
        descriptionEn:
          'Compact 126L two-door refrigerator with quiet operation, fast cooling, and energy-saving performance ideal for student rooms.',
        featured: true,
        createdAt: now,
      },
    ],
    reviews: [
      {
        id: 'rev-1',
        productId: 'prd-keyboard-75',
        authorName: 'Phạm Đức Mạnh',
        authorUniversity: 'ĐH Bách Khoa Hà Nội',
        rating: 5,
        comment: 'Gõ rất êm, mang lên thư viện Tạ Quang Bửu không làm phiền bàn bên. Chủ cũ giữ phím cực sạch.',
        createdAt: earlier,
      },
      {
        id: 'rev-2',
        productId: 'prd-keyboard-75',
        authorName: 'Vũ Ngọc Hà',
        authorUniversity: 'ĐH Xây Dựng',
        rating: 5,
        comment: 'Giao tận cổng KTX trong buổi chiều, đủ phụ kiện như mô tả.',
        createdAt: now,
      },
      {
        id: 'rev-3',
        productId: 'prd-textbook-set',
        authorName: 'Hoàng Gia Linh',
        authorUniversity: 'ĐH Ngoại Thương',
        rating: 5,
        comment: 'Sách mới tinh không bị gạch bút highlight, tiết kiệm được hơn nửa tiền mua mới.',
        createdAt: now,
      },
    ],
    orders: [
      {
        id: 'ord-1041',
        orderCode: 'LP-1041',
        userId: null,
        customerName: 'Đỗ Quang Huy',
        customerPhone: '0912345678',
        customerUniversity: 'ĐH Bách Khoa Hà Nội',
        deliveryAddress: 'Phòng 304, KTX B6, Hai Bà Trưng, Hà Nội',
        paymentMethod: 'vietqr',
        note: 'Giao sau 17h chiều giúp mình nhé.',
        items: [
          {
            productId: 'prd-keyboard-75',
            title: 'Bàn phím cơ không dây 75% Keycap PBT Xanh Rừng',
            titleEn: '75% Wireless Mechanical Keyboard — Forest PBT',
            price: 890000,
            quantity: 1,
            imageUrl: '/src/assets/images/product_mechanical_keyboard_1795325813109.jpg',
            campus: 'KTX Bách Khoa — Hà Nội',
          },
        ],
        subtotal: 890000,
        shippingFee: 0,
        totalAmount: 890000,
        status: 'completed',
        createdAt: earlier,
        updatedAt: now,
      },
      {
        id: 'ord-1042',
        orderCode: 'LP-1042',
        userId: null,
        customerName: 'Nguyễn Minh Thư',
        customerPhone: '0987654321',
        customerUniversity: 'ĐH Kinh Tế Quốc Dân',
        deliveryAddress: 'Sảnh Tòa A2, ĐH Kinh Tế Quốc Dân',
        paymentMethod: 'cod',
        note: 'Gọi trước 10 phút khi tới sảnh.',
        items: [
          {
            productId: 'prd-textbook-set',
            title: 'Combo 4 giáo trình Kinh Tế & Nhập Môn Bìa Cứng + Sổ Tay',
            titleEn: '4-Volume Hardcover Economics & Sociology Textbook Set',
            price: 260000,
            quantity: 1,
            imageUrl: '/src/assets/images/product_textbooks_bundle_1795325812367.jpg',
            campus: 'Khuôn viên Kinh Tế Quốc Dân',
          },
          {
            productId: 'prd-dorm-lamp',
            title: 'Đèn bàn LED chống cận tối giản + Khay gỗ sồi KTX',
            titleEn: 'Minimalist Forest Green LED Desk Lamp + Oak Organizer',
            price: 320000,
            quantity: 1,
            imageUrl: '/src/assets/images/product_dorm_lamp_1795325813040.jpg',
            campus: 'Khuôn viên Kinh Tế Quốc Dân',
          },
        ],
        subtotal: 580000,
        shippingFee: 0,
        totalAmount: 580000,
        status: 'shipping',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ord-1043',
        orderCode: 'LP-1043',
        userId: null,
        customerName: 'Trần Bảo Long',
        customerPhone: '0909887766',
        customerUniversity: 'ĐH Quốc Gia TP.HCM',
        deliveryAddress: 'Nhà C4, KTX Khu B ĐHQG',
        paymentMethod: 'cod',
        note: 'Kiểm tra kỹ phanh xe trước khi giao.',
        items: [
          {
            productId: 'prd-campus-bike',
            title: 'Xe đạp đi học khung thép Xanh Rừng + Giá chở trước',
            titleEn: 'Matte Forest Green Campus Commuter Bike with Front Rack',
            price: 2150000,
            quantity: 1,
            imageUrl: '/src/assets/images/product_campus_bike_1795325812687.jpg',
            campus: 'KTX Khu B — ĐHQG TP.HCM',
          },
        ],
        subtotal: 2150000,
        shippingFee: 0,
        totalAmount: 2150000,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      },
    ],
    supportMessages: [
      {
        id: 'sup-1',
        name: 'Lê Thanh Tú',
        email: 'thanhtu@sv.hcmut.edu.vn',
        topic: 'Hợp tác điểm thu gom sách KTX',
        message: 'CLB Sách Bách Khoa muốn đề xuất mở điểm ký gửi giáo trình cuối kỳ tại KTX Khu A.',
        status: 'open',
        createdAt: earlier,
      },
    ],
    greenCredit: createDefaultGreenCredit(now, earlier),
  };
}

function createDefaultGreenCredit(now: string, earlier: string): StoredGreenCreditState {
  return {
    balance: 120,
    lastCheckinDate: null,
    transactions: [
      {
        id: 'gc-seed-1',
        type: 'earn',
        points: 40,
        title: 'Đăng bán tái sử dụng: Bàn phím cơ không dây 75%',
        titleEn: 'Listed circular item: 75% Wireless Mechanical Keyboard',
        category: 'listing',
        createdAt: now,
      },
      {
        id: 'gc-seed-2',
        type: 'earn',
        points: 50,
        title: 'Mua sắm tuần hoàn đơn LP-1042 (2 món)',
        titleEn: 'Circular order LP-1042 (2 items)',
        category: 'order',
        createdAt: now,
      },
      {
        id: 'gc-seed-3',
        type: 'earn',
        points: 30,
        title: 'Hoàn tất nhận hàng tuần hoàn LP-1041',
        titleEn: 'Completed circular delivery LP-1041',
        category: 'order',
        createdAt: earlier,
      },
    ],
    vouchers: [],
  };
}

function awardGreenCredit(
  store: StoreData,
  params: {
    points: number;
    title: string;
    titleEn: string;
    category: StoredGreenCreditTransaction['category'];
  }
): void {
  store.greenCredit.balance += params.points;
  store.greenCredit.transactions.unshift({
    id: `gc-${crypto.randomUUID().slice(0, 8)}`,
    type: 'earn',
    points: params.points,
    title: params.title,
    titleEn: params.titleEn,
    category: params.category,
    createdAt: new Date().toISOString(),
  });
}

function buildGreenCreditSummary(store: StoreData) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const orderedQty = store.orders
    .filter((o) => o.status !== 'cancelled')
    .reduce(
      (sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
  const circularItemsCount = orderedQty + store.products.length;
  const co2SavedKg = Number((circularItemsCount * 3.4).toFixed(1));

  return {
    balance: store.greenCredit.balance,
    lastCheckinDate: store.greenCredit.lastCheckinDate,
    canCheckinToday: store.greenCredit.lastCheckinDate !== todayKey,
    circularItemsCount,
    co2SavedKg,
    rewards: GREEN_REWARD_CATALOG,
    transactions: store.greenCredit.transactions,
    vouchers: store.greenCredit.vouchers,
  };
}

function loadStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial = createInitialSeed();
    saveStore(initial);
    return initial;
  }
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as StoreData;
  if (!parsed.greenCredit) {
    const now = new Date().toISOString();
    parsed.greenCredit = createDefaultGreenCredit(now, now);
    saveStore(parsed);
  }
  return parsed;
}

function saveStore(store: StoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tempPath, STORE_PATH);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

function signToken(payload: { sub: string; role: 'student' | 'admin' }): string {
  const body = {
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyToken(token: string): { sub: string; role: 'student' | 'admin'; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!decoded || typeof decoded.exp !== 'number' || decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function sanitizeImageUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('/src/assets/images/') && !trimmed.includes('..')) {
    return trimmed;
  }
  if (
    trimmed.length <= 1_500_000 &&
    /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)
  ) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function sanitizeUser(user: StoredUser) {
  const { passwordHash: _ignoredPw, cccdHash: _ignoredCccd, ...safe } = user;
  return safe;
}

interface AuthedRequest extends Request {
  auth?: { sub: string; role: 'student' | 'admin' };
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
    return;
  }
  req.auth = { sub: payload.sub, role: payload.role };
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: 'Yêu cầu quyền quản trị viên.' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    res.status(403).json({ error: 'Không có quyền truy cập khu vực quản trị.' });
    return;
  }
  req.auth = { sub: payload.sub, role: payload.role };
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '3mb' }));

  // Ensure initial store exists
  loadStore();

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Loop.sv.vn' });
  });

  // Products: List with search, filter, sort
  app.get('/api/products', (req, res) => {
    const store = loadStore();
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const condition = typeof req.query.condition === 'string' ? req.query.condition : '';
    const sellerId = typeof req.query.sellerId === 'string' ? req.query.sellerId : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';

    let items = [...store.products];

    if (q) {
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.titleEn.toLowerCase().includes(q) ||
          p.campus.toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (category && VALID_CATEGORIES.includes(category as ProductCategory)) {
      items = items.filter((p) => p.category === category);
    }

    if (condition && VALID_CONDITIONS.includes(condition as ProductCondition)) {
      items = items.filter((p) => p.condition === condition);
    }

    if (sellerId) {
      items = items.filter((p) => p.sellerId === sellerId);
    }

    if (sort === 'price_asc') {
      items.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      items.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      items.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    } else {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.json({ products: items });
  });

  // Product detail + reviews
  app.get('/api/products/:id', (req, res) => {
    const store = loadStore();
    const product = store.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
      return;
    }
    const reviews = store.reviews
      .filter((r) => r.productId === product.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ product, reviews });
  });

  // Create listing (authenticated student or admin)
  app.post('/api/products', requireAuth, (req: AuthedRequest, res) => {
    const store = loadStore();
    const user = store.users.find((u) => u.id === req.auth?.sub);
    if (!user && req.auth?.role !== 'admin') {
      res.status(401).json({ error: 'Không tìm thấy tài khoản người đăng.' });
      return;
    }

    const { title, titleEn, category, condition, price, originalPrice, stock, campus, imageUrl, description, descriptionEn } =
      req.body ?? {};

    if (typeof title !== 'string' || title.trim().length < 4 || title.trim().length > 140) {
      res.status(400).json({ error: 'Tên sản phẩm cần dài từ 4 đến 140 ký tự.' });
      return;
    }
    if (!VALID_CATEGORIES.includes(category)) {
      res.status(400).json({ error: 'Danh mục sản phẩm không hợp lệ.' });
      return;
    }
    if (!VALID_CONDITIONS.includes(condition)) {
      res.status(400).json({ error: 'Tình trạng sản phẩm không hợp lệ.' });
      return;
    }
    const numPrice = Number(price);
    const numOriginal = Number(originalPrice || price);
    const numStock = Number(stock);
    if (!Number.isFinite(numPrice) || numPrice < 5000 || numPrice > 100000000) {
      res.status(400).json({ error: 'Giá bán cần từ 5.000₫ đến 100.000.000₫.' });
      return;
    }
    if (!Number.isInteger(numStock) || numStock < 1 || numStock > 500) {
      res.status(400).json({ error: 'Số lượng tồn kho cần từ 1 đến 500.' });
      return;
    }
    if (typeof campus !== 'string' || campus.trim().length < 2) {
      res.status(400).json({ error: 'Vui lòng nhập khuôn viên trường hoặc KTX.' });
      return;
    }
    const safeImg =
      sanitizeImageUrl(imageUrl) || '/src/assets/images/product_textbooks_bundle_1795325812367.jpg';

    const newProduct: StoredProduct = {
      id: `prd-${crypto.randomUUID().slice(0, 8)}`,
      title: title.trim(),
      titleEn: typeof titleEn === 'string' && titleEn.trim() ? titleEn.trim() : title.trim(),
      category,
      condition,
      price: Math.round(numPrice),
      originalPrice: Math.max(Math.round(numOriginal), Math.round(numPrice)),
      stock: numStock,
      campus: campus.trim(),
      sellerId: user ? user.id : 'admin',
      sellerName: user ? user.fullName : 'Ban Quản Trị Loop.sv.vn',
      sellerUniversity: user ? user.university : 'Loop.sv.vn Official',
      rating: 5.0,
      reviewCount: 0,
      imageUrl: safeImg,
      description:
        typeof description === 'string' && description.trim()
          ? description.trim()
          : 'Sản phẩm sinh viên đăng bán trực tiếp trên Loop.sv.vn.',
      descriptionEn:
        typeof descriptionEn === 'string' && descriptionEn.trim()
          ? descriptionEn.trim()
          : typeof description === 'string' && description.trim()
          ? description.trim()
          : 'Student marketplace listing on Loop.sv.vn.',
      featured: false,
      createdAt: new Date().toISOString(),
    };

    store.products.unshift(newProduct);
    awardGreenCredit(store, {
      points: 40,
      title: `Đăng bán tái sử dụng: ${newProduct.title}`,
      titleEn: `Listed circular item: ${newProduct.titleEn}`,
      category: 'listing',
    });
    saveStore(store);
    res.status(201).json({ product: newProduct });
  });

  // Update listing (owner or admin)
  app.patch('/api/products/:id', requireAuth, (req: AuthedRequest, res) => {
    const store = loadStore();
    const index = store.products.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
      return;
    }
    const product = store.products[index];
    const isAdmin = req.auth?.role === 'admin';
    if (!isAdmin && product.sellerId !== req.auth?.sub) {
      res.status(403).json({ error: 'Bạn chỉ có thể chỉnh sửa tin đăng của chính mình.' });
      return;
    }

    const { price, stock, title, featured, condition } = req.body ?? {};
    if (price !== undefined) {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 5000 || p > 100000000) {
        res.status(400).json({ error: 'Giá bán không hợp lệ.' });
        return;
      }
      product.price = Math.round(p);
    }
    if (stock !== undefined) {
      const s = Number(stock);
      if (!Number.isInteger(s) || s < 0 || s > 500) {
        res.status(400).json({ error: 'Tồn kho phải là số nguyên từ 0 đến 500.' });
        return;
      }
      product.stock = s;
    }
    if (typeof title === 'string' && title.trim().length >= 4) {
      product.title = title.trim();
    }
    if (condition && VALID_CONDITIONS.includes(condition)) {
      product.condition = condition;
    }
    if (isAdmin && typeof featured === 'boolean') {
      product.featured = featured;
    }

    store.products[index] = product;
    saveStore(store);
    res.json({ product });
  });

  // Delete listing (owner or admin)
  app.delete('/api/products/:id', requireAuth, (req: AuthedRequest, res) => {
    const store = loadStore();
    const product = store.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
      return;
    }
    if (req.auth?.role !== 'admin' && product.sellerId !== req.auth?.sub) {
      res.status(403).json({ error: 'Không có quyền xóa sản phẩm này.' });
      return;
    }
    store.products = store.products.filter((p) => p.id !== req.params.id);
    saveStore(store);
    res.json({ deleted: true, id: req.params.id });
  });

  // Add product review / Q&A
  app.post('/api/products/:id/reviews', (req: AuthedRequest, res) => {
    const store = loadStore();
    const productIndex = store.products.findIndex((p) => p.id === req.params.id);
    if (productIndex === -1) {
      res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
      return;
    }

    const token = extractBearer(req);
    const payload = token ? verifyToken(token) : null;
    const authedUser = payload ? store.users.find((u) => u.id === payload.sub) : null;

    const { authorName, authorUniversity, rating, comment } = req.body ?? {};
    const finalName = authedUser ? authedUser.fullName : typeof authorName === 'string' ? authorName.trim() : '';
    const finalUni = authedUser
      ? authedUser.university
      : typeof authorUniversity === 'string' && authorUniversity.trim()
      ? authorUniversity.trim()
      : 'Sinh viên ĐH';
    const numRating = Number(rating);

    if (finalName.length < 2) {
      res.status(400).json({ error: 'Vui lòng nhập tên sinh viên.' });
      return;
    }
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      res.status(400).json({ error: 'Điểm đánh giá từ 1 đến 5 sao.' });
      return;
    }
    if (typeof comment !== 'string' || comment.trim().length < 4 || comment.trim().length > 600) {
      res.status(400).json({ error: 'Nội dung bình luận cần từ 4 đến 600 ký tự.' });
      return;
    }

    const newReview: StoredReview = {
      id: `rev-${crypto.randomUUID().slice(0, 8)}`,
      productId: req.params.id,
      authorName: finalName,
      authorUniversity: finalUni,
      rating: numRating,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    store.reviews.unshift(newReview);
    const productReviews = store.reviews.filter((r) => r.productId === req.params.id);
    const avg =
      productReviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(1, productReviews.length);
    store.products[productIndex].rating = Number(avg.toFixed(1));
    store.products[productIndex].reviewCount = productReviews.length;

    saveStore(store);
    res.status(201).json({ review: newReview, product: store.products[productIndex] });
  });

  // Orders: List (supports search by orderCode or userId)
  app.get('/api/orders', (req, res) => {
    const store = loadStore();
    const orderCode = typeof req.query.orderCode === 'string' ? req.query.orderCode.trim().toUpperCase() : '';
    const token = extractBearer(req);
    const payload = token ? verifyToken(token) : null;

    let orders = [...store.orders];
    if (orderCode) {
      orders = orders.filter((o) => o.orderCode.toUpperCase().includes(orderCode));
    } else if (req.query.mine === 'true' && payload) {
      orders = orders.filter((o) => o.userId === payload.sub);
    }

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ orders });
  });

  // Create order (recomputes totals server-side and decrements stock)
  app.post('/api/orders', (req, res) => {
    const store = loadStore();
    const token = extractBearer(req);
    const payload = token ? verifyToken(token) : null;

    const { customerName, customerPhone, customerUniversity, deliveryAddress, paymentMethod, note, items } =
      req.body ?? {};

    if (typeof customerName !== 'string' || customerName.trim().length < 2) {
      res.status(400).json({ error: 'Vui lòng nhập họ tên người nhận.' });
      return;
    }
    if (typeof customerPhone !== 'string' || !/^[0-9+\s]{8,15}$/.test(customerPhone.trim())) {
      res.status(400).json({ error: 'Số điện thoại không hợp lệ (8–15 chữ số).' });
      return;
    }
    if (typeof deliveryAddress !== 'string' || deliveryAddress.trim().length < 5) {
      res.status(400).json({ error: 'Vui lòng nhập địa chỉ KTX hoặc giảng đường nhận hàng.' });
      return;
    }
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      res.status(400).json({ error: 'Phương thức thanh toán không hợp lệ.' });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Giỏ hàng đang trống.' });
      return;
    }

    const resolvedItems: StoredOrderItem[] = [];
    for (const rawItem of items) {
      const qty = Number(rawItem?.quantity);
      const product = store.products.find((p) => p.id === rawItem?.productId);
      if (!product) {
        res.status(400).json({ error: 'Một sản phẩm trong giỏ hàng không còn tồn tại.' });
        return;
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
        res.status(400).json({ error: `Số lượng cho "${product.title}" không hợp lệ.` });
        return;
      }
      if (product.stock < qty) {
        res.status(409).json({
          error: `"${product.title}" chỉ còn ${product.stock} sản phẩm trong kho.`,
        });
        return;
      }
      resolvedItems.push({
        productId: product.id,
        title: product.title,
        titleEn: product.titleEn,
        price: product.price,
        quantity: qty,
        imageUrl: product.imageUrl,
        campus: product.campus,
      });
    }

    // Decrement stock
    for (const item of resolvedItems) {
      const idx = store.products.findIndex((p) => p.id === item.productId);
      if (idx !== -1) {
        store.products[idx].stock -= item.quantity;
      }
    }

    const subtotal = resolvedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingFee = subtotal >= 300000 ? 0 : 15000;
    const totalAmount = subtotal + shippingFee;
    const nextCodeNum = 1044 + store.orders.length;
    const now = new Date().toISOString();

    const newOrder: StoredOrder = {
      id: `ord-${crypto.randomUUID().slice(0, 8)}`,
      orderCode: `LP-${nextCodeNum}`,
      userId: payload?.role === 'student' ? payload.sub : null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerUniversity:
        typeof customerUniversity === 'string' && customerUniversity.trim()
          ? customerUniversity.trim()
          : 'Sinh viên Đại học',
      deliveryAddress: deliveryAddress.trim(),
      paymentMethod,
      note: typeof note === 'string' ? note.trim().slice(0, 300) : '',
      items: resolvedItems,
      subtotal,
      shippingFee,
      totalAmount,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    store.orders.unshift(newOrder);
    const totalQty = resolvedItems.reduce((sum, item) => sum + item.quantity, 0);
    awardGreenCredit(store, {
      points: 25 * totalQty,
      title: `Mua sắm tuần hoàn đơn ${newOrder.orderCode} (${totalQty} món)`,
      titleEn: `Circular order ${newOrder.orderCode} (${totalQty} items)`,
      category: 'order',
    });
    saveStore(store);
    res.status(201).json({ order: newOrder });
  });

  // Buyer action on order (confirm receipt or cancel if pending)
  app.patch('/api/orders/:id/action', (req, res) => {
    const store = loadStore();
    const index = store.orders.findIndex((o) => o.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
      return;
    }
    const order = store.orders[index];
    const { action } = req.body ?? {};

    if (action === 'complete') {
      if (order.status !== 'shipping' && order.status !== 'confirmed') {
        res.status(400).json({ error: 'Chỉ có thể xác nhận nhận hàng khi đơn đang giao hoặc đã xác nhận.' });
        return;
      }
      order.status = 'completed';
    } else if (action === 'cancel') {
      if (order.status !== 'pending') {
        res.status(400).json({ error: 'Chỉ có thể hủy đơn khi đang ở trạng thái chờ xác nhận.' });
        return;
      }
      order.status = 'cancelled';
      // Restore stock
      for (const item of order.items) {
        const pIdx = store.products.findIndex((p) => p.id === item.productId);
        if (pIdx !== -1) {
          store.products[pIdx].stock += item.quantity;
        }
      }
    } else {
      res.status(400).json({ error: 'Thao tác đơn hàng không hợp lệ.' });
      return;
    }

    order.updatedAt = new Date().toISOString();
    store.orders[index] = order;
    if (action === 'complete') {
      awardGreenCredit(store, {
        points: 15,
        title: `Hoàn tất nhận hàng tuần hoàn ${order.orderCode}`,
        titleEn: `Completed circular delivery ${order.orderCode}`,
        category: 'order',
      });
    }
    saveStore(store);
    res.json({ order });
  });

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const store = loadStore();
    const { email, password, fullName, university, studentId, dormAddress } = req.body ?? {};

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'Địa chỉ email không hợp lệ.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
      res.status(400).json({ error: 'Mật khẩu cần từ 6 đến 72 ký tự.' });
      return;
    }
    if (typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Vui lòng nhập họ và tên.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (store.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'Email này đã được đăng ký trước đó.' });
      return;
    }

    const newUser: StoredUser = {
      id: `stu-${crypto.randomUUID().slice(0, 8)}`,
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      fullName: fullName.trim(),
      university:
        typeof university === 'string' && university.trim()
          ? university.trim()
          : 'ĐH Quốc Gia',
      studentId:
        typeof studentId === 'string' && studentId.trim() ? studentId.trim() : 'SV2026',
      dormAddress:
        typeof dormAddress === 'string' && dormAddress.trim()
          ? dormAddress.trim()
          : 'Khuôn viên trường',
      bio: 'Thành viên cộng đồng Loop.sv.vn.',
      role: 'student',
      createdAt: new Date().toISOString(),
    };

    store.users.push(newUser);
    saveStore(store);

    const token = signToken({ sub: newUser.id, role: 'student' });
    res.status(201).json({ token, user: sanitizeUser(newUser) });
  });

function hashCccd(cccd: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(cccd).digest('hex');
}

function maskCccd(cccd: string): string {
  return `${cccd.slice(0, 4)}••••${cccd.slice(-4)}`;
}

// Auth: Register via Citizen ID (CCCD)
  app.post('/api/auth/register-cccd', (req, res) => {
    const store = loadStore();
    const {
      cccdNumber,
      fullName,
      dateOfBirth,
      issueDate,
      permanentAddress,
      email,
      password,
      university,
      frontVerified,
      backVerified,
    } = req.body ?? {};

    if (typeof cccdNumber !== 'string' || !/^\d{12}$/.test(cccdNumber.trim())) {
      res.status(400).json({ error: 'Số Căn cước công dân cần đúng 12 chữ số.' });
      return;
    }
    if (typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Vui lòng nhập họ và tên theo CCCD.' });
      return;
    }
    if (typeof dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      res.status(400).json({ error: 'Ngày sinh không hợp lệ.' });
      return;
    }
    if (typeof issueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
      res.status(400).json({ error: 'Ngày cấp CCCD không hợp lệ.' });
      return;
    }
    const dobTime = new Date(dateOfBirth).getTime();
    const issueTime = new Date(issueDate).getTime();
    const nowTime = Date.now();
    if (Number.isNaN(dobTime) || Number.isNaN(issueTime) || dobTime >= issueTime || issueTime > nowTime) {
      res.status(400).json({ error: 'Ngày sinh hoặc ngày cấp CCCD chưa hợp lệ.' });
      return;
    }
    if (typeof permanentAddress !== 'string' || permanentAddress.trim().length < 5) {
      res.status(400).json({ error: 'Vui lòng nhập nơi thường trú / địa chỉ nhận hàng.' });
      return;
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'Email liên hệ không hợp lệ.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
      res.status(400).json({ error: 'Mật khẩu cần từ 6 đến 72 ký tự.' });
      return;
    }
    if (!frontVerified || !backVerified) {
      res.status(400).json({ error: 'Vui lòng tải đủ ảnh mặt trước và mặt sau CCCD để xác thực.' });
      return;
    }

    const cleanCccd = cccdNumber.trim();
    const cccdHash = hashCccd(cleanCccd);
    const normalizedEmail = email.trim().toLowerCase();

    if (store.users.some((u) => u.cccdHash === cccdHash)) {
      res.status(409).json({ error: 'Số CCCD này đã được xác thực cho một tài khoản khác.' });
      return;
    }
    if (store.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'Email này đã được đăng ký trước đó.' });
      return;
    }

    const newUser: StoredUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      fullName: fullName.trim(),
      university:
        typeof university === 'string' && university.trim()
          ? university.trim()
          : 'Thành viên xác thực CCCD',
      studentId: `CCCD-${cleanCccd.slice(-4)}`,
      dormAddress: permanentAddress.trim(),
      bio: 'Tài khoản đã xác thực danh tính qua Căn cước công dân.',
      role: 'student',
      verificationMethod: 'cccd',
      cccdVerified: true,
      cccdHash,
      cccdMasked: maskCccd(cleanCccd),
      createdAt: new Date().toISOString(),
    };

    store.users.push(newUser);
    saveStore(store);

    const token = signToken({ sub: newUser.id, role: 'student' });
    res.status(201).json({ token, user: sanitizeUser(newUser) });
  });

  // Auth: Login (supports Email or 12-digit CCCD)
  app.post('/api/auth/login', (req, res) => {
    const store = loadStore();
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Vui lòng nhập email hoặc số CCCD và mật khẩu.' });
      return;
    }
    const identifier = email.trim();
    let user: StoredUser | undefined;
    if (/^\d{12}$/.test(identifier)) {
      const targetHash = hashCccd(identifier);
      user = store.users.find((u) => u.cccdHash === targetHash);
    } else {
      user = store.users.find((u) => u.email.toLowerCase() === identifier.toLowerCase());
    }
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Thông tin đăng nhập hoặc mật khẩu chưa chính xác.' });
      return;
    }
    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: sanitizeUser(user) });
  });

  // Auth: Me
  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    const store = loadStore();
    const user = store.users.find((u) => u.id === req.auth?.sub);
    if (!user) {
      res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
      return;
    }
    res.json({ user: sanitizeUser(user) });
  });

  // Auth: Update Profile
  app.patch('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
    const store = loadStore();
    const idx = store.users.findIndex((u) => u.id === req.auth?.sub);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
      return;
    }
    const { fullName, university, studentId, dormAddress, bio } = req.body ?? {};
    const user = store.users[idx];

    if (typeof fullName === 'string' && fullName.trim().length >= 2) {
      user.fullName = fullName.trim();
    }
    if (typeof university === 'string' && university.trim().length >= 2) {
      user.university = university.trim();
    }
    if (typeof studentId === 'string' && studentId.trim().length >= 2) {
      user.studentId = studentId.trim();
    }
    if (typeof dormAddress === 'string') {
      user.dormAddress = dormAddress.trim();
    }
    if (typeof bio === 'string') {
      user.bio = bio.trim().slice(0, 300);
    }

    store.users[idx] = user;
    saveStore(store);
    res.json({ user: sanitizeUser(user) });
  });

  // Auth: Reset password for registered user
  app.post('/api/auth/reset-password', (req, res) => {
    const store = loadStore();
    const { email, studentId, newPassword } = req.body ?? {};
    if (typeof email !== 'string' || typeof studentId !== 'string' || typeof newPassword !== 'string') {
      res.status(400).json({ error: 'Vui lòng điền đủ email, mã sinh viên và mật khẩu mới.' });
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 72) {
      res.status(400).json({ error: 'Mật khẩu mới cần từ 6 đến 72 ký tự.' });
      return;
    }
    const idx = store.users.findIndex(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.passwordHash !== null &&
        u.studentId.trim().toLowerCase() === studentId.trim().toLowerCase()
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Không khớp thông tin Email và Mã số sinh viên đã đăng ký.' });
      return;
    }
    store.users[idx].passwordHash = hashPassword(newPassword);
    saveStore(store);
    res.json({ reset: true });
  });

  // Admin: Status (check if configured via env or claimed in store)
  app.get('/api/admin/status', (_req, res) => {
    const store = loadStore();
    const envPass = process.env.ADMIN_PASSCODE?.trim();
    const viaEnv = Boolean(envPass && envPass.length > 0);
    const configured = viaEnv || Boolean(store.adminCredentialHash);
    res.json({ configured, viaEnv });
  });

  // Admin: One-time first-run claim when ADMIN_PASSCODE env is unset
  app.post('/api/admin/claim', (req, res) => {
    const store = loadStore();
    const envPass = process.env.ADMIN_PASSCODE?.trim();
    if (envPass && envPass.length > 0) {
      res.status(409).json({ error: 'Mật khẩu quản trị đã được cấu hình qua biến môi trường.' });
      return;
    }
    if (store.adminCredentialHash) {
      res.status(409).json({ error: 'Tài khoản quản trị đã được thiết lập trước đó.' });
      return;
    }
    const { passcode } = req.body ?? {};
    if (typeof passcode !== 'string' || passcode.trim().length < 6 || passcode.trim().length > 72) {
      res.status(400).json({ error: 'Mật khẩu quản trị cần tối thiểu 6 ký tự.' });
      return;
    }
    store.adminCredentialHash = hashPassword(passcode.trim());
    saveStore(store);

    const token = signToken({ sub: 'admin-root', role: 'admin' });
    res.status(201).json({ token });
  });

  // Admin: Login
  app.post('/api/admin/login', (req, res) => {
    const store = loadStore();
    const { passcode } = req.body ?? {};
    if (typeof passcode !== 'string' || !passcode) {
      res.status(400).json({ error: 'Vui lòng nhập mật khẩu quản trị.' });
      return;
    }

    const envPass = process.env.ADMIN_PASSCODE?.trim();
    let valid = false;

    if (envPass && envPass.length > 0) {
      const a = crypto.createHash('sha256').update(passcode).digest();
      const b = crypto.createHash('sha256').update(envPass).digest();
      valid = crypto.timingSafeEqual(a, b);
    } else if (store.adminCredentialHash) {
      valid = verifyPassword(passcode, store.adminCredentialHash);
    }

    if (!valid) {
      res.status(401).json({ error: 'Mật khẩu quản trị không chính xác.' });
      return;
    }

    const token = signToken({ sub: 'admin-root', role: 'admin' });
    res.json({ token });
  });

  // Admin: Dashboard Overview
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const store = loadStore();
    const validOrders = store.orders.filter((o) => o.status !== 'cancelled');
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const activeOrders = store.orders.filter(
      (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'shipping'
    ).length;
    const completedOrders = store.orders.filter((o) => o.status === 'completed').length;

    const categoryMap = new Map<
      ProductCategory,
      { category: ProductCategory; productCount: number; revenue: number; unitsSold: number }
    >();
    for (const cat of VALID_CATEGORIES) {
      categoryMap.set(cat, { category: cat, productCount: 0, revenue: 0, unitsSold: 0 });
    }
    for (const p of store.products) {
      const entry = categoryMap.get(p.category);
      if (entry) entry.productCount += 1;
    }
    for (const ord of validOrders) {
      for (const item of ord.items) {
        const prd = store.products.find((p) => p.id === item.productId);
        const cat = prd?.category ?? 'tech';
        const entry = categoryMap.get(cat);
        if (entry) {
          entry.revenue += item.price * item.quantity;
          entry.unitsSold += item.quantity;
        }
      }
    }

    res.json({
      kpis: {
        totalRevenue,
        activeOrders,
        totalProducts: store.products.length,
        totalStudents: store.users.length,
        completedOrders,
      },
      categoryStats: Array.from(categoryMap.values()),
      orders: [...store.orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      products: store.products,
      users: store.users.map(sanitizeUser),
      supportMessages: [...store.supportMessages].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  });

  // Admin: Update order status
  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const idx = store.orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
      return;
    }
    const { status } = req.body ?? {};
    if (!VALID_ORDER_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Trạng thái đơn hàng không hợp lệ.' });
      return;
    }

    const prevStatus = store.orders[idx].status;
    if (prevStatus !== 'cancelled' && status === 'cancelled') {
      for (const item of store.orders[idx].items) {
        const pIdx = store.products.findIndex((p) => p.id === item.productId);
        if (pIdx !== -1) store.products[pIdx].stock += item.quantity;
      }
    }

    store.orders[idx].status = status;
    store.orders[idx].updatedAt = new Date().toISOString();
    saveStore(store);
    res.json({ order: store.orders[idx] });
  });

  // Support / Contact form
  app.post('/api/support', (req, res) => {
    const store = loadStore();
    const { name, email, topic, message } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Vui lòng nhập tên người gửi.' });
      return;
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'Email liên hệ không hợp lệ.' });
      return;
    }
    if (typeof message !== 'string' || message.trim().length < 8) {
      res.status(400).json({ error: 'Nội dung cần tối thiểu 8 ký tự.' });
      return;
    }

    const entry: StoredSupportMessage = {
      id: `sup-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      topic: typeof topic === 'string' && topic.trim() ? topic.trim() : 'Hỗ trợ chung',
      message: message.trim().slice(0, 800),
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    store.supportMessages.unshift(entry);
    saveStore(store);
    res.status(201).json({ supportMessage: entry });
  });

  // Admin: Resolve support message
  app.patch('/api/admin/support/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const idx = store.supportMessages.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy yêu cầu hỗ trợ.' });
      return;
    }
    store.supportMessages[idx].status =
      store.supportMessages[idx].status === 'open' ? 'resolved' : 'open';
    saveStore(store);
    res.json({ supportMessage: store.supportMessages[idx] });
  });

  // Green Credit: Summary, Check-in & Redeem
  app.get('/api/green-credit', (_req, res) => {
    const store = loadStore();
    res.json(buildGreenCreditSummary(store));
  });

  app.post('/api/green-credit/checkin', (_req, res) => {
    const store = loadStore();
    const todayKey = new Date().toISOString().slice(0, 10);
    if (store.greenCredit.lastCheckinDate === todayKey) {
      res.status(409).json({ error: 'Bạn đã điểm danh xanh hôm nay rồi. Quay lại vào ngày mai nhé!' });
      return;
    }

    store.greenCredit.lastCheckinDate = todayKey;
    awardGreenCredit(store, {
      points: 10,
      title: `Điểm danh lối sống xanh ngày ${todayKey}`,
      titleEn: `Daily green lifestyle check-in (${todayKey})`,
      category: 'checkin',
    });
    saveStore(store);
    res.status(201).json(buildGreenCreditSummary(store));
  });

  app.post('/api/green-credit/redeem', (req, res) => {
    const store = loadStore();
    const { rewardId } = req.body ?? {};
    if (typeof rewardId !== 'string') {
      res.status(400).json({ error: 'Vui lòng chọn ưu đãi cần đổi.' });
      return;
    }

    const reward = GREEN_REWARD_CATALOG.find((r) => r.id === rewardId);
    if (!reward) {
      res.status(400).json({ error: 'Ưu đãi Green Credit không tồn tại.' });
      return;
    }

    if (store.greenCredit.balance < reward.pointsCost) {
      res.status(409).json({
        error: `Bạn cần tối thiểu ${reward.pointsCost} điểm Green Credit để đổi ưu đãi này.`,
      });
      return;
    }

    store.greenCredit.balance -= reward.pointsCost;
    const now = new Date().toISOString();
    const code = `LOOP-GC-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const voucher: StoredGreenVoucher = {
      id: `gcv-${crypto.randomUUID().slice(0, 8)}`,
      rewardId: reward.id,
      code,
      title: reward.title,
      titleEn: reward.titleEn,
      pointsCost: reward.pointsCost,
      discountLabel: reward.discountLabel,
      createdAt: now,
    };

    store.greenCredit.vouchers.unshift(voucher);
    store.greenCredit.transactions.unshift({
      id: `gc-${crypto.randomUUID().slice(0, 8)}`,
      type: 'redeem',
      points: -reward.pointsCost,
      title: `Đổi ưu đãi: ${reward.title} (${code})`,
      titleEn: `Redeemed: ${reward.titleEn} (${code})`,
      category: 'reward',
      createdAt: now,
    });

    saveStore(store);
    res.status(201).json({ voucher, summary: buildGreenCreditSummary(store) });
  });

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Loop.sv.vn server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Loop.sv.vn server:', err);
  process.exit(1);
});
