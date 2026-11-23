import { ArrowRight, CheckCircle2, Copy, Leaf, PackageCheck, Recycle, Sparkles, Ticket } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDateShort } from '../lib/format';
import { ActiveView, AppLang, GreenCreditSummary, ToastMessage } from '../types';

interface GreenCreditViewProps {
  lang: AppLang;
  onNavigate: (view: ActiveView) => void;
  onNotify: (type: ToastMessage['type'], title: string, description?: string) => void;
}

export function GreenCreditView({
  lang,
  onNavigate,
  onNotify,
}: GreenCreditViewProps) {
  const [summary, setSummary] = useState<GreenCreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getGreenCredit();
      setSummary(data);
    } catch (err) {
      onNotify(
        'error',
        lang === 'vi' ? 'Không thể tải dữ liệu Green Credit' : 'Unable to load Green Credit',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setLoading(false);
    }
  }, [lang, onNotify]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleCheckin = async () => {
    setCheckingIn(true);
    try {
      const updated = await api.checkinGreenCredit();
      setSummary(updated);
      onNotify(
        'success',
        lang === 'vi' ? 'Điểm danh xanh thành công (+10 điểm)' : 'Daily green check-in complete (+10 pts)',
        lang === 'vi'
          ? `Số dư hiện tại: ${updated.balance} Green Credit`
          : `Current balance: ${updated.balance} Green Credit`
      );
    } catch (err) {
      onNotify(
        'warning',
        err instanceof Error
          ? err.message
          : lang === 'vi'
          ? 'Không thể điểm danh hôm nay.'
          : 'Could not complete check-in.'
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const handleRedeem = async (rewardId: string) => {
    setRedeemingId(rewardId);
    try {
      const res = await api.redeemGreenCredit(rewardId);
      setSummary(res.summary);
      onNotify(
        'success',
        lang === 'vi' ? 'Đổi ưu đãi thành công' : 'Reward redeemed',
        `${lang === 'vi' ? 'Mã voucher:' : 'Voucher code:'} ${res.voucher.code}`
      );
    } catch (err) {
      onNotify(
        'warning',
        err instanceof Error
          ? err.message
          : lang === 'vi'
          ? 'Không thể đổi ưu đãi.'
          : 'Redemption failed.'
      );
    } finally {
      setRedeemingId(null);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      onNotify(
        'info',
        lang === 'vi' ? 'Đã sao chép mã ưu đãi' : 'Copied voucher code',
        code
      );
      setTimeout(() => setCopiedCode((prev) => (prev === code ? null : prev)), 2500);
    } catch {
      onNotify('info', code);
    }
  };

  const balance = summary?.balance ?? 0;
  const circularCount = summary?.circularItemsCount ?? 0;
  const co2Saved = summary?.co2SavedKg ?? 0;
  const voucherCount = summary?.vouchers.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Band */}
      <section className="rounded-xl bg-[#0F1412] text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            {lang === 'vi' ? 'Chương trình tích điểm xanh' : 'Circular Sustainability Rewards'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Green Credit LoopU
          </h1>
          <p className="text-sm text-white/75 leading-relaxed">
            {lang === 'vi'
              ? 'Tích lũy điểm xanh mỗi khi đăng bán đồ dùng cũ, mua sắm tuần hoàn hoặc điểm danh hằng ngày để đổi ưu đãi miễn phí vận chuyển và giảm giá đơn hàng.'
              : 'Earn Green Credit whenever you list pre-owned essentials, place circular orders, or check in daily, then redeem vouchers for campus delivery and checkout discounts.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={checkingIn || loading || summary?.canCheckinToday === false}
            onClick={handleCheckin}
            className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              summary?.canCheckinToday === false
                ? 'bg-white/15 text-white/75 cursor-not-allowed'
                : 'bg-[#1B4332] hover:bg-[#143326] text-white border border-white/15'
            }`}
          >
            {summary?.canCheckinToday === false ? (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {lang === 'vi' ? 'Đã điểm danh hôm nay' : 'Checked in today'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>
                  {checkingIn
                    ? lang === 'vi'
                      ? 'Đang ghi nhận...'
                      : 'Recording...'
                    : lang === 'vi'
                    ? 'Điểm danh xanh (+10 điểm)'
                    : 'Daily Green Check-in (+10 pts)'}
                </span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 4-column Tabular KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 border border-[#E2E8E5] rounded-xl bg-white overflow-hidden">
        <div className="p-5 border-b lg:border-b-0 border-r border-[#E2E8E5]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0F1412]/55">
            {lang === 'vi' ? 'Số dư Green Credit' : 'Green Credit Balance'}
          </p>
          <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#1B4332] mt-2">
            {loading ? '—' : `${balance.toLocaleString('vi-VN')} pts`}
          </p>
          <p className="text-xs text-[#0F1412]/60 mt-1">
            {lang === 'vi' ? 'Sẵn sàng đổi ưu đãi' : 'Available to redeem'}
          </p>
        </div>

        <div className="p-5 border-b lg:border-b-0 lg:border-r border-[#E2E8E5]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0F1412]/55">
            {lang === 'vi' ? 'Đồ dùng đã tuần hoàn' : 'Circular Items Loop'}
          </p>
          <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#0F1412] mt-2">
            {loading ? '—' : circularCount}
          </p>
          <p className="text-xs text-[#0F1412]/60 mt-1">
            {lang === 'vi' ? 'Tin đăng & đơn trao đổi' : 'Listings & orders'}
          </p>
        </div>

        <div className="p-5 border-r border-[#E2E8E5]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0F1412]/55">
            {lang === 'vi' ? 'CO₂ giảm thải ước tính' : 'Estimated CO₂ Saved'}
          </p>
          <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#0369A1] mt-2">
            {loading ? '—' : `${co2Saved} kg`}
          </p>
          <p className="text-xs text-[#0F1412]/60 mt-1">
            {lang === 'vi' ? 'Từ tái sử dụng thiết bị' : 'From campus reuse'}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0F1412]/55">
            {lang === 'vi' ? 'Ưu đãi đã đổi' : 'Redeemed Vouchers'}
          </p>
          <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#0F1412] mt-2">
            {loading ? '—' : voucherCount}
          </p>
          <p className="text-xs text-[#0F1412]/60 mt-1">
            {lang === 'vi' ? 'Mã hợp lệ tại LoopU' : 'Active LoopU codes'}
          </p>
        </div>
      </section>

      {/* Ways to Earn Green Credit */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0F1412]">
              {lang === 'vi' ? 'Cách tích điểm Green Credit' : 'How to Earn Green Credit'}
            </h2>
            <p className="text-sm text-[#0F1412]/65">
              {lang === 'vi'
                ? 'Điểm thưởng được hệ thống cộng tự động ngay khi bạn thực hiện giao dịch hoặc đăng bán.'
                : 'Points are automatically credited when you post listings, place orders, or confirm handovers.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="border border-[#E2E8E5] rounded-xl p-5 bg-[#F6F8F7] flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Leaf className="w-5 h-5 text-[#1B4332]" />
                <span className="font-mono-tabular text-sm font-bold text-[#1B4332]">
                  +10 điểm / ngày
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-[#0F1412]">
                {lang === 'vi' ? 'Điểm danh sống xanh' : 'Daily Green Check-in'}
              </h3>
              <p className="text-sm text-[#0F1412]/70 leading-relaxed">
                {lang === 'vi'
                  ? 'Duy trì thói quen tuần hoàn mỗi ngày để nhận thêm 10 điểm vào ví Green Credit.'
                  : 'Check in once per calendar day to collect 10 bonus points.'}
              </p>
            </div>
            <button
              type="button"
              disabled={checkingIn || loading || summary?.canCheckinToday === false}
              onClick={handleCheckin}
              className="inline-flex items-center justify-between px-4 py-2.5 rounded-lg bg-white border border-[#E2E8E5] hover:border-[#1B4332] text-sm font-semibold text-[#0F1412] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>
                {summary?.canCheckinToday === false
                  ? lang === 'vi'
                    ? 'Hôm nay đã hoàn thành'
                    : 'Completed today'
                  : lang === 'vi'
                  ? 'Nhận 10 điểm ngay'
                  : 'Claim +10 pts'}
              </span>
              <ArrowRight className="w-4 h-4 text-[#1B4332]" />
            </button>
          </div>

          <div className="border border-[#E2E8E5] rounded-xl p-5 bg-[#F6F8F7] flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Recycle className="w-5 h-5 text-[#1B4332]" />
                <span className="font-mono-tabular text-sm font-bold text-[#1B4332]">
                  +40 điểm / tin đăng
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-[#0F1412]">
                {lang === 'vi' ? 'Đăng bán đồ dùng cũ' : 'List Pre-Owned Items'}
              </h3>
              <p className="text-sm text-[#0F1412]/70 leading-relaxed">
                {lang === 'vi'
                  ? 'Trao vòng đời mới cho giáo trình, thiết bị công nghệ hoặc đồ dùng phòng trọ.'
                  : 'Give textbooks, electronics, or dorm appliances a second life for fellow students.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('sell')}
              className="inline-flex items-center justify-between px-4 py-2.5 rounded-lg bg-white border border-[#E2E8E5] hover:border-[#1B4332] text-sm font-semibold text-[#0F1412] transition-colors cursor-pointer"
            >
              <span>{lang === 'vi' ? 'Đi tới Đăng bán' : 'Go to Sell Item'}</span>
              <ArrowRight className="w-4 h-4 text-[#1B4332]" />
            </button>
          </div>

          <div className="border border-[#E2E8E5] rounded-xl p-5 bg-[#F6F8F7] flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <PackageCheck className="w-5 h-5 text-[#1B4332]" />
                <span className="font-mono-tabular text-sm font-bold text-[#1B4332]">
                  +25 điểm / sản phẩm
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-[#0F1412]">
                {lang === 'vi' ? 'Mua sắm & xác nhận đơn' : 'Buy & Confirm Circular Orders'}
              </h3>
              <p className="text-sm text-[#0F1412]/70 leading-relaxed">
                {lang === 'vi'
                  ? 'Nhận 25 điểm mỗi sản phẩm đặt mua và cộng thêm 15 điểm khi xác nhận đã nhận hàng.'
                  : 'Earn 25 pts per item ordered plus 15 bonus pts when marking delivery complete.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('marketplace')}
              className="inline-flex items-center justify-between px-4 py-2.5 rounded-lg bg-white border border-[#E2E8E5] hover:border-[#1B4332] text-sm font-semibold text-[#0F1412] transition-colors cursor-pointer"
            >
              <span>{lang === 'vi' ? 'Khám phá sản phẩm' : 'Browse Catalog'}</span>
              <ArrowRight className="w-4 h-4 text-[#1B4332]" />
            </button>
          </div>
        </div>
      </section>

      {/* Redeem Rewards & Active Vouchers */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-xl font-bold text-[#0F1412]">
            {lang === 'vi' ? 'Đổi điểm nhận ưu đãi' : 'Redeem Green Credit Rewards'}
          </h2>

          <div className="space-y-3">
            {(summary?.rewards ?? []).map((reward) => {
              const affordable = balance >= reward.pointsCost;
              const isBusy = redeemingId === reward.id;
              return (
                <div
                  key={reward.id}
                  className="border border-[#E2E8E5] rounded-xl p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono-tabular text-xs font-bold px-2 py-0.5 rounded bg-[#1B4332] text-white">
                        {reward.discountLabel}
                      </span>
                      <span className="font-mono-tabular text-xs font-semibold text-[#0369A1]">
                        {reward.pointsCost} Green Credit
                      </span>
                    </div>
                    <h3 className="font-display text-base font-bold text-[#0F1412]">
                      {lang === 'vi' ? reward.title : reward.titleEn}
                    </h3>
                    <p className="text-sm text-[#0F1412]/70">
                      {lang === 'vi' ? reward.description : reward.descriptionEn}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!affordable || isBusy}
                    onClick={() => handleRedeem(reward.id)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      affordable
                        ? 'bg-[#1B4332] hover:bg-[#143326] text-white'
                        : 'bg-[#F6F8F7] text-[#0F1412]/45 border border-[#E2E8E5] cursor-not-allowed'
                    }`}
                  >
                    {isBusy
                      ? lang === 'vi'
                        ? 'Đang đổi...'
                        : 'Redeeming...'
                      : affordable
                      ? lang === 'vi'
                        ? `Đổi ${reward.pointsCost} điểm`
                        : `Redeem ${reward.pointsCost} pts`
                      : lang === 'vi'
                      ? `Thiếu ${reward.pointsCost - balance} điểm`
                      : `Need ${reward.pointsCost - balance} more`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Redeemed Vouchers Wallet */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-xl font-bold text-[#0F1412]">
            {lang === 'vi' ? 'Ví mã ưu đãi của bạn' : 'Your Active Vouchers'}
          </h2>

          {(!summary || summary.vouchers.length === 0) ? (
            <div className="border border-[#E2E8E5] rounded-xl p-6 bg-[#F6F8F7] space-y-2 text-sm text-[#0F1412]/70">
              <div className="flex items-center gap-2 font-semibold text-[#0F1412]">
                <Ticket className="w-4 h-4 text-[#1B4332]" />
                <span>
                  {lang === 'vi' ? 'Chưa có mã ưu đãi nào được đổi' : 'No vouchers redeemed yet'}
                </span>
              </div>
              <p>
                {lang === 'vi'
                  ? 'Chọn một gói ưu đãi bên cạnh để đổi điểm Green Credit lấy mã sử dụng cho đơn hàng tiếp theo.'
                  : 'Choose a reward on the left to convert your Green Credit balance into a voucher code.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.vouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className="border border-[#E2E8E5] rounded-xl p-4 bg-[#F6F8F7] flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F1412] truncate">
                      {lang === 'vi' ? voucher.title : voucher.titleEn}
                    </p>
                    <p className="font-mono-tabular text-base font-bold text-[#1B4332]">
                      {voucher.code}
                    </p>
                    <p className="text-xs text-[#0F1412]/55">
                      {formatDateShort(voucher.createdAt, lang)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(voucher.code)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#E2E8E5] hover:border-[#1B4332] text-xs font-semibold text-[#0F1412] shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {copiedCode === voucher.code
                        ? lang === 'vi'
                          ? 'Đã chép'
                          : 'Copied'
                        : lang === 'vi'
                        ? 'Sao chép'
                        : 'Copy'}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Transaction History Ledger */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0F1412]">
          {lang === 'vi' ? 'Lịch sử tích & đổi Green Credit' : 'Green Credit Activity Ledger'}
        </h2>

        <div className="border border-[#E2E8E5] rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#F6F8F7] border-b border-[#E2E8E5] text-xs font-semibold uppercase tracking-wider text-[#0F1412]/65">
                  <th className="py-3.5 px-4">{lang === 'vi' ? 'Hoạt động' : 'Activity'}</th>
                  <th className="py-3.5 px-4">{lang === 'vi' ? 'Phân loại' : 'Category'}</th>
                  <th className="py-3.5 px-4">{lang === 'vi' ? 'Thời gian' : 'Timestamp'}</th>
                  <th className="py-3.5 px-4 text-right">{lang === 'vi' ? 'Điểm' : 'Points'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E5]">
                {(summary?.transactions ?? []).map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F6F8F7]/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#0F1412]">
                      {lang === 'vi' ? tx.title : tx.titleEn}
                    </td>
                    <td className="py-3.5 px-4 text-[#0F1412]/70">
                      {tx.category === 'checkin'
                        ? lang === 'vi'
                          ? 'Điểm danh'
                          : 'Check-in'
                        : tx.category === 'listing'
                        ? lang === 'vi'
                          ? 'Đăng bán'
                          : 'Listing'
                        : tx.category === 'order'
                        ? lang === 'vi'
                          ? 'Giao dịch'
                          : 'Order'
                        : lang === 'vi'
                        ? 'Đổi thưởng'
                        : 'Reward'}
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular text-xs text-[#0F1412]/65 whitespace-nowrap">
                      {formatDateShort(tx.createdAt, lang)}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono-tabular font-bold whitespace-nowrap ${
                        tx.points >= 0 ? 'text-[#1B4332]' : 'text-[#B91C1C]'
                      }`}
                    >
                      {tx.points >= 0 ? `+${tx.points}` : tx.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
