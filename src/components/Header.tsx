import { Menu, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import { t } from '../i18n/translations';
import { ActiveView, AppLang } from '../types';

interface HeaderProps {
  lang: AppLang;
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  cartCount: number;
  onOpenCart: () => void;
}

export function Header({
  lang,
  activeView,
  onNavigate,
  cartCount,
  onOpenCart,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const strings = t(lang);

  const navItems: Array<{ id: ActiveView; label: string }> = [
    { id: 'marketplace', label: strings.nav.explore },
    { id: 'sell', label: strings.nav.sell },
    { id: 'orders', label: strings.nav.orders },
    { id: 'green_credit', label: strings.nav.greenCredit },
    { id: 'admin', label: strings.nav.admin },
    { id: 'account', label: strings.nav.account },
  ];

  const handleNavClick = (view: ActiveView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E2E8E5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('marketplace')}
          className="font-display text-xl font-extrabold tracking-tight text-[#0F1412] hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          LOOPU
        </button>

        {/* Zone 2: 6 concise single-line navigation links */}
        <nav
          className="hidden md:flex items-center gap-5 lg:gap-7"
          aria-label="Điều hướng chính"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-[#1B4332] font-semibold'
                    : 'text-[#0F1412]/75 hover:text-[#0F1412]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute left-0 right-0 -bottom-[19px] h-0.5 bg-[#1B4332]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action + Mobile menu trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B4332] hover:bg-[#143326] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{strings.nav.cart}</span>
            <span className="font-mono-tabular text-xs bg-white text-[#0F1412] px-1.5 py-0.5 rounded font-semibold">
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg border border-[#E2E8E5] text-[#0F1412] hover:bg-[#F6F8F7] transition-colors"
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          className="md:hidden border-t border-[#E2E8E5] bg-white px-4 py-3 flex flex-col gap-1"
          aria-label="Điều hướng di động"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1B4332] text-white font-semibold'
                    : 'text-[#0F1412] hover:bg-[#F6F8F7]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
