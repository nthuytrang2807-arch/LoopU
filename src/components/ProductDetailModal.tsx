import {
  Bookmark,
  Check,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Star,
  User,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  formatDateShort,
  formatVND,
  getCategoryLabel,
  getConditionLabel,
} from '../lib/format';
import { AppLang, Product, ProductReview, UserProfile } from '../types';
import { ProductImage } from './ProductImage';

interface ProductDetailModalProps {
  product: Product | null;
  lang: AppLang;
  currentUser: UserProfile | null;
  isSaved: boolean;
  onClose: () => void;
  onToggleWishlist: (id: string) => void;
  onAddToCart: (product: Product, qty: number) => void;
  onBuyNow: (product: Product, qty: number) => void;
  onFilterBySeller: (seller: { id: string; name: string }) => void;
  onProductUpdated: (updated: Product) => void;
  onNotify: (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    description?: string
  ) => void;
}

export function ProductDetailModal({
  product,
  lang,
  currentUser,
  isSaved,
  onClose,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  onFilterBySeller,
  onProductUpdated,
  onNotify,
}: ProductDetailModalProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [qty, setQty] = useState(1);

  // Review form state
  const [authorName, setAuthorName] = useState('');
  const [authorUniversity, setAuthorUniversity] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!product) return;
    setQty(1);
    setLoadingReviews(true);
    api
      .getProductDetail(product.id)
      .then((res) => {
        setReviews(res.reviews);
      })
      .catch(() => {
        setReviews([]);
      })
      .finally(() => setLoadingReviews(false));
  }, [product?.id]);

  if (!product) return null;

  const displayTitle = lang === 'vi' ? product.title : product.titleEn;
  const displayDesc = lang === 'vi' ? product.description : product.descriptionEn;
  const savings = Math.max(0, product.originalPrice - product.price);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?item=${product.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onNotify(
        'info',
        lang === 'vi' ? 'Đã sao chép liên kết sản phẩm' : 'Listing link copied'
      );
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify('info', shareUrl);
    }
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await api.addReview(product.id, {
        authorName: currentUser ? currentUser.fullName : authorName,
        authorUniversity: currentUser ? currentUser.university : authorUniversity,
        rating,
        comment,
      });
      setReviews((prev) => [res.review, ...prev]);
      onProductUpdated(res.product);
      setComment('');
      if (!currentUser) {
        setAuthorName('');
        setAuthorUniversity('');
      }
      onNotify(
        'success',
        lang === 'vi' ? 'Đã gửi đánh giá sản phẩm' : 'Review published'
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Không thể gửi đánh giá.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F1412]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
    >
      <div className="bg-white w-full max-w-4xl rounded-xl border border-[#E2E8E5] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8E5] bg-white shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#0F1412]/70 truncate">
            <span className="font-semibold text-[#1B4332]">
              {getCategoryLabel(product.category, lang)}
            </span>
            <span aria-hidden="true">/</span>
            <span className="truncate">{product.campus}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8E5] text-xs font-medium text-[#0F1412] hover:bg-[#F6F8F7] cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#1B4332]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{lang === 'vi' ? 'Chia sẻ' : 'Share'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng chi tiết sản phẩm"
              className="p-1.5 rounded-lg border border-[#E2E8E5] text-[#0F1412] hover:bg-[#F6F8F7] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-8">
          {/* Contiguous PDP Module */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-start">
            <div className="md:col-span-6">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#E2E8E5] bg-[#F6F8F7]">
                <ProductImage
                  src={product.imageUrl}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="md:col-span-6 flex flex-col">
              <div className="flex items-center gap-2 text-xs text-[#0F1412]/65">
                <span>{getConditionLabel(product.condition, lang)}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">
                  {lang === 'vi' ? `Còn ${product.stock} sản phẩm` : `${product.stock} in stock`}
                </span>
              </div>

              <h2
                id="pdp-title"
                className="font-display text-xl sm:text-2xl font-bold text-[#0F1412] mt-2 leading-snug"
              >
                {displayTitle}
              </h2>

              {/* Price block */}
              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-mono-tabular text-2xl font-extrabold text-[#1B4332]">
                  {formatVND(product.price)}
                </span>
                {savings > 0 && (
                  <>
                    <span className="font-mono-tabular text-sm line-through text-[#0F1412]/45">
                      {formatVND(product.originalPrice)}
                    </span>
                    <span className="text-xs font-semibold text-[#B91C1C]">
                      {lang === 'vi' ? `Tiết kiệm ${formatVND(savings)}` : `Save ${formatVND(savings)}`}
                    </span>
                  </>
                )}
              </div>

              <p className="mt-4 text-sm text-[#0F1412]/80 leading-relaxed">
                {displayDesc}
              </p>

              {/* Clickable Seller Attribution */}
              <div className="mt-5 py-3 px-4 rounded-lg bg-[#F6F8F7] border border-[#E2E8E5] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <User className="w-4 h-4 text-[#1B4332] shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0F1412] truncate">
                      {product.sellerName}
                    </p>
                    <p className="text-xs text-[#0F1412]/65 truncate">
                      {product.sellerUniversity}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onFilterBySeller({ id: product.sellerId, name: product.sellerName });
                    onClose();
                  }}
                  className="text-xs font-semibold text-[#0369A1] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {lang === 'vi' ? 'Xem đồ cùng người bán' : 'More from seller'}
                </button>
              </div>

              {/* Quantity & Buy Actions */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center border border-[#E2E8E5] rounded-lg">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      aria-label="Giảm số lượng"
                      className="p-2.5 text-[#0F1412] hover:bg-[#F6F8F7] cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 font-mono-tabular text-sm font-semibold">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQty((q) => Math.min(Math.max(1, product.stock), q + 1))
                      }
                      aria-label="Tăng số lượng"
                      className="p-2.5 text-[#0F1412] hover:bg-[#F6F8F7] cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleWishlist(product.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                      isSaved
                        ? 'bg-[#0369A1] border-[#0369A1] text-white'
                        : 'border-[#E2E8E5] text-[#0F1412] hover:bg-[#F6F8F7]'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                    <span>{isSaved ? (lang === 'vi' ? 'Đã lưu' : 'Saved') : (lang === 'vi' ? 'Lưu tin' : 'Save')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={product.stock === 0}
                    onClick={() => onAddToCart(product, qty)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332]/5 disabled:opacity-50 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                    <span>{lang === 'vi' ? 'Thêm vào giỏ hàng' : 'Add to Bag'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={product.stock === 0}
                    onClick={() => onBuyNow(product, qty)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#1B4332] hover:bg-[#143326] disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <span>{lang === 'vi' ? 'Mua ngay tại KTX' : 'Checkout Now'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews & Q&A Section */}
          <div className="pt-6 border-t border-[#E2E8E5] grid grid-cols-1 md:grid-cols-12 gap-7">
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#0F1412]">
                  {lang === 'vi' ? 'Đánh giá & Hỏi đáp sinh viên' : 'Student Reviews & Q&A'}
                </h3>
                <span className="font-mono-tabular text-xs font-semibold text-[#1B4332]">
                  {product.rating.toFixed(1)} / 5.0 ({reviews.length})
                </span>
              </div>

              {loadingReviews ? (
                <p className="text-sm text-[#0F1412]/60">Đang tải đánh giá...</p>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-[#0F1412]/65 py-4 border-y border-[#E2E8E5]">
                  {lang === 'vi'
                    ? 'Chưa có đánh giá nào. Hãy là sinh viên đầu tiên nhận xét sản phẩm này.'
                    : 'No reviews yet. Be the first student to leave feedback.'}
                </p>
              ) : (
                <div className="divide-y divide-[#E2E8E5] border-y border-[#E2E8E5]">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="py-3.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#0F1412]">
                          {rev.authorName} ·{' '}
                          <span className="font-normal text-[#0F1412]/65">
                            {rev.authorUniversity}
                          </span>
                        </span>
                        <span className="font-mono-tabular text-[#0F1412]/55">
                          {formatDateShort(rev.createdAt, lang)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating
                                ? 'text-[#1B4332] fill-[#1B4332]'
                                : 'text-[#E2E8E5]'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-[#0F1412]/80 mt-1.5 leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmitReview}
              className="md:col-span-5 rounded-xl border border-[#E2E8E5] bg-[#F6F8F7] p-5 space-y-3.5"
            >
              <h4 className="font-display text-sm font-bold text-[#0F1412]">
                {lang === 'vi' ? 'Viết nhận xét hoặc câu hỏi' : 'Leave a Review or Question'}
              </h4>

              {!currentUser && (
                <>
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder={lang === 'vi' ? 'Tên của bạn' : 'Your name'}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] bg-white text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={authorUniversity}
                    onChange={(e) => setAuthorUniversity(e.target.value)}
                    placeholder={lang === 'vi' ? 'Trường đại học (vd: ĐH Bách Khoa)' : 'University'}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] bg-white text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-[#0F1412]/75 mb-1">
                  {lang === 'vi' ? 'Đánh giá sao' : 'Rating'}
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 cursor-pointer"
                      aria-label={`${s} sao`}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          s <= rating
                            ? 'text-[#1B4332] fill-[#1B4332]'
                            : 'text-[#0F1412]/25'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={3}
                required
                minLength={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  lang === 'vi'
                    ? 'Chia sẻ trải nghiệm thực tế hoặc hỏi người bán...'
                    : 'Share your experience or ask the seller...'
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] bg-white text-sm focus:border-[#1B4332] focus:outline-none"
              />

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-2.5 rounded-lg bg-[#0F1412] hover:bg-[#1B4332] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {submittingReview
                  ? lang === 'vi'
                    ? 'Đang gửi...'
                    : 'Submitting...'
                  : lang === 'vi'
                  ? 'Gửi đánh giá'
                  : 'Post Review'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
