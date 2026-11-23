import {
  CheckCircle2,
  Clock,
  Package,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import {
  formatDateShort,
  formatVND,
  getOrderStatusLabel,
} from '../lib/format';
import { AppLang, Order, OrderStatus, Product } from '../types';
import { ProductImage } from './ProductImage';

interface OrdersViewProps {
  lang: AppLang;
  orders: Order[];
  products: Product[];
  highlightedOrderId: string | null;
  onRefreshOrders: () => Promise<void>;
  onSelectProduct: (product: Product) => void;
  onGoExplore: () => void;
  onNotify: (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    description?: string
  ) => void;
}

const STATUS_BADGE_MAP: Record<OrderStatus, string> = {
  pending: 'bg-[#B45309] text-white',
  confirmed: 'bg-[#0369A1] text-white',
  shipping: 'bg-[#0369A1] text-white',
  completed: 'bg-[#1B4332] text-white',
  cancelled: 'bg-[#B91C1C] text-white',
};

const STEPS: OrderStatus[] = ['pending', 'confirmed', 'shipping', 'completed'];

export function OrdersView({
  lang,
  orders,
  products,
  highlightedOrderId,
  onRefreshOrders,
  onSelectProduct,
  onGoExplore,
  onNotify,
}: OrdersViewProps) {
  const [searchCode, setSearchCode] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const q = searchCode.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.orderCode.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.deliveryAddress.toLowerCase().includes(q)
      );
    });
  }, [orders, searchCode, statusFilter]);

  const handleAction = async (orderId: string, action: 'complete' | 'cancel') => {
    setBusyId(orderId);
    try {
      await api.orderAction(orderId, action);
      await onRefreshOrders();
      onNotify(
        'success',
        action === 'complete'
          ? lang === 'vi'
            ? 'Đã xác nhận nhận hàng thành công'
            : 'Delivery confirmed'
          : lang === 'vi'
          ? 'Đã hủy đơn hàng và hoàn lại tồn kho'
          : 'Order cancelled and stock restored'
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Không thể cập nhật đơn hàng.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E8E5]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1412]">
            {lang === 'vi'
              ? 'Theo dõi đơn hàng & Lịch sử giao dịch'
              : 'Order Tracking & Transaction History'}
          </h1>
          <p className="text-sm text-[#0F1412]/70 mt-1">
            {lang === 'vi'
              ? 'Tra cứu mã đơn LP-XXXX, xem tiến trình giao tại KTX và liên kết trực tiếp tới sản phẩm.'
              : 'Search order codes, monitor campus delivery stages, and inspect itemized receipts.'}
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="w-4 h-4 text-[#0F1412]/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder={
              lang === 'vi' ? 'Tìm mã đơn (vd: LP-1042)...' : 'Search order code...'
            }
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
          />
        </div>
      </div>

      {/* Status Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 py-4">
        {(['all', 'pending', 'confirmed', 'shipping', 'completed', 'cancelled'] as const).map(
          (st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#0F1412] text-white'
                  : 'bg-[#F6F8F7] text-[#0F1412]/75 hover:bg-[#E2E8E5]'
              }`}
            >
              {st === 'all'
                ? lang === 'vi'
                  ? `Tất cả (${orders.length})`
                  : `All (${orders.length})`
                : getOrderStatusLabel(st, lang)}
            </button>
          )
        )}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="mt-4 rounded-xl border border-[#E2E8E5] bg-[#F6F8F7] p-12 text-center">
          <Package className="w-9 h-9 mx-auto text-[#0F1412]/40 mb-3" />
          <h2 className="font-display text-lg font-semibold text-[#0F1412]">
            {lang === 'vi' ? 'Chưa có đơn hàng phù hợp' : 'No matching orders'}
          </h2>
          <p className="text-sm text-[#0F1412]/65 mt-1">
            {lang === 'vi'
              ? 'Hãy chọn sản phẩm từ danh mục để tạo đơn hàng đầu tiên.'
              : 'Browse the catalog to place your first student order.'}
          </p>
          <button
            type="button"
            onClick={onGoExplore}
            className="mt-5 px-5 py-2.5 rounded-lg bg-[#1B4332] text-white text-sm font-semibold hover:bg-[#143326] transition-colors cursor-pointer"
          >
            {lang === 'vi' ? 'Quay lại Khám phá' : 'Back to Catalog'}
          </button>
        </div>
      ) : (
        <div className="space-y-5 mt-2">
          {filteredOrders.map((order) => {
            const isHighlighted = highlightedOrderId === order.id;
            const currentStepIdx = STEPS.indexOf(order.status);

            return (
              <article
                key={order.id}
                className={`rounded-xl border bg-white overflow-hidden transition-shadow ${
                  isHighlighted
                    ? 'border-[#1B4332] ring-2 ring-[#1B4332]/20'
                    : 'border-[#E2E8E5]'
                }`}
              >
                {/* Order Header */}
                <div className="px-5 py-4 bg-[#F6F8F7] border-b border-[#E2E8E5] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-mono-tabular font-bold text-[#0F1412]">
                      #{order.orderCode}
                    </span>
                    <span className="text-[#0F1412]/40" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[#0F1412]/75">
                      {formatDateShort(order.createdAt, lang)}
                    </span>
                    <span className="text-[#0F1412]/40" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-medium text-[#0F1412]">
                      {order.customerName} ({order.customerUniversity})
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ${
                      STATUS_BADGE_MAP[order.status]
                    }`}
                  >
                    {order.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {order.status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
                    {order.status === 'shipping' && <Truck className="w-3.5 h-3.5" />}
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>{getOrderStatusLabel(order.status, lang)}</span>
                  </span>
                </div>

                {/* Progress Timeline */}
                {order.status !== 'cancelled' && (
                  <div className="px-5 py-4 border-b border-[#E2E8E5] grid grid-cols-4 gap-2">
                    {STEPS.map((step, idx) => {
                      const reached = currentStepIdx >= idx;
                      return (
                        <div key={step} className="flex flex-col gap-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              reached ? 'bg-[#1B4332]' : 'bg-[#E2E8E5]'
                            }`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              reached ? 'text-[#1B4332] font-semibold' : 'text-[#0F1412]/45'
                            }`}
                          >
                            {getOrderStatusLabel(step, lang)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Order Items & Delivery Info */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7 divide-y divide-[#E2E8E5]">
                    {order.items.map((item) => {
                      const matchedProduct = products.find(
                        (p) => p.id === item.productId
                      );
                      return (
                        <div
                          key={`${order.id}-${item.productId}`}
                          className="py-3 first:pt-0 last:pb-0 flex items-center gap-3.5"
                        >
                          <div className="w-16 h-12 rounded-md overflow-hidden border border-[#E2E8E5] bg-[#F6F8F7] shrink-0">
                            <ProductImage
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              disabled={!matchedProduct}
                              onClick={() =>
                                matchedProduct && onSelectProduct(matchedProduct)
                              }
                              className="text-left text-sm font-semibold text-[#0F1412] hover:text-[#0369A1] hover:underline disabled:no-underline truncate block w-full cursor-pointer"
                            >
                              {lang === 'vi' ? item.title : item.titleEn}
                            </button>
                            <p className="text-xs text-[#0F1412]/65 font-mono-tabular mt-0.5">
                              {formatVND(item.price)} × {item.quantity} · {item.campus}
                            </p>
                          </div>
                          <div className="font-mono-tabular text-sm font-bold text-[#0F1412] shrink-0">
                            {formatVND(item.price * item.quantity)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="lg:col-span-5 rounded-lg bg-[#F6F8F7] border border-[#E2E8E5] p-4 space-y-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#0F1412]/65">
                        {lang === 'vi' ? 'Địa chỉ giao:' : 'Delivery:'}
                      </span>
                      <span className="font-medium text-[#0F1412] text-right">
                        {order.deliveryAddress}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#0F1412]/65">
                        {lang === 'vi' ? 'Thanh toán:' : 'Payment:'}
                      </span>
                      <span className="font-mono-tabular uppercase font-semibold text-[#0F1412]">
                        {order.paymentMethod}
                      </span>
                    </div>
                    {order.note && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#0F1412]/65">
                          {lang === 'vi' ? 'Ghi chú:' : 'Note:'}
                        </span>
                        <span className="text-[#0F1412] text-right">{order.note}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[#E2E8E5] flex justify-between items-baseline text-sm">
                      <span className="font-semibold text-[#0F1412]">
                        {lang === 'vi' ? 'Tổng đơn hàng:' : 'Total:'}
                      </span>
                      <span className="font-mono-tabular text-base font-bold text-[#1B4332]">
                        {formatVND(order.totalAmount)}
                      </span>
                    </div>

                    {/* Buyer Quick Actions */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      {(order.status === 'confirmed' || order.status === 'shipping') && (
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => handleAction(order.id, 'complete')}
                          className="flex-1 py-2 px-3 rounded-lg bg-[#1B4332] hover:bg-[#143326] text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {lang === 'vi'
                            ? 'Đã nhận được hàng'
                            : 'Confirm Delivery'}
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => handleAction(order.id, 'cancel')}
                          className="py-2 px-3 rounded-lg border border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {lang === 'vi' ? 'Hủy đơn hàng' : 'Cancel Order'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
