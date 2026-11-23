import { X } from 'lucide-react';
import { useState } from 'react';
import { t } from '../i18n/translations';
import { ActiveView, AppLang } from '../types';

interface FooterProps {
  lang: AppLang;
  onChangeLang: (lang: AppLang) => void;
  onNavigate: (view: ActiveView) => void;
}

export function Footer({ lang, onChangeLang, onNavigate }: FooterProps) {
  const strings = t(lang);
  const [policyModal, setPolicyModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <footer className="bg-[#0F1412] text-white border-t border-white/10 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/15">
          <div className="md:col-span-5 space-y-3">
            <span className="font-display text-xl font-extrabold tracking-tight text-white">
              {strings.brand}
            </span>
            <p className="text-sm text-white/70 leading-relaxed max-w-md">
              {strings.footer.tagline}
            </p>
          </div>

          <div className="md:col-span-3 space-y-2.5">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white/60">
              {strings.footer.linksTitle}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('marketplace')}
                  className="text-white/85 hover:text-white transition-colors cursor-pointer"
                >
                  {strings.nav.explore}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('sell')}
                  className="text-white/85 hover:text-white transition-colors cursor-pointer"
                >
                  {strings.nav.sell}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('orders')}
                  className="text-white/85 hover:text-white transition-colors cursor-pointer"
                >
                  {strings.nav.orders}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('green_credit')}
                  className="text-white/85 hover:text-white transition-colors cursor-pointer"
                >
                  {strings.nav.greenCredit}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="text-white/85 hover:text-white transition-colors cursor-pointer"
                >
                  {strings.nav.admin}
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white/60">
              {strings.footer.policyTitle}
            </h3>
            <div className="flex flex-col items-start gap-2 text-sm">
              <button
                type="button"
                onClick={() => setPolicyModal('privacy')}
                className="text-white/85 hover:text-white transition-colors cursor-pointer"
              >
                {strings.footer.privacy}
              </button>
              <button
                type="button"
                onClick={() => setPolicyModal('terms')}
                className="text-white/85 hover:text-white transition-colors cursor-pointer"
              >
                {strings.footer.terms}
              </button>
            </div>

            <div className="pt-2">
              <p className="text-xs text-white/60 mb-1.5">
                {strings.footer.language}
              </p>
              <div className="inline-flex items-center p-1 rounded-lg bg-white/10">
                <button
                  type="button"
                  onClick={() => onChangeLang('vi')}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                    lang === 'vi' ? 'bg-white text-[#0F1412]' : 'text-white/80'
                  }`}
                >
                  Tiếng Việt
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLang('en')}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                    lang === 'en' ? 'bg-white text-[#0F1412]' : 'text-white/80'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <p>{strings.footer.copyright}</p>
          <p>support@loopu.sv.vn - Hotline: 1900xxxx</p>
        </div>
      </div>

      {/* Policy Modal */}
      {policyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white text-[#0F1412] max-w-lg w-full rounded-xl p-6 space-y-4 border border-[#E2E8E5]">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-bold">
                {policyModal === 'privacy'
                  ? strings.footer.privacy
                  : strings.footer.terms}
              </h4>
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                className="p-1.5 rounded-lg border border-[#E2E8E5] hover:bg-[#F6F8F7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-[#0F1412]/80 space-y-2.5 leading-relaxed">
              {policyModal === 'privacy' ? (
                <>
                  <p>
                    Loop.sv.vn chỉ thu thập thông tin cần thiết cho giao dịch nội khu
                    (họ tên, số điện thoại liên hệ nhận hàng, mã số sinh viên và địa
                    chỉ ký túc xá).
                  </p>
                  <p>
                    Mật khẩu người dùng được băm một chiều (scrypt) trên máy chủ và
                    phiên làm việc sử dụng mã xác thực ký số an toàn.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Mọi sản phẩm niêm yết trên Loop.sv.vn cần phản ánh đúng tình trạng
                    thực tế, không kinh doanh tài liệu vi phạm bản quyền hoặc vật phẩm
                    cấm trong khuôn viên ký túc xá.
                  </p>
                  <p>
                    Đơn hàng từ 300.000₫ được miễn phí giao nhận tại cổng trường hoặc
                    tòa nhà KTX liên kết.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
