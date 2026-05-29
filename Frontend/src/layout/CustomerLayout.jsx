import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Drawer, Input } from 'antd';
import { Facebook, ChevronDown, KeyRound, LogOut, Menu, MessageCircle, Search, UserRound, X, Youtube } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const getDisplayName = (user) => user?.fullName || user?.FullName || user?.username || user?.Username || 'Khách hàng';

const getAvatarLabel = (user) => {
  const displayName = getDisplayName(user);
  const firstLetter = displayName.trim().charAt(0);
  return firstLetter ? firstLetter.toUpperCase() : 'U';
};

const CustomerLayout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const desktopMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const navItems = useMemo(
    () => [
      { path: '/customer/home', label: 'Trang chủ' },
      { path: '/customer/events', label: 'Sự kiện' },
      { path: '/customer/my-tickets', label: 'Vé của tôi' },
      { path: '/customer/my-orders', label: 'Lịch sử đặt vé' },
      { path: '/customer/contact', label: 'Liên hệ' }
    ],
    []
  );

  const accountMenuItems = useMemo(
    () => [
      {
        key: 'profile',
        icon: <UserRound size={15} />,
        label: 'Hồ sơ cá nhân',
        onClick: () => navigate('/customer/profile'),
      },
      {
        key: 'password',
        icon: <KeyRound size={15} />,
        label: 'Đổi mật khẩu',
        onClick: () => navigate('/customer/change-password'),
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogOut size={15} />,
        label: 'Đăng xuất',
        danger: true,
        onClick: () => {
          logout();
          navigate('/login');
        },
      },
    ],
    [logout, navigate]
  );

  useEffect(() => {
    const handlePointerDown = (event) => {
      const desktopMenuEl = desktopMenuRef.current;
      const mobileMenuEl = mobileMenuRef.current;
      const clickedInsideDesktop = desktopMenuEl && desktopMenuEl.contains(event.target);
      const clickedInsideMobile = mobileMenuEl && mobileMenuEl.contains(event.target);

      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  const isActivePath = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleAccountAction = (item) => {
    if (item.type === 'divider') return;
    setUserMenuOpen(false);
    if (typeof item.onClick === 'function') item.onClick();
  };

  const accountDropdown = userMenuOpen && user ? (
    <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(18rem,calc(100vw-1rem))] rounded-3xl border border-slate-200 bg-white p-2 text-slate-700 shadow-[0_24px_70px_rgba(15,23,42,0.16)] ring-1 ring-black/5 backdrop-blur-xl sm:w-[18rem]">
      <div className="rounded-2xl bg-slate-50 px-4 py-3">
        <p className="truncate text-sm font-semibold text-slate-900">{getDisplayName(user)}</p>
        <p className="truncate text-xs font-medium text-slate-500">Tài khoản khách hàng</p>
      </div>

      <div className="mt-2 space-y-1">
        {accountMenuItems.map((item) => {
          if (item.type === 'divider') {
            return <div key="divider" className="my-2 border-t border-slate-200" />;
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleAccountAction(item)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-colors ${
                item.danger
                  ? 'text-rose-600 hover:bg-rose-50'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.danger ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  const handleSearch = (value) => {
    const keyword = value?.trim();
    if (keyword) {
      navigate(`/customer/events?keyword=${encodeURIComponent(keyword)}`);
      return;
    }
    navigate('/customer/events');
  };

  const renderNavLinks = (closeAfterClick = false) =>
    navItems.map((item) => (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => {
          if (closeAfterClick) {
            setMobileOpen(false);
          }
        }}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
          isActivePath(item.path)
            ? 'bg-white text-slate-950 shadow-sm'
            : 'text-slate-200 hover:text-white hover:bg-white/10'
        }`}
      >
        {item.label}
      </Link>
    ));

  return (
    <div className="customer-shell min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 text-white shadow-[0_20px_60px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-5 px-5 py-4 sm:px-8 lg:px-10 xl:px-12">
          <Link to="/customer/home" className="flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-xl font-black text-white shadow-lg shadow-blue-600/30">
              S
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">SmartEvent</p>
              <p className="-mt-1 text-xs font-medium text-white/65">Premium live ticketing</p>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 xl:block xl:max-w-[620px]">
            <Input.Search
              size="large"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSearch={handleSearch}
              placeholder="Tìm kiếm sự kiện, nghệ sĩ, workshop..."
              prefix={<Search size={16} className="text-slate-400" />}
              className="customer-search-shell"
              allowClear
            />
          </div>

          <nav className="hidden items-center gap-2 xl:flex">{renderNavLinks()}</nav>

          <div className="hidden items-center gap-3 xl:flex" ref={desktopMenuRef}>
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((value) => !value)}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-2.5 transition hover:border-blue-400/40 hover:bg-white/12"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <Avatar size={36} className="bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
                    {getAvatarLabel(user)}
                  </Avatar>
                  <div className="min-w-0 text-left">
                    <p className="max-w-[10rem] truncate text-sm font-medium text-white">{getDisplayName(user)}</p>
                    <p className="text-xs font-medium text-white/65">Tài khoản khách hàng</p>
                  </div>
                  <ChevronDown size={16} className={`text-white/75 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountDropdown}
              </div>
            ) : (
              <>
                <Button onClick={() => navigate('/login')} className="!rounded-2xl !border-white/15 !bg-white/8 !text-white hover:!border-white/30 hover:!bg-white/12">
                  Đăng nhập
                </Button>
                <Button type="primary" onClick={() => navigate('/register')} className="!rounded-2xl !border-blue-600 !bg-blue-600 !font-semibold shadow-lg shadow-blue-600/30 hover:!border-blue-700 hover:!bg-blue-700">
                  Đăng ký
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 xl:hidden">
            {user ? (
              <div className="relative" ref={mobileMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((value) => !value)}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 py-2 transition hover:border-blue-400/40 hover:bg-white/12"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <Avatar size={30} className="bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
                    {getAvatarLabel(user)}
                  </Avatar>
                  <ChevronDown size={14} className={`text-white/75 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountDropdown}
              </div>
            ) : null}

            <button
              className="rounded-xl p-2 text-white hover:bg-white/10"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        <Drawer
          title="Menu khách hàng"
          placement="right"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          closeIcon={<X size={18} />}
          styles={{ body: { paddingTop: 12 } }}
        >
          <div className="mb-4">
            <Input.Search
              placeholder="Tìm sự kiện..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSearch={handleSearch}
              allowClear
            />
          </div>
          <div className="space-y-2">{renderNavLinks(true)}</div>
          <div className="mt-6 border-t border-slate-200 pt-4">
            {user ? (
              <div className="space-y-2">
                <Button block onClick={() => { setMobileOpen(false); navigate('/customer/profile'); }} icon={<UserRound size={16} />}>
                  Hồ sơ cá nhân
                </Button>
                <Button block onClick={() => { setMobileOpen(false); navigate('/customer/change-password'); }} icon={<KeyRound size={16} />}>
                  Đổi mật khẩu
                </Button>
                <Button block danger onClick={() => { logout(); navigate('/login'); }}>
                  Đăng xuất
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button block onClick={() => { setMobileOpen(false); navigate('/login'); }}>Đăng nhập</Button>
                <Button block type="primary" onClick={() => { setMobileOpen(false); navigate('/register'); }}>
                  Đăng ký
                </Button>
              </div>
            )}
          </div>
        </Drawer>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-5 py-6 sm:px-8 lg:px-10 lg:py-8 xl:px-12 xl:py-10">
        <div className="customer-glass rounded-[36px] p-5 sm:p-8 lg:p-10">
          <Outlet />
        </div>
      </main>

      <footer className="mt-10 border-t border-slate-800/80 bg-slate-950 px-4 py-10 text-slate-300">
        <div className="mx-auto grid max-w-[1600px] gap-8 px-5 sm:px-8 lg:grid-cols-4 lg:px-10 xl:px-12">
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 font-black text-white shadow-lg shadow-blue-600/30">
                S
              </div>
              <div>
                <p className="text-lg font-extrabold text-white">SmartEvent</p>
                <p className="text-sm text-white/60">Premium ticketing experience</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-white/65">
              Đặt vé nhanh, trải nghiệm đẹp, quản lý minh bạch cho khách hàng và nhà tổ chức.
            </p>
          </div>

          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-white/80">Hỗ trợ</p>
            <div className="space-y-2 text-sm text-white/65">
              <p>Hotline: 1900 1234</p>
              <p>Email: support@smartevent.vn</p>
              <p>Hoàn vé & chính sách</p>
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-white/80">Khám phá</p>
            <div className="space-y-2 text-sm text-white/65">
              <Link to="/customer/events" className="block hover:text-white">Sự kiện</Link>
              <Link to="/customer/my-tickets" className="block hover:text-white">Vé của tôi</Link>
              <Link to="/customer/my-orders" className="block hover:text-white">Lịch sử đặt vé</Link>
              <Link to="/customer/contact" className="block hover:text-white">Liên hệ</Link>
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-white/80">Kết nối</p>
            <div className="flex gap-3">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10">
                <Facebook size={18} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10">
                <Youtube size={18} />
              </a>
              <a href="https://zalo.me" target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-[1600px] items-center justify-between border-t border-white/10 px-5 pt-6 text-xs text-white/50 sm:px-8 lg:px-10 xl:px-12">
          <span>© 2026 SmartEvent. All rights reserved.</span>
          <span>Premium live ticketing platform</span>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;
