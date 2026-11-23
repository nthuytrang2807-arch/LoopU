import { AppLang, OrderStatus, ProductCategory, ProductCondition } from '../types';

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateShort(iso: string, lang: AppLang): string {
  try {
    return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function getCategoryLabel(category: ProductCategory, lang: AppLang): string {
  const map: Record<ProductCategory, { vi: string; en: string }> = {
    textbooks: { vi: 'Giáo trình', en: 'Textbooks' },
    tech: { vi: 'Công nghệ', en: 'Tech Gear' },
    dorm: { vi: 'Nội thất KTX', en: 'Dorm Living' },
    stationery: { vi: 'Đồ dùng học tập', en: 'Study Tools' },
    mobility: { vi: 'Di chuyển', en: 'Mobility' },
  };
  return map[category]?.[lang] ?? category;
}

export function getConditionLabel(condition: ProductCondition, lang: AppLang): string {
  const map: Record<ProductCondition, { vi: string; en: string }> = {
    new: { vi: 'Mới 100%', en: 'Brand New' },
    like_new: { vi: 'Như mới 99%', en: 'Like New' },
    good: { vi: 'Sử dụng tốt', en: 'Good Condition' },
  };
  return map[condition]?.[lang] ?? condition;
}

export function getOrderStatusLabel(status: OrderStatus, lang: AppLang): string {
  const map: Record<OrderStatus, { vi: string; en: string }> = {
    pending: { vi: 'Chờ xác nhận', en: 'Pending' },
    confirmed: { vi: 'Đã xác nhận', en: 'Confirmed' },
    shipping: { vi: 'Đang giao KTX', en: 'Delivering' },
    completed: { vi: 'Hoàn thành', en: 'Completed' },
    cancelled: { vi: 'Đã hủy', en: 'Cancelled' },
  };
  return map[status]?.[lang] ?? status;
}
