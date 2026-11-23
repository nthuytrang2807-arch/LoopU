import {
  ArrowRight,
  ExternalLink,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  PlusCircle,
  RotateCcw,
  X,
} from 'lucide-react';
import { PointerEvent, useMemo, useRef, useState, WheelEvent } from 'react';
import { t } from '../i18n/translations';
import { formatVND } from '../lib/format';
import { AppLang, Product } from '../types';
import { ProductImage } from './ProductImage';

interface HeroSectionProps {
  lang: AppLang;
  products: Product[];
  onBrowseCatalog: () => void;
  onGoSell: () => void;
  onSelectProduct: (product: Product) => void;
}

interface MapPinSlot {
  id: string;
  areaVi: string;
  areaEn: string;
  addressQuery: string;
  left: string;
  top: string;
}

const HANOI_AREA_SLOTS: MapPinSlot[] = [
  {
    id: 'bk-neu',
    areaVi: 'Khu Bách Khoa – KTQD',
    areaEn: 'HUST – NEU Area',
    addressQuery: 'Đại học Bách Khoa Hà Nội, Hai Bà Trưng, Hà Nội',
    left: '60%',
    top: '53%',
  },
  {
    id: 'vnu-caugiay',
    areaVi: 'Khu ĐHQG – Mỹ Đình',
    areaEn: 'VNU – My Dinh',
    addressQuery: 'Đại học Quốc gia Hà Nội, Xuân Thủy, Cầu Giấy, Hà Nội',
    left: '43%',
    top: '44%',
  },
  {
    id: 'thanhxuan-trieukhuc',
    areaVi: 'Khu Thanh Xuân – Triều Khúc',
    areaEn: 'Thanh Xuan – Trieu Khuc',
    addressQuery: 'Triều Khúc, Thanh Xuân, Hà Nội',
    left: '48%',
    top: '64%',
  },
  {
    id: 'hoankiem-dongda',
    areaVi: 'Khu Đống Đa – Hoàn Kiếm',
    areaEn: 'Dong Da – Hoan Kiem',
    addressQuery: 'Hoàn Kiếm, Hà Nội',
    left: '56%',
    top: '39%',
  },
  {
    id: 'bactuliem',
    areaVi: 'Khu Bắc Từ Liêm – Cổ Nhuế',
    areaEn: 'Bac Tu Liem',
    addressQuery: 'Đại học Mỏ Địa chất, Cổ Nhuế, Bắc Từ Liêm, Hà Nội',
    left: '35%',
    top: '29%',
  },
];

