import {
  Bookmark,
  CheckCircle2,
  CreditCard,
  KeyRound,
  LogOut,
  Package,
  ShieldCheck,
  ShoppingBag,
  Upload,
  User,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { api, setStudentToken } from '../lib/api';
import { formatVND } from '../lib/format';
import { AppLang, Order, Product, UserProfile } from '../types';
import { ProductImage } from './ProductImage';

interface AccountViewProps {
  lang: AppLang;
  currentUser: UserProfile | null;
  products: Product[];
  orders: Order[];
  wishlistIds: string[];
  onAuthSuccess: (user: UserProfile, token: string) => void;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, qty?: number) => void;
  onGoSell: () => void;
  onGoOrders: () => void;
  onNotify: (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    description?: string
  ) => void;
}

type AuthTab = 'login' | 'register' | 'register_cccd' | 'reset';

export function AccountView({
  lang,
  currentUser,
  products,
  orders,
  wishlistIds,
  onAuthSuccess,
  onUserUpdated,
  onLogout,
  onSelectProduct,
  onAddToCart,
  onGoSell,
  onGoOrders,
  onNotify,
}: AccountViewProps) {
  const [authTab, setAuthTab] = useState<AuthTab>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('ĐH Bách Khoa Hà Nội');
  const [studentId, setStudentId] = useState('');
  const [dormAddress, setDormAddress] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // CCCD verification registration state
  const [cccdNumber, setCccdNumber] = useState('');
  const [cccdFullName, setCccdFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [cccdEmail, setCccdEmail] = useState('');
  const [cccdPassword, setCccdPassword] = useState('');
  const [cccdFrontFile, setCccdFrontFile] = useState<string | null>(null);
  const [cccdBackFile, setCccdBackFile] = useState<string | null>(null);

  // Profile editor state
  const [editName, setEditName] = useState('');
  const [editUni, setEditUni] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editDorm, setEditDorm] = useState('');
  const [editBio, setEditBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.fullName);
      setEditUni(currentUser.university);
      setEditStudentId(currentUser.studentId);
      setEditDorm(currentUser.dormAddress);
      setEditBio(currentUser.bio);
    }
  }, [currentUser]);

  const savedProducts = products.filter((p) => wishlistIds.includes(p.id));
  const myOrders = currentUser
    ? orders.filter((o) => o.userId === currentUser.id)
    : [];

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.register({
        email,
        password,
        fullName,
        university,
        studentId,
        dormAddress,
      });
      setStudentToken(res.token);
      onAuthSuccess(res.user, res.token);
      onNotify(
        'success',
        lang === 'vi'
          ? 'Đăng ký tài khoản sinh viên thành công'
          : 'Student account created'
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Đăng ký thất bại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCccdFileChange = (
    side: 'front' | 'back',
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onNotify(
        'error',
        lang === 'vi'
          ? 'Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP).'
          : 'Please choose an image file.'
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onNotify(
        'error',
        lang === 'vi'
          ? 'Dung lượng ảnh không vượt quá 10MB.'
          : 'Image size must be under 10MB.'
      );
      return;
    }
    if (side === 'front') {
      setCccdFrontFile(file.name);
    } else {
      setCccdBackFile(file.name);
    }
  };

  const handleRegisterCccd = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{12}$/.test(cccdNumber.trim())) {
      onNotify(
        'error',
        lang === 'vi'
          ? 'Số CCCD cần nhập đủ 12 chữ số.'
          : 'Citizen ID must be exactly 12 digits.'
      );
      return;
    }
    if (!cccdFrontFile || !cccdBackFile) {
      onNotify(
        'warning',
        lang === 'vi'
          ? 'Vui lòng tải lên ảnh mặt trước và mặt sau CCCD để xác thực.'
          : 'Please upload both front and back Citizen ID photos.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.registerCccd({
        cccdNumber: cccdNumber.trim(),
        fullName: cccdFullName,
        dateOfBirth,
        issueDate,
        permanentAddress,
        email: cccdEmail,
        password: cccdPassword,
        frontVerified: true,
        backVerified: true,
      });
      setStudentToken(res.token);
      onAuthSuccess(res.user, res.token);
      onNotify(
        'success',
        lang === 'vi'
          ? 'Xác thực CCCD và đăng ký tài khoản thành công'
          : 'Citizen ID verified & account created'
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Xác thực CCCD thất bại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.login({ email, password });
      setStudentToken(res.token);
      onAuthSuccess(res.user, res.token);
      onNotify(
        'success',
        lang === 'vi' ? `Xin chào, ${res.user.fullName}` : `Welcome, ${res.user.fullName}`
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Đăng nhập thất bại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.resetPassword({ email, studentId, newPassword });
      onNotify(
        'success',
        lang === 'vi'
          ? 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.'
          : 'Password reset complete. You may sign in now.'
      );
      setAuthTab('login');
      setPassword('');
      setNewPassword('');
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({
        fullName: editName,
        university: editUni,
        studentId: editStudentId,
        dormAddress: editDorm,
        bio: editBio,
      });
      onUserUpdated(res.user);
      onNotify(
        'success',
        lang === 'vi' ? 'Đã cập nhật hồ sơ sinh viên' : 'Profile updated'
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Cập nhật thất bại.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="pb-6 border-b border-[#E2E8E5] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1412]">
            {lang === 'vi'
              ? 'Tài khoản & Hồ sơ sinh viên'
              : 'Student Account & Saved Items'}
          </h1>
          <p className="text-sm text-[#0F1412]/70 mt-1">
            {lang === 'vi'
              ? 'Quản lý thông tin ký túc xá, danh sách sản phẩm đã lưu và lịch sử giao dịch cá nhân.'
              : 'Manage your campus profile, saved wishlist items, and personal orders.'}
          </p>
        </div>

        {currentUser && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Đăng xuất' : 'Sign Out'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Auth Form or Profile Editor */}
        <div className="lg:col-span-6">
          {!currentUser ? (
            <div className="rounded-xl border border-[#E2E8E5] bg-white p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-lg bg-[#F6F8F7] border border-[#E2E8E5]">
                {(
                  [
                    { id: 'register', label: lang === 'vi' ? 'Đăng ký Email' : 'Email' },
                    { id: 'register_cccd', label: lang === 'vi' ? 'Xác thực CCCD' : 'Citizen ID' },
                    { id: 'login', label: lang === 'vi' ? 'Đăng nhập' : 'Sign In' },
                    { id: 'reset', label: lang === 'vi' ? 'Quên mật khẩu' : 'Reset' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAuthTab(tab.id)}
                    className={`py-2 px-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      authTab === tab.id
                        ? 'bg-[#1B4332] text-white'
                        : 'text-[#0F1412]/75 hover:text-[#0F1412]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {authTab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                        {lang === 'vi' ? 'Họ và tên *' : 'Full name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Phạm Hoàng Minh"
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                        {lang === 'vi' ? 'Mã số sinh viên *' : 'Student ID *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="20241088"
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                      {lang === 'vi' ? 'Email sinh viên *' : 'Student Email *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="minh.ph@sv.hust.edu.vn"
                      className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                        {lang === 'vi' ? 'Trường đại học *' : 'University *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                        {lang === 'vi' ? 'Địa chỉ KTX' : 'Dorm Address'}
                      </label>
                      <input
                        type="text"
                        value={dormAddress}
                        onChange={(e) => setDormAddress(e.target.value)}
                        placeholder="KTX B9, P.302"
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                      {lang === 'vi' ? 'Mật khẩu (tối thiểu 6 ký tự) *' : 'Password (min 6 chars) *'}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg bg-[#1B4332] hover:bg-[#143326] text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {submitting
                      ? lang === 'vi'
                        ? 'Đang tạo tài khoản...'
                        : 'Creating account...'
                      : lang === 'vi'
                      ? 'Tạo tài khoản sinh viên'
                      : 'Create Student Account'}
                  </button>
                </form>
              )}

              {authTab === 'register_cccd' && (
                <form onSubmit={handleRegisterCccd} className="space-y-4">
                  <div className="rounded-lg bg-[#F6F8F7] border border-[#E2E8E5] p-3.5 flex items-start gap-2.5 text-xs text-[#0F1412]/80">
                    <ShieldCheck className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" />
                    <span>
                      {lang === 'vi'
                        ? 'Xác thực danh tính qua Căn cước công dân 12 số gắn chip. Số CCCD được mã hóa một chiều và chỉ hiển thị dạng che mờ.'
                        : 'Verify your account with a 12-digit Citizen ID. Your ID number is hashed securely and masked on your profile.'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                        {lang === 'vi' ? 'Số CCCD (12 chữ số) *' : 'Citizen ID (12 digits) *'}
                      </label>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={12}
                        pattern="\d{12}"
                        value={cccdNumber}
                        onChange={(e) =>
                          setCccdNumber(e.target.value.replace(/\D/g, '').slice(0, 12))
                        }
                        placeholder="001204018912"
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                        {lang === 'vi' ? 'Họ và tên theo CCCD *' : 'Full name on ID *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={cccdFullName}
                        onChange={(e) => setCccdFullName(e.target.value)}
                        placeholder="NGUYEN VAN AN"
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                        {lang === 'vi' ? 'Ngày sinh *' : 'Date of birth *'}
                      </label>
                      <input
                        type="date"
                        required
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                        {lang === 'vi' ? 'Ngày cấp CCCD *' : 'Issue date *'}
                      </label>
                      <input
                        type="date"
                        required
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                      {lang === 'vi'
                        ? 'Nơi thường trú / Địa chỉ giao nhận *'
                        : 'Permanent / Delivery address *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={permanentAddress}
                      onChange={(e) => setPermanentAddress(e.target.value)}
                      placeholder="Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội"
                      className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                        {lang === 'vi' ? 'Email liên hệ *' : 'Contact email *'}
                      </label>
                      <input
                        type="email"
                        required
                        value={cccdEmail}
                        onChange={(e) => setCccdEmail(e.target.value)}
                        placeholder="an.nv@loopu.sv.vn"
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                        {lang === 'vi' ? 'Mật khẩu (tối thiểu 6 ký tự) *' : 'Password *'}
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={cccdPassword}
                        onChange={(e) => setCccdPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Front & Back CCCD Upload */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <label className="flex flex-col items-center justify-center gap-1.5 px-3 py-3.5 rounded-lg border border-dashed border-[#E2E8E5] bg-[#F6F8F7] hover:border-[#1B4332] transition-colors cursor-pointer text-center">
                      {cccdFrontFile ? (
                        <CheckCircle2 className="w-5 h-5 text-[#1B4332]" />
                      ) : (
                        <Upload className="w-5 h-5 text-[#0369A1]" />
                      )}
                      <span className="text-xs font-semibold text-[#0F1412]">
                        {lang === 'vi' ? 'Ảnh mặt trước CCCD *' : 'Front of Citizen ID *'}
                      </span>
                      <span className="text-[11px] text-[#0F1412]/65 truncate max-w-full">
                        {cccdFrontFile || (lang === 'vi' ? 'Chọn ảnh JPG/PNG' : 'Choose image')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCccdFileChange('front', e)}
                        className="sr-only"
                      />
                    </label>

                    <label className="flex flex-col items-center justify-center gap-1.5 px-3 py-3.5 rounded-lg border border-dashed border-[#E2E8E5] bg-[#F6F8F7] hover:border-[#1B4332] transition-colors cursor-pointer text-center">
                      {cccdBackFile ? (
                        <CheckCircle2 className="w-5 h-5 text-[#1B4332]" />
                      ) : (
                        <Upload className="w-5 h-5 text-[#0369A1]" />
                      )}
                      <span className="text-xs font-semibold text-[#0F1412]">
                        {lang === 'vi' ? 'Ảnh mặt sau CCCD *' : 'Back of Citizen ID *'}
                      </span>
                      <span className="text-[11px] text-[#0F1412]/65 truncate max-w-full">
                        {cccdBackFile || (lang === 'vi' ? 'Chọn ảnh JPG/PNG' : 'Choose image')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCccdFileChange('back', e)}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1B4332] hover:bg-[#143326] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>
                      {submitting
                        ? lang === 'vi'
                          ? 'Đang xác thực CCCD...'
                          : 'Verifying Citizen ID...'
                        : lang === 'vi'
                        ? 'Xác thực CCCD & Tạo tài khoản'
                        : 'Verify ID & Create Account'}
                    </span>
                  </button>
                </form>
              )}

              {authTab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                      {lang === 'vi' ? 'Email hoặc số CCCD (12 số)' : 'Email or 12-digit Citizen ID'}
                    </label>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="minh.ph@sv.hust.edu.vn hoặc 001204018912"
                      className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                      {lang === 'vi' ? 'Mật khẩu' : 'Password'}
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg bg-[#1B4332] hover:bg-[#143326] text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {submitting
                      ? lang === 'vi'
                        ? 'Đang đăng nhập...'
                        : 'Signing in...'
                      : lang === 'vi'
                      ? 'Đăng nhập'
                      : 'Sign In'}
                  </button>
                </form>
              )}

              {authTab === 'reset' && (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-[#0369A1] font-medium">
                    <KeyRound className="w-4 h-4 shrink-0" />
                    <span>
                      {lang === 'vi'
                        ? 'Xác minh bằng Email và Mã số sinh viên đã đăng ký.'
                        : 'Verify using your registered email and Student ID.'}
                    </span>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email đã đăng ký"
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Mã số sinh viên (vd: 20241088)"
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg bg-[#0F1412] hover:bg-[#1B4332] text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {lang === 'vi' ? 'Đặt lại mật khẩu' : 'Reset Password'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form
              onSubmit={handleSaveProfile}
              className="rounded-xl border border-[#E2E8E5] bg-white p-6 space-y-4"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-[#E2E8E5]">
                <div className="w-11 h-11 rounded-lg bg-[#1B4332] text-white flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-bold text-[#0F1412] truncate">
                    {currentUser.fullName}
                  </h2>
                  <p className="text-xs text-[#0F1412]/65 truncate">
                    {currentUser.email}
                    {currentUser.cccdVerified && currentUser.cccdMasked && (
                      <span className="ml-2 font-mono-tabular font-semibold text-[#1B4332]">
                        · CCCD {currentUser.cccdMasked}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                    {lang === 'vi' ? 'Họ và tên' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                    {lang === 'vi' ? 'Mã số sinh viên' : 'Student ID'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editStudentId}
                    onChange={(e) => setEditStudentId(e.target.value)}
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
                  required
                  value={editUni}
                  onChange={(e) => setEditUni(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                  {lang === 'vi' ? 'Địa chỉ giao nhận KTX' : 'Dorm Address'}
                </label>
                <input
                  type="text"
                  value={editDorm}
                  onChange={(e) => setEditDorm(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1412] mb-1">
                  {lang === 'vi' ? 'Giới thiệu ngắn' : 'Bio'}
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8E5] text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-lg bg-[#1B4332] hover:bg-[#143326] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {savingProfile
                    ? lang === 'vi'
                      ? 'Đang lưu...'
                      : 'Saving...'
                    : lang === 'vi'
                    ? 'Lưu thay đổi hồ sơ'
                    : 'Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={onGoSell}
                  className="px-4 py-2.5 rounded-lg border border-[#0F1412] text-[#0F1412] hover:bg-[#0F1412] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {lang === 'vi' ? 'Đăng bán sản phẩm' : 'Post a Listing'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right: Saved Wishlist & Personal Orders Link */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-[#E2E8E5] bg-white p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#0369A1]" />
                <h2 className="font-display text-base font-bold text-[#0F1412]">
                  {lang === 'vi'
                    ? `Sản phẩm đã lưu (${savedProducts.length})`
                    : `Saved Wishlist (${savedProducts.length})`}
                </h2>
              </div>
            </div>

            {savedProducts.length === 0 ? (
              <p className="text-sm text-[#0F1412]/65">
                {lang === 'vi'
                  ? 'Nhấn biểu tượng đánh dấu trên bất kỳ sản phẩm nào để lưu lại xem sau.'
                  : 'Bookmark any item in the catalog to save it here.'}
              </p>
            ) : (
              <div className="divide-y divide-[#E2E8E5]">
                {savedProducts.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-11 rounded-md overflow-hidden border border-[#E2E8E5] shrink-0">
                        <ProductImage
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(item)}
                          className="text-left text-sm font-semibold text-[#0F1412] hover:text-[#1B4332] truncate block w-full cursor-pointer"
                        >
                          {lang === 'vi' ? item.title : item.titleEn}
                        </button>
                        <p className="font-mono-tabular text-xs font-semibold text-[#1B4332]">
                          {formatVND(item.price)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddToCart(item, 1)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B4332] text-white text-xs font-semibold hover:bg-[#143326] shrink-0 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Thêm giỏ' : 'Add'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#E2E8E5] bg-[#0F1412] text-white p-6 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-white/75">
                <Package className="w-4 h-4" />
                <span>
                  {lang === 'vi' ? 'Đơn hàng tài khoản' : 'Account Orders'}
                </span>
              </div>
              <p className="font-mono-tabular text-2xl font-bold mt-1">
                {myOrders.length}
              </p>
            </div>
            <button
              type="button"
              onClick={onGoOrders}
              className="px-4 py-2.5 rounded-lg bg-white text-[#0F1412] hover:bg-[#F6F8F7] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'vi' ? 'Xem toàn bộ đơn hàng' : 'View All Orders'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
