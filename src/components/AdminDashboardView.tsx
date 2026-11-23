import {
  CheckCircle2,
  Lock,
  LogOut,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, getAdminToken, setAdminToken } from '../lib/api';
import {
  formatDateShort,
  formatVND,
  getCategoryLabel,
  getOrderStatusLabel,
} from '../lib/format';
import {
  AdminOverviewData,
  AppLang,
  OrderStatus,
  Product,
} from '../types';

interface AdminDashboardViewProps {
  lang: AppLang;
  onRefreshStorefront: () => Promise<void>;
  onSelectProduct: (product: Product) => void;
  onNotify: (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    description?: string
  ) => void;
}

type AdminTab = 'orders' | 'inventory' | 'community';

export function AdminDashboardView({
  lang,
  onRefreshStorefront,
  onSelectProduct,
  onNotify,
}: AdminDashboardViewProps) {
  const [statusLoading, setStatusLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [viaEnv, setViaEnv] = useState(false);
  const [isAuthed, setIsAuthed] = useState(Boolean(getAdminToken()));

  const [passcode, setPasscode] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');

  const fetchOverview = useCallback(async () => {
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
    } catch (err) {
      setIsAuthed(false);
      setAdminToken(null);
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Phiên quản trị đã hết hạn.'
      );
    }
  }, [onNotify]);

  useEffect(() => {
    let active = true;
    api
      .getAdminStatus()
      .then((res) => {
        if (!active) return;
        setConfigured(res.configured);
        setViaEnv(res.viaEnv);
        if (getAdminToken()) {
          fetchOverview();
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchOverview]);

  const handleClaimOrLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    try {
      const res = configured
        ? await api.loginAdmin(passcode)
        : await api.claimAdmin(passcode);
      setAdminToken(res.token);
      setConfigured(true);
      setIsAuthed(true);
      setPasscode('');
      await fetchOverview();
      onNotify(
        'success',
        configured
          ? lang === 'vi'
            ? 'Đã mở khóa Bảng điều khiển quản trị'
            : 'Admin Dashboard unlocked'
          : lang === 'vi'
          ? 'Đã thiết lập mật khẩu quản trị thành công'
          : 'Admin passcode configured'
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Xác thực quản trị thất bại.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    setIsAuthed(false);
    setOverview(null);
  };

  const handleOrderStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await api.updateAdminOrderStatus(orderId, status);
      await fetchOverview();
      await onRefreshStorefront();
      onNotify('success', lang === 'vi' ? 'Đã cập nhật trạng thái đơn' : 'Order updated');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Lỗi cập nhật đơn.');
    }
  };

  const handleStockStep = async (product: Product, delta: number) => {
    const nextStock = Math.max(0, product.stock + delta);
    try {
      await api.updateProduct(product.id, { stock: nextStock }, 'admin');
      await fetchOverview();
      await onRefreshStorefront();
      onNotify('info', `${product.title}: Kho = ${nextStock}`);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Lỗi cập nhật kho.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await api.deleteProduct(productId, 'admin');
      await fetchOverview();
      await onRefreshStorefront();
      onNotify('success', lang === 'vi' ? 'Đã xóa sản phẩm' : 'Product deleted');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Lỗi xóa sản phẩm.');
    }
  };

  const handleToggleSupport = async (supportId: string) => {
    try {
      await api.toggleSupportStatus(supportId);
      await fetchOverview();
      onNotify('info', lang === 'vi' ? 'Đã cập nhật trạng thái hỗ trợ' : 'Ticket status updated');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Lỗi cập nhật.');
    }
  };

  if (statusLoading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="h-40 rounded-xl border border-[#E2E8E5] bg-[#F6F8F7] animate-pulse" />
      </section>
    );
  }

  // Gate: First-Run Admin Claim or Admin Login
  if (!isAuthed || !overview) {
    return (
      <section className="max-w-lg mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-xl border border-[#E2E8E5] bg-white p-7 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-[#0F1412] text-white flex items-center justify-center shrink-0">
              {configured ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[#0F1412]">
                {configured
                  ? lang === 'vi'
                    ? 'Đăng nhập Quản trị Loop.sv.vn'
                    : 'Loop.sv.vn Admin Sign In'
                  : lang === 'vi'
                  ? 'Thiết lập mật khẩu Quản trị lần đầu'
                  : 'First-Run Admin Setup'}
              </h1>
              <p className="text-xs text-[#0F1412]/65 mt-0.5">
                {configured
                  ? viaEnv
                    ? lang === 'vi'
                      ? 'Xác thực bằng ADMIN_PASSCODE trong biến môi trường.'
                      : 'Verified against ADMIN_PASSCODE environment secret.'
                    : lang === 'vi'
                    ? 'Nhập mật khẩu quản trị bạn đã thiết lập cho phiên bản này.'
                    : 'Enter the admin passcode claimed for this workspace.'
                  : lang === 'vi'
                  ? 'Chưa có mật khẩu quản trị. Hãy tự đặt mật khẩu lần đầu (tối thiểu 6 ký tự) để kích hoạt Dashboard.'
                  : 'No admin passcode is set yet. Claim a password (min 6 chars) to lock and unlock the Dashboard.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleClaimOrLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F1412] mb-1.5">
                {configured
                  ? lang === 'vi'
                    ? 'Mật khẩu quản trị'
                    : 'Admin Passcode'
                  : lang === 'vi'
                  ? 'Tạo mật khẩu quản trị mới'
                  : 'Choose Admin Passcode'}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={authBusy}
              className="w-full py-2.5 rounded-lg bg-[#1B4332] hover:bg-[#143326] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {authBusy
                ? lang === 'vi'
                  ? 'Đang xác thực...'
                  : 'Verifying...'
                : configured
                ? lang === 'vi'
                  ? 'Mở bảng điều khiển'
                  : 'Unlock Dashboard'
                : lang === 'vi'
                ? 'Kích hoạt & vào Dashboard'
                : 'Claim & Enter Dashboard'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  const maxCatRevenue = Math.max(
    1,
    ...overview.categoryStats.map((c) => c.revenue)
  );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Admin Header */}
      <div className="pb-6 border-b border-[#E2E8E5] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#0369A1] uppercase tracking-wider">
            Loop.sv.vn Operations
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1412] mt-1">
            {lang === 'vi'
              ? 'Bảng điều khiển Quản trị & Vận hành'
              : 'Marketplace Operations Dashboard'}
          </h1>
        </div>

        <button
          type="button"
          onClick={handleAdminLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8E5] text-xs font-semibold text-[#0F1412] hover:bg-[#F6F8F7] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Khóa phiên quản trị' : 'Lock Admin'}</span>
        </button>
      </div>

      {/* 4-Column Tabular KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#0F1412] text-white p-5">
          <p className="text-xs text-white/70">
            {lang === 'vi' ? 'Tổng doanh thu hợp lệ' : 'Gross Merchandise Value'}
          </p>
          <p className="font-mono-tabular text-2xl font-bold mt-1.5">
            {formatVND(overview.kpis.totalRevenue)}
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8E5] bg-white p-5">
          <p className="text-xs text-[#0F1412]/65">
            {lang === 'vi' ? 'Đơn hàng đang xử lý' : 'Active Orders'}
          </p>
          <p className="font-mono-tabular text-2xl font-bold text-[#0369A1] mt-1.5">
            {overview.kpis.activeOrders}
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8E5] bg-white p-5">
          <p className="text-xs text-[#0F1412]/65">
            {lang === 'vi' ? 'Sản phẩm đang niêm yết' : 'Active Listings'}
          </p>
          <p className="font-mono-tabular text-2xl font-bold text-[#1B4332] mt-1.5">
            {overview.kpis.totalProducts}
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8E5] bg-white p-5">
          <p className="text-xs text-[#0F1412]/65">
            {lang === 'vi' ? 'Sinh viên trong hệ thống' : 'Registered Students'}
          </p>
          <p className="font-mono-tabular text-2xl font-bold text-[#0F1412] mt-1.5">
            {overview.kpis.totalStudents}
          </p>
        </div>
      </div>

      {/* Category Revenue Breakdown Chart */}
      <div className="rounded-xl border border-[#E2E8E5] bg-white p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="font-display text-base font-bold text-[#0F1412]">
            {lang === 'vi'
              ? 'Doanh thu & Số lượng theo danh mục'
              : 'Revenue & Listings by Category'}
          </h2>
          <span className="font-mono-tabular text-xs text-[#0F1412]/65">
            {overview.kpis.completedOrders}{' '}
            {lang === 'vi' ? 'đơn hoàn tất' : 'completed orders'}
          </span>
        </div>

        <div className="space-y-3">
          {overview.categoryStats.map((cat) => {
            const pct = Math.round((cat.revenue / maxCatRevenue) * 100);
            return (
              <div
                key={cat.category}
                className="grid grid-cols-12 items-center gap-3 text-xs"
              >
                <span className="col-span-4 sm:col-span-3 font-medium text-[#0F1412] truncate">
                  {getCategoryLabel(cat.category, lang)}
                </span>
                <div className="col-span-5 sm:col-span-6 h-2.5 rounded-full bg-[#F6F8F7] border border-[#E2E8E5] overflow-hidden">
                  <div
                    className="h-full bg-[#1B4332] transition-all duration-300"
                    style={{ width: `${Math.max(pct, cat.revenue > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="col-span-3 text-right font-mono-tabular font-semibold text-[#0F1412]">
                  {formatVND(cat.revenue)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F6F8F7] border border-[#E2E8E5] w-fit">
        {(
          [
            {
              id: 'orders',
              label:
                lang === 'vi'
                  ? `Quản lý đơn (${overview.orders.length})`
                  : `Orders (${overview.orders.length})`,
            },
            {
              id: 'inventory',
              label:
                lang === 'vi'
                  ? `Kho hàng (${overview.products.length})`
                  : `Inventory (${overview.products.length})`,
            },
            {
              id: 'community',
              label:
                lang === 'vi'
                  ? `Sinh viên & Hỗ trợ (${overview.supportMessages.length})`
                  : `Users & Support (${overview.supportMessages.length})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#0F1412] text-white'
                : 'text-[#0F1412]/75 hover:text-[#0F1412]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Orders Table */}
      {activeTab === 'orders' && (
        <div className="rounded-xl border border-[#E2E8E5] bg-white overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E2E8E5] bg-[#F6F8F7] text-xs font-semibold text-[#0F1412]/75">
                <th className="py-3 px-4">Mã đơn</th>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Địa chỉ KTX</th>
                <th className="py-3 px-4 text-right">Tổng tiền</th>
                <th className="py-3 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E5]">
              {overview.orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#F6F8F7]/60">
                  <td className="py-3 px-4 font-mono-tabular font-semibold text-[#0F1412] whitespace-nowrap">
                    #{ord.orderCode}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#0F1412]">{ord.customerName}</p>
                    <p className="text-xs font-mono-tabular text-[#0F1412]/60">
                      {ord.customerPhone}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#0F1412]/80 max-w-xs">
                    {ord.deliveryAddress}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-[#1B4332] whitespace-nowrap">
                    {formatVND(ord.totalAmount)}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={ord.status}
                      onChange={(e) =>
                        handleOrderStatusChange(
                          ord.id,
                          e.target.value as OrderStatus
                        )
                      }
                      aria-label={`Trạng thái đơn ${ord.orderCode}`}
                      className="px-2.5 py-1.5 rounded-lg border border-[#E2E8E5] bg-white text-xs font-semibold focus:border-[#1B4332] focus:outline-none"
                    >
                      {(
                        [
                          'pending',
                          'confirmed',
                          'shipping',
                          'completed',
                          'cancelled',
                        ] as OrderStatus[]
                      ).map((st) => (
                        <option key={st} value={st}>
                          {getOrderStatusLabel(st, lang)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Inventory Table */}
      {activeTab === 'inventory' && (
        <div className="rounded-xl border border-[#E2E8E5] bg-white overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E2E8E5] bg-[#F6F8F7] text-xs font-semibold text-[#0F1412]/75">
                <th className="py-3 px-4">Sản phẩm</th>
                <th className="py-3 px-4">Danh mục</th>
                <th className="py-3 px-4">Người bán</th>
                <th className="py-3 px-4 text-right">Giá bán</th>
                <th className="py-3 px-4 text-right">Tồn kho</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E5]">
              {overview.products.map((prd) => (
                <tr key={prd.id} className="hover:bg-[#F6F8F7]/60">
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(prd)}
                      className="text-left font-medium text-[#0F1412] hover:text-[#0369A1] hover:underline cursor-pointer"
                    >
                      {lang === 'vi' ? prd.title : prd.titleEn}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#0F1412]/75 whitespace-nowrap">
                    {getCategoryLabel(prd.category, lang)}
                  </td>
                  <td className="py-3 px-4 text-xs text-[#0F1412]/75">
                    {prd.sellerName}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular font-semibold whitespace-nowrap">
                    {formatVND(prd.price)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStockStep(prd, -1)}
                        className="px-2 py-0.5 rounded border border-[#E2E8E5] hover:bg-[#F6F8F7] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-semibold">
                        {prd.stock}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStockStep(prd, 1)}
                        className="px-2 py-0.5 rounded border border-[#E2E8E5] hover:bg-[#F6F8F7] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prd.id)}
                      aria-label={`Xóa ${prd.title}`}
                      className="p-1.5 rounded text-[#B91C1C] hover:bg-[#B91C1C]/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Community Users & Support Inbox */}
      {activeTab === 'community' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-xl border border-[#E2E8E5] bg-white p-5 space-y-3">
            <h3 className="font-display text-base font-bold text-[#0F1412]">
              {lang === 'vi' ? 'Danh sách sinh viên' : 'Student Directory'}
            </h3>
            <div className="divide-y divide-[#E2E8E5]">
              {overview.users.map((u) => (
                <div key={u.id} className="py-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-[#0F1412]">
                      {u.fullName}
                    </span>
                    <span className="font-mono-tabular text-[#1B4332]">
                      MSSV: {u.studentId}
                    </span>
                  </div>
                  <p className="text-[#0F1412]/70 mt-0.5">
                    {u.university} · {u.email}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 rounded-xl border border-[#E2E8E5] bg-white p-5 space-y-3">
            <h3 className="font-display text-base font-bold text-[#0F1412]">
              {lang === 'vi' ? 'Hộp thư hỗ trợ sinh viên' : 'Support Inquiries'}
            </h3>
            {overview.supportMessages.length === 0 ? (
              <p className="text-xs text-[#0F1412]/65">
                {lang === 'vi'
                  ? 'Chưa có yêu cầu hỗ trợ nào.'
                  : 'No support inquiries yet.'}
              </p>
            ) : (
              <div className="divide-y divide-[#E2E8E5]">
                {overview.supportMessages.map((msg) => (
                  <div key={msg.id} className="py-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#0F1412]">
                        {msg.topic}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSupport(msg.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          msg.status === 'resolved'
                            ? 'bg-[#1B4332] text-white'
                            : 'bg-[#B45309] text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>
                          {msg.status === 'resolved'
                            ? lang === 'vi'
                              ? 'Đã xử lý'
                              : 'Resolved'
                            : lang === 'vi'
                            ? 'Đang chờ'
                            : 'Open'}
                        </span>
                      </button>
                    </div>
                    <p className="text-[#0F1412]/80 leading-relaxed">
                      {msg.message}
                    </p>
                    <p className="text-[#0F1412]/55 font-mono-tabular">
                      {msg.name} ({msg.email}) ·{' '}
                      {formatDateShort(msg.createdAt, lang)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