function formatCompactPrice(price: number): string {
  if (price >= 1000000) {
    const m = price / 1000000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}tr`;
  }
  return `${Math.round(price / 1000)}k`;
}

function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function HeroSection({
  lang,
  products,
  onBrowseCatalog,
  onGoSell,
  onSelectProduct,
}: HeroSectionProps) {
  const strings = t(lang);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [activePinIndex, setActivePinIndex] = useState<number>(0);

  // Interactive zoom & pan state for the inline hero map
  const [heroZoom, setHeroZoom] = useState(1);
  const [heroPan, setHeroPan] = useState({ x: 0, y: 0 });
  const heroDragRef = useRef<{
    dragging: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  // Interactive zoom & pan state for the expanded map modal
  const [modalZoom, setModalZoom] = useState(1);
  const [modalPan, setModalPan] = useState({ x: 0, y: 0 });
  const modalDragRef = useRef<{
    dragging: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const kpis = [
    { label: strings.hero.kpi1Label, value: strings.hero.kpi1Value },
    { label: strings.hero.kpi2Label, value: strings.hero.kpi2Value },
    { label: strings.hero.kpi3Label, value: strings.hero.kpi3Value },
    { label: strings.hero.kpi4Label, value: strings.hero.kpi4Value },
  ];

  const pinnedItems = useMemo(() => {
    const available = products.filter((p) => p.stock > 0);
    const source = available.length > 0 ? available : products;
    return HANOI_AREA_SLOTS.slice(0, Math.min(HANOI_AREA_SLOTS.length, source.length)).map(
      (slot, idx) => ({
        slot,
        product: source[idx],
      })
    );
  }, [products]);

  const activePinned = pinnedItems[activePinIndex] ?? pinnedItems[0] ?? null;

  const clampPan = (x: number, y: number, zoom: number) => {
    const maxOffset = Math.max(0, (zoom - 1) * 180);
    return {
      x: Math.max(-maxOffset, Math.min(maxOffset, x)),
      y: Math.max(-maxOffset, Math.min(maxOffset, y)),
    };
  };

  const adjustHeroZoom = (delta: number) => {
    setHeroZoom((prev) => {
      const next = Number(Math.max(1, Math.min(3, prev + delta)).toFixed(2));
      setHeroPan((p) => (next === 1 ? { x: 0, y: 0 } : clampPan(p.x, p.y, next)));
      return next;
    });
  };

  const adjustModalZoom = (delta: number) => {
    setModalZoom((prev) => {
      const next = Number(Math.max(1, Math.min(3.5, prev + delta)).toFixed(2));
      setModalPan((p) => (next === 1 ? { x: 0, y: 0 } : clampPan(p.x, p.y, next)));
      return next;
    });
  };

  const handleOpenMapAtPin = (idx: number) => {
    setActivePinIndex(idx);
    setModalZoom(1.35);
    setModalPan({ x: 0, y: 0 });
    setMapModalOpen(true);
  };

  const handleHeroPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    heroDragRef.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: heroPan.x,
      originY: heroPan.y,
    };
  };

  const handleHeroPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!heroDragRef.current.dragging || heroZoom <= 1) return;
    const dx = e.clientX - heroDragRef.current.startX;
    const dy = e.clientY - heroDragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      heroDragRef.current.moved = true;
    }
    setHeroPan(clampPan(heroDragRef.current.originX + dx, heroDragRef.current.originY + dy, heroZoom));
  };

  const handleHeroPointerUp = () => {
    const wasMoved = heroDragRef.current.moved;
    heroDragRef.current.dragging = false;
    if (!wasMoved && heroZoom === 1) {
      setModalZoom(1);
      setModalPan({ x: 0, y: 0 });
      setMapModalOpen(true);
    }
  };

  const handleModalPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    modalDragRef.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: modalPan.x,
      originY: modalPan.y,
    };
  };

  const handleModalPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!modalDragRef.current.dragging || modalZoom <= 1) return;
    const dx = e.clientX - modalDragRef.current.startX;
    const dy = e.clientY - modalDragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      modalDragRef.current.moved = true;
    }
    setModalPan(clampPan(modalDragRef.current.originX + dx, modalDragRef.current.originY + dy, modalZoom));
  };

  const handleModalPointerUp = () => {
    modalDragRef.current.dragging = false;
  };

  const handleModalWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    adjustModalZoom(e.deltaY < 0 ? 0.25 : -0.25);
  };

  return (
    <section className="border-b border-[#E2E8E5] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {/* 2-Column Asymmetric Split Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-wider text-[#0369A1] uppercase mb-3">
              {strings.hero.kicker}
            </p>
            <h1
              className="font-display font-extrabold tracking-tight text-[#0F1412] leading-[1.12] mb-5"
              style={{
                fontSize: 'clamp(2rem, 3.6vw, 3.15rem)',
                textWrap: 'balance',
              }}
            >
              {strings.hero.title}
            </h1>
            <p className="text-base sm:text-lg text-[#0F1412]/75 leading-relaxed max-w-xl mb-8">
              {strings.hero.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onBrowseCatalog}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#1B4332] hover:bg-[#143326] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{strings.hero.primaryCta}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onGoSell}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#0F1412] text-[#0F1412] hover:bg-[#0F1412] hover:text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                <span>{strings.hero.secondaryCta}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div
              onPointerDown={handleHeroPointerDown}
              onPointerMove={handleHeroPointerMove}
              onPointerUp={handleHeroPointerUp}
              onPointerLeave={() => {
                heroDragRef.current.dragging = false;
              }}
              className={`relative h-full min-h-[280px] sm:min-h-[340px] lg:min-h-[390px] rounded-xl overflow-hidden border border-[#E2E8E5] bg-[#0F1412] ${
                heroZoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
              }`}
            >
              {/* Transform layer for crisp zoom & pan + aligned area pins */}
              <div
                className="relative w-full h-full transition-transform duration-150 ease-out"
                style={{
                  transform: `translate(${heroPan.x}px, ${heroPan.y}px) scale(${heroZoom})`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src="/assets/aistudio/Screenshot_2026-11-22_225708_dd453c48.png"
                  alt="Bản đồ khu vực giao dịch và nhận hàng tại Hà Nội"
                  draggable={false}
                  className="w-full h-full object-cover select-none"
                />

                {/* Floating Area Product Pins Over the Map */}
                {pinnedItems.map(({ slot, product }, idx) => {
                  const title = lang === 'vi' ? product.title : product.titleEn;
                  const areaLabel = lang === 'vi' ? slot.areaVi : slot.areaEn;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenMapAtPin(idx);
                      }}
                      style={{
                        left: slot.left,
                        top: slot.top,
                        transform: `translate(-50%, -50%) scale(${1 / Math.max(1, heroZoom * 0.75)})`,
                      }}
                      title={`${areaLabel} — ${title}`}
                      className="group absolute z-10 flex flex-col items-center cursor-pointer focus:outline-none"
                    >
                      <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 border-white bg-white shadow-[0_6px_16px_rgba(15,20,18,0.35)] transition-transform duration-200 group-hover:scale-110 group-hover:border-[#1B4332]">
                        <ProductImage
                          src={product.imageUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="mt-0.5 px-1.5 py-0.5 rounded bg-[#1B4332] text-white font-mono-tabular text-[10px] font-bold leading-none shadow-md border border-white/80 whitespace-nowrap">
                        {formatCompactPrice(product.price)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Top-right Map Controls: Zoom +/-/Reset + Google Maps Link + Expand */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                <div className="inline-flex items-center rounded-lg bg-[#0F1412]/90 border border-white/20 text-white shadow-md overflow-hidden">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustHeroZoom(-0.35);
                    }}
                    disabled={heroZoom <= 1}
                    aria-label={lang === 'vi' ? 'Thu nhỏ bản đồ' : 'Zoom out'}
                    className="p-1.5 hover:bg-[#1B4332] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 font-mono-tabular text-[11px] font-semibold">
                    {Math.round(heroZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustHeroZoom(0.35);
                    }}
                    disabled={heroZoom >= 3}
                    aria-label={lang === 'vi' ? 'Phóng to bản đồ' : 'Zoom in'}
                    className="p-1.5 hover:bg-[#1B4332] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {heroZoom > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHeroZoom(1);
                        setHeroPan({ x: 0, y: 0 });
                      }}
                      aria-label={lang === 'vi' ? 'Đặt lại bản đồ' : 'Reset zoom'}
                      className="p-1.5 hover:bg-[#1B4332] border-l border-white/20 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <a
                  href={buildGoogleMapsSearchUrl(
                    activePinned?.slot.addressQuery ?? 'Đại học Bách Khoa Hà Nội'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-[#0F1412] text-xs font-semibold shadow-md border border-[#E2E8E5] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#1B4332]" aria-hidden="true" />
                  <span className="hidden sm:inline">Google Maps</span>
                </a>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalZoom(1);
                    setModalPan({ x: 0, y: 0 });
                    setMapModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0F1412]/90 hover:bg-[#1B4332] text-white text-xs font-semibold shadow-md border border-white/20 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{lang === 'vi' ? 'Xem bản đồ' : 'View map'}</span>
                </button>
              </div>

              {/* Compact Bottom Gradient Caption */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 py-4 bg-gradient-to-t from-[#0F1412]/90 via-[#0F1412]/55 to-transparent text-white">
                <p className="text-xs font-medium text-white/90">
                  ĐH Bách Khoa - Kinh Tế Quốc Dân - ĐHQG Hà Nội
                </p>
                <p className="font-display text-base sm:text-lg font-semibold mt-0.5">
                  {lang === 'vi'
                    ? 'Giao dịch an toàn - An tâm mua sắm'
                    : 'Safe transactions — Shop with peace of mind'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column KPI Strip Below Hero Split */}
        <div className="mt-10 rounded-xl bg-[#0F1412] text-white grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/15">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="px-6 py-5">
              <p className="font-mono-tabular text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {kpi.value}
              </p>
              <p className="text-xs sm:text-sm text-white/75 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Full-Resolution Map Modal with Zoom/Pan & Direct Google Maps Links */}
      {mapModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={
            lang === 'vi'
              ? 'Bản đồ đồ dùng pass theo khu vực'
              : 'Interactive Campus Items Map'
          }
          onClick={() => setMapModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E2E8E5] rounded-xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#E2E8E5] flex flex-wrap items-center justify-between gap-4 bg-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-5 h-5 text-[#1B4332] shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-display text-base sm:text-lg font-bold text-[#0F1412] truncate">
                    {lang === 'vi'
                      ? 'Bản đồ đồ dùng pass theo khu vực Hà Nội'
                      : 'Hanoi Campus Secondhand Map'}
                  </h2>
                  <p className="text-xs text-[#0F1412]/65 truncate">
                    {lang === 'vi'
                      ? 'Cuộn chuột hoặc nhấn +/- để phóng to thu nhỏ, kéo để xem địa chỉ và mở trực tiếp trên Google Maps'
                      : 'Scroll or use +/- to zoom, drag to pan, and open exact addresses in Google Maps'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex items-center rounded-lg border border-[#E2E8E5] bg-[#F6F8F7] text-[#0F1412] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => adjustModalZoom(-0.35)}
                    disabled={modalZoom <= 1}
                    aria-label={lang === 'vi' ? 'Thu nhỏ' : 'Zoom out'}
                    className="p-2 hover:bg-white disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-2.5 font-mono-tabular text-xs font-semibold">
                    {Math.round(modalZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustModalZoom(0.35)}
                    disabled={modalZoom >= 3.5}
                    aria-label={lang === 'vi' ? 'Phóng to' : 'Zoom in'}
                    className="p-2 hover:bg-white disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalZoom(1);
                      setModalPan({ x: 0, y: 0 });
                    }}
                    aria-label={lang === 'vi' ? 'Đặt lại góc nhìn' : 'Reset view'}
                    className="p-2 hover:bg-white border-l border-[#E2E8E5] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setMapModalOpen(false)}
                  className="p-2 rounded-lg border border-[#E2E8E5] hover:bg-[#F6F8F7] text-[#0F1412] cursor-pointer"
                  aria-label={lang === 'vi' ? 'Đóng bản đồ' : 'Close map'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Zoomable Crisp Map + Selected Area Item Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
              <div
                onWheel={handleModalWheel}
                onPointerDown={handleModalPointerDown}
                onPointerMove={handleModalPointerMove}
                onPointerUp={handleModalPointerUp}
                onPointerLeave={() => {
                  modalDragRef.current.dragging = false;
                }}
                className={`lg:col-span-8 relative bg-[#F6F8F7] border-b lg:border-b-0 lg:border-r border-[#E2E8E5] flex items-center justify-center overflow-hidden ${
                  modalZoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                }`}
              >
                <div
                  className="relative w-full aspect-[16/9] transition-transform duration-150 ease-out"
                  style={{
                    transform: `translate(${modalPan.x}px, ${modalPan.y}px) scale(${modalZoom})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <img
                    src="/assets/aistudio/Screenshot_2026-11-22_225708_dd453c48.png"
                    alt="Bản đồ chi tiết khu vực đồ pass sinh viên Hà Nội"
                    draggable={false}
                    className="w-full h-full object-cover select-none"
                  />

                  {pinnedItems.map(({ slot, product }, idx) => {
                    const isSelected = idx === activePinIndex;
                    const title = lang === 'vi' ? product.title : product.titleEn;
                    const areaLabel = lang === 'vi' ? slot.areaVi : slot.areaEn;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setActivePinIndex(idx)}
                        style={{
                          left: slot.left,
                          top: slot.top,
                          transform: `translate(-50%, -50%) scale(${1 / Math.max(1, modalZoom * 0.72)})`,
                        }}
                        className={`group absolute flex flex-col items-center cursor-pointer transition-all ${
                          isSelected ? 'z-20' : 'z-10 hover:scale-105'
                        }`}
                        title={`${areaLabel} — ${title}`}
                      >
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 bg-white shadow-lg ${
                            isSelected
                              ? 'border-[#1B4332] ring-4 ring-[#1B4332]/25'
                              : 'border-white'
                          }`}
                        >
                          <ProductImage
                            src={product.imageUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span
                          className={`mt-1 px-2 py-0.5 rounded font-mono-tabular text-[11px] font-bold leading-none shadow border whitespace-nowrap ${
                            isSelected
                              ? 'bg-[#0F1412] text-white border-white'
                              : 'bg-[#1B4332] text-white border-white/80'
                          }`}
                        >
                          {formatCompactPrice(product.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Sidebar: Selected Pin Detail + Direct Google Maps Address Link */}
              <div className="lg:col-span-4 p-5 flex flex-col gap-4 bg-white overflow-y-auto">
                {activePinned && (
                  <div className="border border-[#E2E8E5] rounded-xl p-4 bg-[#F6F8F7] space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#1B4332]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {lang === 'vi'
                          ? activePinned.slot.areaVi
                          : activePinned.slot.areaEn}
                      </span>
                      <span className="font-mono-tabular text-[#0F1412]/60 truncate">
                        {activePinned.product.campus}
                      </span>
                    </div>

                    <p className="text-xs text-[#0F1412]/70">
                      {activePinned.slot.addressQuery}
                    </p>

                    <div className="aspect-[16/10] rounded-lg overflow-hidden border border-[#E2E8E5] bg-white">
                      <ProductImage
                        src={activePinned.product.imageUrl}
                        alt={
                          lang === 'vi'
                            ? activePinned.product.title
                            : activePinned.product.titleEn
                        }
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <h3 className="font-display text-base font-bold text-[#0F1412] leading-snug">
                      {lang === 'vi'
                        ? activePinned.product.title
                        : activePinned.product.titleEn}
                    </h3>

                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono-tabular text-lg font-bold text-[#1B4332]">
                        {formatVND(activePinned.product.price)}
                      </span>
                      {activePinned.product.originalPrice >
                        activePinned.product.price && (
                        <span className="font-mono-tabular text-xs line-through text-[#0F1412]/45">
                          {formatVND(activePinned.product.originalPrice)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const target = activePinned.product;
                          setMapModalOpen(false);
                          onSelectProduct(target);
                        }}
                        className="w-full py-2.5 px-4 rounded-lg bg-[#1B4332] hover:bg-[#143326] text-white text-sm font-semibold transition-colors cursor-pointer"
                      >
                        {lang === 'vi'
                          ? 'Xem chi tiết món đồ này'
                          : 'View item details'}
                      </button>

                      <a
                        href={buildGoogleMapsSearchUrl(activePinned.slot.addressQuery)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-[#0F1412] text-[#0F1412] hover:bg-[#0F1412] hover:text-white text-sm font-semibold transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>
                          {lang === 'vi'
                            ? 'Mở địa chỉ trên Google Maps'
                            : 'Open address in Google Maps'}
                        </span>
                      </a>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#0F1412]/55">
                    {lang === 'vi'
                      ? 'Các khu vực đang có đồ pass'
                      : 'Active campus zones'}
                  </p>
                  <div className="divide-y divide-[#E2E8E5] border border-[#E2E8E5] rounded-xl overflow-hidden">
                    {pinnedItems.map(({ slot, product }, idx) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setActivePinIndex(idx)}
                        className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                          idx === activePinIndex
                            ? 'bg-[#1B4332] text-white'
                            : 'bg-white hover:bg-[#F6F8F7] text-[#0F1412]'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-md overflow-hidden border border-white/40 shrink-0 bg-white">
                          <ProductImage
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[11px] font-semibold truncate ${
                              idx === activePinIndex
                                ? 'text-white/80'
                                : 'text-[#1B4332]'
                            }`}
                          >
                            {lang === 'vi' ? slot.areaVi : slot.areaEn}
                          </p>
                          <p className="text-xs font-medium truncate">
                            {lang === 'vi' ? product.title : product.titleEn}
                          </p>
                        </div>
                        <span className="font-mono-tabular text-xs font-bold shrink-0">
                          {formatCompactPrice(product.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
