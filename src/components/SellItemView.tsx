import { ArrowRight, Camera, Check, Plus, Trash2, UserCheck, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  formatVND,
  getCategoryLabel,
  getConditionLabel,
} from '../lib/format';
import {
  AppLang,
  Product,
  ProductCategory,
  ProductCondition,
  UserProfile,
} from '../types';
import { ProductImage } from './ProductImage';

interface SellItemViewProps {
  lang: AppLang;
  currentUser: UserProfile | null;
  products: Product[];
  onRefreshProducts: () => Promise<void>;
  onGoAccount: () => void;
  onSelectProduct: (product: Product) => void;
  onNotify: (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    description?: string
  ) => void;
}

const TOTAL_UPLOAD_SLOTS = 6;

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const img = new Image();
      img.onerror = () => reject(new Error('Định dạng ảnh không hợp lệ.'));
      img.onload = () => {
        const maxDim = 960;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function SellItemView({
  lang,
  currentUser,
  products,
  onRefreshProducts,
  onGoAccount,
  onSelectProduct,
  onNotify,
}: SellItemViewProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProductCategory>('textbooks');
  const [condition, setCondition] = useState<ProductCondition>('like_new');
  const [price, setPrice] = useState('180000');
  const [originalPrice, setOriginalPrice] = useState('350000');
  const [stock, setStock] = useState('1');
  const [campus, setCampus] = useState(
    currentUser?.dormAddress || 'KTX Bách Khoa — Hà Nội'
  );
  const [photoSlots, setPhotoSlots] = useState<Array<string | null>>(
    Array(TOTAL_UPLOAD_SLOTS).fill(null)
  );
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSlotRef = useRef<number>(0);

  const myListings = currentUser
    ? products.filter((p) => p.sellerId === currentUser.id)
    : [];

  const handleSlotClick = (slotIndex: number) => {
    const existing = photoSlots[slotIndex];
    if (existing) {
      setActiveSlot(slotIndex);
      setImageUrl(existing);
      return;
    }
    pendingSlotRef.current = slotIndex;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const targetIndex = pendingSlotRef.current;
    try {
      const uploaded = await Promise.all(
        Array.from(files)
          .slice(0, TOTAL_UPLOAD_SLOTS)
          .map((file) => compressImageFile(file))
      );

      setPhotoSlots((prev) => {
        const next = [...prev];
        if (uploaded.length === 1) {
          next[targetIndex] = uploaded[0];
        } else {
          let cursor = targetIndex;
          for (const dataUrl of uploaded) {
            while (cursor < TOTAL_UPLOAD_SLOTS && next[cursor] !== null) {
              cursor += 1;
            }
            if (cursor < TOTAL_UPLOAD_SLOTS) {
              next[cursor] = dataUrl;
              cursor += 1;
            }
          }
        }
        return next;
      });

      setActiveSlot(targetIndex);
      setImageUrl(uploaded[0]);
      onNotify(
        'success',
        lang === 'vi'
          ? 'Đã tải ảnh sản phẩm lên'
          : 'Product photo uploaded'
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error
          ? err.message
          : lang === 'vi'
          ? 'Không thể tải ảnh lên.'
          : 'Could not upload photo.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveSlot = (slotIndex: number) => {
    const next = [...photoSlots];
    next[slotIndex] = null;
    setPhotoSlots(next);

    if (activeSlot === slotIndex || imageUrl === photoSlots[slotIndex]) {
      const firstRemainingIndex = next.findIndex((item) => item !== null);
      if (firstRemainingIndex !== -1) {
        setActiveSlot(firstRemainingIndex);
        setImageUrl(next[firstRemainingIndex] ?? '');
      } else {
        setActiveSlot(0);
        setImageUrl('');
      }
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onNotify(
        'warning',
        lang === 'vi'
          ? 'Vui lòng đăng nhập tài khoản sinh viên để đăng bán'
          : 'Sign in with a student account to post a listing'
      );
      onGoAccount();
      return;
    }

    if (!imageUrl.trim()) {
      onNotify(
        'warning',
        lang === 'vi'
          ? 'Vui lòng bấm vào ô dấu + để chụp hoặc tải lên ít nhất 1 ảnh sản phẩm'
          : 'Please tap a + slot to capture or upload at least 1 product photo'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createProduct({
        title,
        category,
        condition,
        price: Number(price),
        originalPrice: Number(originalPrice),
        stock: Number(stock),
        campus,
        imageUrl,
        description,
      });
      await onRefreshProducts();
      setTitle('');
      setDescription('');
      setPhotoSlots(Array(TOTAL_UPLOAD_SLOTS).fill(null));
      setActiveSlot(0);
      setImageUrl('');
      onNotify(
        'success',
        lang === 'vi'
          ? 'Đã đăng sản phẩm lên chợ sinh viên'
          : 'Listing published to marketplace',
        res.product.title
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Không thể đăng sản phẩm.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustStock = async (product: Product, delta: number) => {
    const nextStock = Math.max(0, product.stock + delta);
    try {
      await api.updateProduct(product.id, { stock: nextStock }, 'student');
      await onRefreshProducts();
      onNotify('info', `Đã cập nhật tồn kho: ${nextStock}`);
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Không thể cập nhật tồn kho.'
      );
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      await api.deleteProduct(productId, 'student');
      await onRefreshProducts();
      onNotify(
        'success',
        lang === 'vi' ? 'Đã gỡ tin đăng' : 'Listing removed'
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Không thể xóa tin đăng.'
      );
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="pb-6 border-b border-[#E2E8E5] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1412]">
            {lang === 'vi'
              ? 'Đăng bán & Quản lý đồ dùng sinh viên'
              : 'List & Manage Your Student Gear'}
          </h1>
          <p className="text-sm text-[#0F1412]/70 mt-1">
            {lang === 'vi'
              ? 'Sản phẩm sau khi đăng sẽ xuất hiện ngay trên mục Khám phá để các sinh viên khác đặt mua.'
              : 'Published items appear immediately in the marketplace catalog for campus checkout.'}
          </p>
        </div>

        {currentUser ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#F6F8F7] border border-[#E2E8E5] text-xs font-semibold text-[#1B4332]">
            <UserCheck className="w-4 h-4" />
            <span>
              {currentUser.fullName} · {currentUser.university}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onGoAccount}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0369A1] hover:bg-[#075985] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>
              {lang === 'vi'
                ? 'Đăng nhập / Đăng ký để đăng tin'
                : 'Sign In / Register to Post'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Create Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleCreate}
          className="lg:col-span-7 rounded-xl border border-[#E2E8E5] bg-white p-6 space-y-5"
        >
          <h2 className="font-display text-lg font-bold text-[#0F1412]">
            {lang === 'vi' ? 'Thông tin món đồ cần nhượng' : 'Listing Details'}
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
              {lang === 'vi' ? 'Tên sản phẩm *' : 'Product Title *'}
            </label>
            <input
              type="text"
              required
              minLength={4}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Giáo trình Giải Tích 1 & Đại Số Tuyến Tính Bách Khoa"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
                {lang === 'vi' ? 'Danh mục' : 'Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm bg-white focus:border-[#1B4332] focus:outline-none"
              >
                <option value="textbooks">{getCategoryLabel('textbooks', lang)}</option>
                <option value="tech">{getCategoryLabel('tech', lang)}</option>
                <option value="dorm">{getCategoryLabel('dorm', lang)}</option>
                <option value="stationery">{getCategoryLabel('stationery', lang)}</option>
                <option value="mobility">{getCategoryLabel('mobility', lang)}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
                {lang === 'vi' ? 'Tình trạng thực tế' : 'Condition'}
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ProductCondition)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm bg-white focus:border-[#1B4332] focus:outline-none"
              >
                <option value="new">{getConditionLabel('new', lang)}</option>
                <option value="like_new">{getConditionLabel('like_new', lang)}</option>
                <option value="good">{getConditionLabel('good', lang)}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
                {lang === 'vi' ? 'Giá bán (VNĐ) *' : 'Price (VND) *'}
              </label>
              <input
                type="number"
                required
                min={5000}
                step={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
                {lang === 'vi' ? 'Giá mua mới (VNĐ)' : 'Original Price'}
              </label>
              <input
                type="number"
                min={5000}
                step={1000}
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
                {lang === 'vi' ? 'Số lượng *' : 'Stock *'}
              </label>
              <input
                type="number"
                required
                min={1}
                max={100}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
              {lang === 'vi' ? 'Địa chỉ giao dịch' : 'Transaction Address'}
            </label>
            <input
              type="text"
              required
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-semibold text-[#0F1412]">
                {lang === 'vi'
                  ? 'Chụp hoặc tải ảnh thực tế sản phẩm lên (tối đa 6 ảnh)'
                  : 'Capture or upload real product photos (up to 6)'}
              </label>
              <button
                type="button"
                onClick={() => {
                  const firstEmpty = photoSlots.findIndex((s) => s === null);
                  pendingSlotRef.current = firstEmpty === -1 ? 0 : firstEmpty;
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Chụp / Chọn ảnh' : 'Take / Upload Photo'}</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2.5">
              {photoSlots.map((slotUrl, idx) => {
                const isSelected = Boolean(slotUrl && imageUrl === slotUrl && activeSlot === idx);
                return (
                  <div key={idx} className="relative aspect-[4/3]">
                    <button
                      type="button"
                      onClick={() => handleSlotClick(idx)}
                      title={
                        slotUrl
                          ? lang === 'vi'
                            ? `Chọn làm ảnh chính (${idx + 1})`
                            : `Set as cover (${idx + 1})`
                          : lang === 'vi'
                          ? `Bấm để chụp hoặc tải ảnh ${idx + 1}`
                          : `Tap to capture or upload photo ${idx + 1}`
                      }
                      className={`w-full h-full rounded-lg overflow-hidden flex items-center justify-center transition-colors cursor-pointer ${
                        slotUrl
                          ? `border-2 bg-white ${
                              isSelected ? 'border-[#1B4332]' : 'border-[#E2E8E5]'
                            }`
                          : 'border-2 border-dashed border-[#CBD5E1] bg-[#F6F8F7] hover:border-[#1B4332] hover:bg-white text-[#1B4332]'
                      }`}
                    >
                      {slotUrl ? (
                        <img
                          src={slotUrl}
                          alt={`Ảnh sản phẩm ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Plus className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>

                    {slotUrl && isSelected && (
                      <span className="pointer-events-none absolute top-1 left-1 w-4 h-4 rounded-full bg-[#1B4332] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}

                    {slotUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(idx)}
                        aria-label={lang === 'vi' ? `Xóa ảnh ${idx + 1}` : `Remove photo ${idx + 1}`}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#0F1412]/80 hover:bg-[#B91C1C] text-white flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <input
              type="text"
              value={imageUrl.startsWith('data:image/') ? '' : imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={
                imageUrl.startsWith('data:image/')
                  ? lang === 'vi'
                    ? 'Đang dùng ảnh bạn vừa tải lên (hoặc dán URL HTTPS tại đây)'
                    : 'Using your uploaded photo (or paste an HTTPS URL here)'
                  : lang === 'vi'
                  ? 'Hoặc dán URL ảnh HTTPS (tùy chọn)'
                  : 'Or paste an HTTPS image URL (optional)'
              }
              className="w-full px-3.5 py-2 rounded-lg border border-[#E2E8E5] text-xs font-mono-tabular focus:border-[#1B4332] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
              {lang === 'vi' ? 'Mô tả chi tiết tình trạng & phụ kiện' : 'Description'}
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                lang === 'vi'
                  ? 'Mô tả độ mới, thời gian sử dụng, phụ kiện kèm theo và giờ hẹn giao tại trường...'
                  : 'Condition notes, included accessories, preferred campus handover window...'
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#1B4332] hover:bg-[#143326] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {submitting
                ? lang === 'vi'
                  ? 'Đang đăng tin...'
                  : 'Publishing...'
                : lang === 'vi'
                ? 'Đăng bán ngay'
                : 'Publish Listing'}
            </span>
          </button>
        </form>

        {/* Live Card Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-[#E2E8E5] bg-[#F6F8F7] p-5">
            <p className="text-xs font-semibold text-[#0F1412]/70 mb-3">
              {lang === 'vi' ? 'Xem trước thẻ sản phẩm' : 'Live Card Preview'}
            </p>
            <div className="rounded-xl border border-[#E2E8E5] bg-white overflow-hidden">
              <div className="aspect-[4/3] bg-[#F6F8F7] border-b border-[#E2E8E5]">
                {imageUrl ? (
                  <ProductImage
                    src={imageUrl}
                    alt={title || 'Xem trước sản phẩm'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSlotClick(0)}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#1B4332]/80 hover:text-[#1B4332] cursor-pointer"
                  >
                    <Plus className="w-8 h-8" />
                    <span className="text-xs font-medium">
                      {lang === 'vi'
                        ? 'Chụp hoặc tải ảnh sản phẩm lên'
                        : 'Capture or upload product photo'}
                    </span>
                  </button>
                )}
              </div>
              <div className="p-5">
                <p className="text-xs text-[#0F1412]/65 truncate">
                  <span className="font-medium text-[#1B4332]">
                    {getCategoryLabel(category, lang)}
                  </span>{' '}
                  · {getConditionLabel(condition, lang)} · {campus || 'Campus'}
                </p>
                <h3 className="mt-2 font-display text-base font-semibold text-[#0F1412] line-clamp-2">
                  {title ||
                    (lang === 'vi'
                      ? 'Tên sản phẩm sẽ hiển thị tại đây'
                      : 'Product title preview')}
                </h3>
              </div>
            </div>
          </div>

          {/* My Posted Listings */}
          <div className="rounded-xl border border-[#E2E8E5] bg-white p-5">
            <h3 className="font-display text-base font-bold text-[#0F1412] mb-3">
              {lang === 'vi'
                ? `Tin bạn đã đăng (${myListings.length})`
                : `Your Active Listings (${myListings.length})`}
            </h3>
            {!currentUser ? (
              <p className="text-xs text-[#0F1412]/65">
                {lang === 'vi'
                  ? 'Đăng nhập tài khoản sinh viên để xem và chỉnh sửa các tin bạn đã đăng.'
                  : 'Sign in to manage listings you have posted.'}
              </p>
            ) : myListings.length === 0 ? (
              <p className="text-xs text-[#0F1412]/65">
                {lang === 'vi'
                  ? 'Bạn chưa đăng sản phẩm nào. Sử dụng biểu mẫu bên trái để tạo tin đầu tiên.'
                  : 'You have not posted any items yet.'}
              </p>
            ) : (
              <div className="divide-y divide-[#E2E8E5]">
                {myListings.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(item)}
                        className="text-left text-sm font-semibold text-[#0F1412] hover:text-[#1B4332] truncate block w-full cursor-pointer"
                      >
                        {item.title}
                      </button>
                      <p className="text-xs font-mono-tabular text-[#0F1412]/65">
                        {formatVND(item.price)} · Kho: {item.stock}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAdjustStock(item, 1)}
                        className="px-2 py-1 rounded border border-[#E2E8E5] text-xs font-mono-tabular hover:bg-[#F6F8F7] cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Xóa tin"
                        className="p-1.5 rounded text-[#B91C1C] hover:bg-[#B91C1C]/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
