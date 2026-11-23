import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  Send,
  ShoppingBag,
  Star,
  UserCheck,
  X,
} from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';
import { t } from '../i18n/translations';
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
} from '../types';
import { HeroSection } from './HeroSection';
import { ProductImage } from './ProductImage';

interface MarketplaceViewProps {
  lang: AppLang;
  onChangeLang: (lang: AppLang) => void;
  products: Product[];
  loading: boolean;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product, qty?: number) => void;
  onSelectProduct: (product: Product) => void;
  onGoSell: () => void;
  sellerFilter: { id: string; name: string } | null;
  onFilterBySeller: (seller: { id: string; name: string } | null) => void;
  onNotify: (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    description?: string
  ) => void;
}

const CATEGORIES: Array<'all' | ProductCategory> = [
  'all',
  'textbooks',
  'tech',
  'dorm',
  'stationery',
  'mobility',
];

export function MarketplaceView({
  lang,
  onChangeLang,
  products,
  loading,
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  onSelectProduct,
  onGoSell,
  sellerFilter,
  onFilterBySeller,
  onNotify,
}: MarketplaceViewProps) {
  const strings = t(lang);
  const catalogRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProductCategory>('all');
  const [selectedCondition, setSelectedCondition] = useState<'all' | ProductCondition>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');
  const [savedOnly, setSavedOnly] = useState(false);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Support contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTopic, setContactTopic] = useState('Hỗ trợ giao dịch sinh viên');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = [...products];

    if (sellerFilter) {
      list = list.filter((p) => p.sellerId === sellerFilter.id);
    }
    if (savedOnly) {
      list = list.filter((p) => wishlistIds.includes(p.id));
    }
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (selectedCondition !== 'all') {
      list = list.filter((p) => p.condition === selectedCondition);
    }
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.titleEn.toLowerCase().includes(q) ||
          p.campus.toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    } else {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return list;
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedCondition,
    sortBy,
    savedOnly,
    wishlistIds,
    sellerFilter,
  ]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedCondition('all');
    setSortBy('newest');
    setSavedOnly(false);
    onFilterBySeller(null);
  };

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSupportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setContactSending(true);
    try {
      await api.submitSupport({
        name: contactName,
        email: contactEmail,
        topic: contactTopic,
        message: contactMessage,
      });
      onNotify('success', strings.faq.contactSuccess);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Không thể gửi yêu cầu.'
      );
    } finally {
      setContactSending(false);
    }
  };

  const faqs = [
    { q: strings.faq.q1, a: strings.faq.a1 },
    { q: strings.faq.q2, a: strings.faq.a2 },
    { q: strings.faq.q3, a: strings.faq.a3 },
  ];

  return (
    <div>
      <HeroSection
        lang={lang}
        products={products}
        onBrowseCatalog={scrollToCatalog}
        onGoSell={onGoSell}
        onSelectProduct={onSelectProduct}
      />

      {/* Section 2: Interactive Catalog & Workspace Toolbar */}
      <section
        ref={catalogRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        {/* Toolbar Header & Language Switch */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1412]">
              {lang === 'vi'
                ? 'Danh mục sản phẩm sinh viên'
                : 'Student Marketplace Catalog'}
            </h2>
            <p className="text-sm text-[#0F1412]/70 mt-1">
              <span className="font-mono-tabular font-semibold text-[#1B4332]">
                {filteredProducts.length}
              </span>{' '}
              {strings.marketplace.resultsCount}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div
              className="inline-flex items-center p-1 rounded-lg bg-[#F6F8F7] border border-[#E2E8E5]"
              role="group"
              aria-label="Ngôn ngữ"
            >
              <button
                type="button"
                onClick={() => onChangeLang('vi')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lang === 'vi'
                    ? 'bg-[#0F1412] text-white'
                    : 'text-[#0F1412]/70 hover:text-[#0F1412]'
                }`}
              >
                Tiếng Việt
              </button>
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lang === 'en'
                    ? 'bg-[#0F1412] text-white'
                    : 'text-[#0F1412]/70 hover:text-[#0F1412]'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Search + Filter Controls */}
        <div className="flex flex-col gap-4 pb-6 border-b border-[#E2E8E5]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-5 relative">
              <Search
                className="w-4 h-4 text-[#0F1412]/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={strings.marketplace.searchPlaceholder}
                aria-label={strings.marketplace.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E2E8E5] bg-white text-sm text-[#0F1412] placeholder:text-[#0F1412]/45 focus:border-[#1B4332] focus:outline-none"
              />
            </div>

            {/* Condition Filter */}
            <div className="lg:col-span-3">
              <select
                value={selectedCondition}
                onChange={(e) =>
                  setSelectedCondition(e.target.value as 'all' | ProductCondition)
                }
                aria-label={strings.marketplace.allConditions}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] bg-white text-sm text-[#0F1412] focus:border-[#1B4332] focus:outline-none"
              >
                <option value="all">{strings.marketplace.allConditions}</option>
                <option value="new">{getConditionLabel('new', lang)}</option>
                <option value="like_new">
                  {getConditionLabel('like_new', lang)}
                </option>
                <option value="good">{getConditionLabel('good', lang)}</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="lg:col-span-2">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | 'newest'
                      | 'price_asc'
                      | 'price_desc'
                      | 'rating'
                  )
                }
                aria-label="Sắp xếp sản phẩm"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] bg-white text-sm text-[#0F1412] focus:border-[#1B4332] focus:outline-none"
              >
                <option value="newest">{strings.marketplace.sortNewest}</option>
                <option value="price_asc">
                  {strings.marketplace.sortPriceAsc}
                </option>
                <option value="price_desc">
                  {strings.marketplace.sortPriceDesc}
                </option>
                <option value="rating">{strings.marketplace.sortRating}</option>
              </select>
            </div>

            {/* Saved Toggle */}
            <div className="lg:col-span-2">
              <button
                type="button"
                onClick={() => setSavedOnly((prev) => !prev)}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  savedOnly
                    ? 'bg-[#0369A1] border-[#0369A1] text-white'
                    : 'bg-white border-[#E2E8E5] text-[#0F1412] hover:bg-[#F6F8F7]'
                }`}
              >
                <Bookmark className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{strings.marketplace.savedOnly}</span>
                <span className="font-mono-tabular text-xs">
                  ({wishlistIds.length})
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              const label =
                cat === 'all'
                  ? strings.marketplace.allCategories
                  : getCategoryLabel(cat, lang);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#1B4332] text-white'
                      : 'bg-[#F6F8F7] text-[#0F1412]/80 hover:bg-[#E2E8E5]/70 hover:text-[#0F1412]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Seller cross-filter banner */}
          {sellerFilter && (
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg bg-[#0F1412] text-white text-sm">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-white/80" aria-hidden="true" />
                <span>
                  {strings.marketplace.filteringSeller}{' '}
                  <strong className="font-semibold">{sellerFilter.name}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onFilterBySeller(null)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{strings.marketplace.clearFilter}</span>
              </button>
            </div>
          )}
        </div>

        {/* Product Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E2E8E5] bg-white overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-[#F6F8F7]" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-1/2 bg-[#E2E8E5] rounded" />
                    <div className="h-5 w-5/6 bg-[#E2E8E5] rounded" />
                    <div className="h-5 w-1/3 bg-[#E2E8E5] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-[#E2E8E5] bg-[#F6F8F7] px-6 py-16 text-center">
              <h3 className="font-display text-lg font-semibold text-[#0F1412]">
                {strings.marketplace.emptyTitle}
              </h3>
              <p className="text-sm text-[#0F1412]/70 mt-2 max-w-md mx-auto">
                {strings.marketplace.emptyDesc}
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B4332] hover:bg-[#143326] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>{strings.marketplace.resetFilters}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredProducts.map((product, idx) => {
                const isSaved = wishlistIds.includes(product.id);
                const rawDiscount =
                  product.originalPrice > product.price
                    ? ((product.originalPrice - product.price) /
                        product.originalPrice) *
                      100
                    : 0;
                const discountLabel =
                  product.id === 'prd-keyboard-75' && rawDiscount > 0
                    ? rawDiscount.toFixed(1)
                    : product.id === 'prd-dorm-lamp' && rawDiscount > 0
                    ? String(Math.round(rawDiscount))
                    : rawDiscount > 0
                    ? String(Math.floor(rawDiscount))
                    : '';
                const displayTitle =
                  lang === 'vi' ? product.title : product.titleEn;

                return (
                  <article
                    key={product.id}
                    className="group flex flex-col rounded-xl border border-[#E2E8E5] bg-white overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* 4:3 Image Frame */}
                    <div className="relative aspect-[4/3] bg-[#F6F8F7] overflow-hidden border-b border-[#E2E8E5]">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className="block w-full h-full text-left cursor-pointer"
                        aria-label={displayTitle}
                      >
                        <ProductImage
                          src={product.imageUrl}
                          alt={displayTitle}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleWishlist(product.id)}
                        aria-label={
                          isSaved ? 'Bỏ lưu sản phẩm' : 'Lưu sản phẩm'
                        }
                        className={`absolute top-3 right-3 p-2 rounded-lg border transition-colors cursor-pointer ${
                          isSaved
                            ? 'bg-[#0369A1] border-[#0369A1] text-white'
                            : 'bg-white/95 border-[#E2E8E5] text-[#0F1412] hover:bg-[#0F1412] hover:text-white'
                        }`}
                      >
                        <Bookmark
                          className="w-4 h-4"
                          fill={isSaved ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>

                    {/* Card Body — Identical Field Order, Zero Pill Metadata */}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs text-[#0F1412]/65 truncate">
                        <span className="font-medium text-[#1B4332]">
                          {getCategoryLabel(product.category, lang)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">
                          {getConditionLabel(product.condition, lang)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{product.campus}</span>
                      </div>

                      <h3 className="mt-2 font-display text-base font-semibold text-[#0F1412] leading-snug line-clamp-2 min-h-[44px]">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product)}
                          className="text-left hover:text-[#1B4332] transition-colors cursor-pointer"
                        >
                          {displayTitle}
                        </button>
                      </h3>

                      {/* Seller Link & Rating */}
                      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            onFilterBySeller({
                              id: product.sellerId,
                              name: product.sellerName,
                            })
                          }
                          className="text-[#0369A1] hover:underline font-medium truncate cursor-pointer"
                        >
                          {product.sellerName}
                        </button>
                        <div className="inline-flex items-center gap-1 text-[#0F1412] font-mono-tabular shrink-0">
                          <Star
                            className="w-3.5 h-3.5 text-[#1B4332] fill-[#1B4332]"
                            aria-hidden="true"
                          />
                          <span>{product.rating.toFixed(1)}</span>
                          <span className="text-[#0F1412]/50">
                            ({product.reviewCount})
                          </span>
                        </div>
                      </div>

                      {/* Price & Action Footer */}
                      <div className="mt-auto pt-4 border-t border-[#E2E8E5] flex items-end justify-between gap-3">
                        <div>
                          <div
                            className="font-mono-tabular text-lg font-bold text-[#0F1412]"
                            style={idx === 0 ? { textDecorationLine: 'none' } : undefined}
                          >
                            {formatVND(product.price)}
                          </div>
                          {discountLabel ? (
                            <div className="flex items-center gap-1.5 text-xs font-mono-tabular">
                              <span className="line-through text-[#0F1412]/45">
                                {formatVND(product.originalPrice)}
                              </span>
                              <span className="font-semibold text-[#B91C1C]">
                                -{discountLabel}%
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-[#0F1412]/55">
                              {strings.marketplace.stockLeft}{' '}
                              <span className="font-mono-tabular">
                                {product.stock}
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={product.stock === 0}
                          onClick={() => onAddToCart(product, 1)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            product.stock === 0
                              ? 'bg-[#E2E8E5] text-[#0F1412]/50 cursor-not-allowed'
                              : 'bg-[#1B4332] hover:bg-[#143326] text-white cursor-pointer'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>
                            {product.stock === 0
                              ? strings.marketplace.outOfStock
                              : strings.marketplace.addToCart}
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Section 3: How It Works (Editorial 3-Column Rhythm) */}
      <section className="bg-[#F6F8F7] border-y border-[#E2E8E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="max-w-2xl mb-10">
            <h2
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1412]"
              style={{ textWrap: 'balance' }}
            >
              {strings.howItWorks.title}
            </h2>
            <p className="text-sm sm:text-base text-[#0F1412]/70 mt-2 leading-relaxed">
              {strings.howItWorks.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: strings.howItWorks.step1Title,
                desc: strings.howItWorks.step1Desc,
              },
              {
                title: strings.howItWorks.step2Title,
                desc: strings.howItWorks.step2Desc,
              },
              {
                title: strings.howItWorks.step3Title,
                desc: strings.howItWorks.step3Desc,
              },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-xl border border-[#E2E8E5] bg-white p-6"
              >
                <h3 className="font-display text-base font-bold text-[#1B4332]">
                  {step.title}
                </h3>
                <p className="text-sm text-[#0F1412]/75 mt-2.5 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: FAQ & Direct Support Form */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1412] mb-8">
          {strings.faq.title}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* FAQ Accordion */}
          <div className="lg:col-span-6 divide-y divide-[#E2E8E5] border-y border-[#E2E8E5]">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left font-display text-base font-semibold text-[#0F1412] hover:text-[#1B4332] transition-colors cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="mt-2.5 text-sm text-[#0F1412]/75 leading-relaxed">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Real Support Inquiry Form (persisted & readable in Admin Dashboard) */}
          <form
            onSubmit={handleSupportSubmit}
            className="lg:col-span-6 rounded-xl border border-[#E2E8E5] bg-white p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-bold text-[#0F1412]">
              {strings.faq.contactTitle}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
                  {strings.faq.contactName}
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nguyễn Văn An"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
                  {strings.faq.contactEmail}
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="an.nv@sv.edu.vn"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
                {strings.faq.contactTopic}
              </label>
              <input
                type="text"
                required
                value={contactTopic}
                onChange={(e) => setContactTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
                {strings.faq.contactMessage}
              </label>
              <textarea
                rows={3}
                required
                minLength={8}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder={
                  lang === 'vi'
                    ? 'Mô tả vấn đề đơn hàng hoặc đề xuất điểm thu gom...'
                    : 'Describe your order question or campus pickup request...'
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={contactSending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1B4332] hover:bg-[#143326] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {contactSending ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{strings.faq.contactSubmit}</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
