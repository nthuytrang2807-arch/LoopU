import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatVND } from '../lib/format';
import {
  AppLang,
  CartItem,
  Order,
  PaymentMethod,
  UserProfile,
} from '../types';
import { ProductImage } from './ProductImage';

interface CartDrawerProps {
  open: boolean;
  lang: AppLang;
  items: CartItem[];
  currentUser: UserProfile | null;
  onClose: () => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onOrderCreated: (order: Order) => void;
  onNotify: (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    description?: string
  ) => void;
}

const FREE_DELIVERY_THRESHOLD = 300000;

export function CartDrawer({
  open,
  lang,
  items,
  currentUser,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onOrderCreated,
  onNotify,
}: CartDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerUniversity, setCustomerUniversity] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setCustomerName((prev) => prev || currentUser.fullName);
      setCustomerUniversity((prev) => prev || currentUser.university);
      setDeliveryAddress((prev) => prev || currentUser.dormAddress);
    }
  }, [currentUser]);

  if (!open) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shippingFee = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : 15000;
  const totalAmount = subtotal + shippingFee;
  const remainingForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const progressPct = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const res = await api.createOrder({
        customerName,
        customerPhone,
        customerUniversity,
        deliveryAddress,
        paymentMethod,
        note,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      });
      onNotify(
        'success',
        lang === 'vi'
          ? `Đặt đơn ${res.order.orderCode} thành công`
          : `Order ${res.order.orderCode} confirmed`,
        lang === 'vi'
          ? 'Đang chuyển tới màn hình theo dõi trạng thái đơn hàng.'
          : 'Redirecting to live order tracking.'
      );
      setNote('');
      onOrderCreated(res.order);
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Đặt hàng thất bại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F1412]/60 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'vi' ? 'Giỏ hàng và thanh toán' : 'Shopping bag and checkout'}
    >
      <div className="w-full max-w-lg bg-white h-full flex flex-col border-l border-[#E2E8E5] shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#E2E8E5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#1B4332]" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-[#0F1412]">
              {lang === 'vi' ? 'Giỏ hàng sinh viên' : 'Student Shopping Bag'}
            </h2>
            <span className="font-mono-tabular text-xs font-semibold text-[#0F1412]/60">
              ({items.reduce((s, i) => s + i.quantity, 0)})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="p-2 rounded-lg border border-[#E2E8E5] text-[#0F1412] hover:bg-[#F6F8F7] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Delivery Progress */}
        {items.length > 0 && (
          <div className="px-6 py-3 bg-[#F6F8F7] border-b border-[#E2E8E5] shrink-0">
            <p className="text-xs font-medium text-[#0F1412]">
              {remainingForFree === 0
                ? lang === 'vi'
                  ? 'Đơn hàng đủ điều kiện miễn phí giao nội khu KTX.'
                  : 'Your order qualifies for free campus dorm delivery.'
                : lang === 'vi'
                ? `Mua thêm ${formatVND(remainingForFree)} để được miễn phí giao nội khu KTX.`
                : `Add ${formatVND(remainingForFree)} more for free dorm delivery.`}
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#E2E8E5] overflow-hidden">
              <div
                className="h-full bg-[#1B4332] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag
                className="w-10 h-10 mx-auto text-[#0F1412]/30 mb-3"
                strokeWidth={1.5}
              />
              <p className="font-display text-base font-semibold text-[#0F1412]">
                {lang === 'vi'
                  ? 'Giỏ hàng đang trống'
                  : 'Your shopping bag is empty'}
              </p>
              <p className="text-sm text-[#0F1412]/65 mt-1">
                {lang === 'vi'
                  ? 'Chọn giáo trình hoặc thiết bị học tập từ danh mục để bắt đầu giao dịch.'
                  : 'Select textbooks or study gear from the catalog to get started.'}
              </p>
            </div>
          ) : (
            <>
              {/* Itemized list */}
              <div className="divide-y divide-[#E2E8E5] border-b border-[#E2E8E5]">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="py-4 flex gap-3.5 items-start">
                    <div className="w-20 h-16 rounded-lg overflow-hidden border border-[#E2E8E5] bg-[#F6F8F7] shrink-0">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F1412] line-clamp-2">
                        {lang === 'vi' ? product.title : product.titleEn}
                      </p>
                      <p className="text-xs text-[#0F1412]/60 mt-0.5 truncate">
                        {product.campus}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center border border-[#E2E8E5] rounded-md">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(product.id, quantity - 1)}
                            aria-label="Giảm"
                            className="p-1.5 hover:bg-[#F6F8F7] cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 font-mono-tabular text-xs font-semibold">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQty(
                                product.id,
                                Math.min(product.stock, quantity + 1)
                              )
                            }
                            aria-label="Tăng"
                            className="p-1.5 hover:bg-[#F6F8F7] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono-tabular text-sm font-bold text-[#1B4332]">
                            {formatVND(product.price * quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(product.id)}
                            aria-label="Xóa sản phẩm"
                            className="p-1.5 text-[#B91C1C] hover:bg-[#B91C1C]/10 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout Form */}
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                <h3 className="font-display text-base font-bold text-[#0F1412]">
                  {lang === 'vi'
                    ? 'Thông tin nhận hàng tại trường / KTX'
                    : 'Campus & Dorm Delivery Details'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                      {lang === 'vi' ? 'Họ và tên *' : 'Full name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nguyễn Minh Khang"
                      className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                      {lang === 'vi' ? 'Số điện thoại *' : 'Phone number *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                    {lang === 'vi' ? 'Trường đại học' : 'University'}
                  </label>
                  <input
                    type="text"
                    value={customerUniversity}
                    onChange={(e) => setCustomerUniversity(e.target.value)}
                    placeholder="ĐH Bách Khoa Hà Nội"
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                    {lang === 'vi'
                      ? 'Địa chỉ KTX / Cổng trường *'
                      : 'Dormitory / Campus gate address *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Phòng 402, Tòa B9 KTX Bách Khoa"
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
                    {lang === 'vi'
                      ? 'Phương thức thanh toán'
                      : 'Payment Method'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cod' as PaymentMethod, label: 'COD (Tiền mặt)' },
                      { id: 'vietqr' as PaymentMethod, label: 'VietQR' },
                      { id: 'loop_wallet' as PaymentMethod, label: 'Ví Loop' },
                    ].map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                          paymentMethod === pm.id
                            ? 'bg-[#0F1412] border-[#0F1412] text-white'
                            : 'bg-white border-[#E2E8E5] text-[#0F1412] hover:bg-[#F6F8F7]'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                    {lang === 'vi' ? 'Ghi chú giờ nhận hàng' : 'Delivery note'}
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      lang === 'vi'
                        ? 'Ví dụ: Giao sau giờ học 17h30'
                        : 'e.g. Deliver after 5:30 PM class'
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                </div>
              </form>
            </>
          )}
        </div>

        {/* Summary & Submit Footer */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-[#E2E8E5] bg-[#F6F8F7] space-y-3 shrink-0">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#0F1412]/75">
                <span>{lang === 'vi' ? 'Tạm tính' : 'Subtotal'}</span>
                <span className="font-mono-tabular">{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#0F1412]/75">
                <span>{lang === 'vi' ? 'Phí giao nội khu' : 'Campus delivery'}</span>
                <span className="font-mono-tabular">
                  {shippingFee === 0
                    ? lang === 'vi'
                      ? 'Miễn phí'
                      : 'Free'
                    : formatVND(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#0F1412] pt-2 border-t border-[#E2E8E5]">
                <span>{lang === 'vi' ? 'Tổng thanh toán' : 'Total'}</span>
                <span className="font-mono-tabular text-[#1B4332]">
                  {formatVND(totalAmount)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-[#1B4332] hover:bg-[#143326] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>
                {submitting
                  ? lang === 'vi'
                    ? 'Đang tạo đơn hàng...'
                    : 'Placing order...'
                  : lang === 'vi'
                  ? 'Xác nhận đặt đơn'
                  : 'Place Order'}
              </span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
