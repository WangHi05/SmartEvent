import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Drawer, Input } from 'antd';
import { Facebook, ChevronDown, ChevronUp, KeyRound, LogOut, Menu, MessageCircle, Search, UserRound, X, Youtube } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const getAvatarUrl = (user) => user?.avatarUrl || user?.AvatarUrl || null;

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
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

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
    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-1rem))] rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-lg sm:w-[16rem]">
      <div className="rounded-md bg-gray-50 px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-gray-900">{getDisplayName(user)}</p>
        <p className="truncate text-xs text-gray-500">Tài khoản khách hàng</p>
      </div>

      <div className="mt-1 space-y-0.5">
        {accountMenuItems.map((item) => {
          if (item.type === 'divider') {
            return <div key="divider" className="my-1 border-t border-gray-200" />;
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleAccountAction(item)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-md ${item.danger ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
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
        className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
          isActivePath(item.path)
            ? 'bg-orange-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
        }`}
      >
        {item.label}
      </Link>
    ));

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800">
      <header className="sticky top-0 z-40 bg-white text-gray-900 shadow-sm border-b border-gray-200">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-5 px-5 py-3.5 sm:px-8 lg:px-10">
          
          {/* 🚀 FIXED HEADER LOGO: Đã sửa bọc nền trắng tràn viền đầy đặn cực đẹp */}
          <Link to="/customer/home" className="flex items-center gap-3 select-none">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 overflow-hidden shadow-sm shrink-0">
              <img 
                src="/logo.png" 
                alt="SmartEvent Logo" 
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-black leading-none tracking-tight text-gray-900">SmartEvent</p>
              <p className="text-[10px] text-gray-500 font-bold tracking-wider uppercase mt-1">Nền tảng đặt vé</p>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 xl:block xl:max-w-[480px]">
            <Input.Search
              size="large"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSearch={handleSearch}
              placeholder="Tìm kiếm sự kiện, nghệ sĩ, workshop..."
              prefix={<Search size={15} className="text-gray-400" />}
              allowClear
              className="custom-search-input"
            />
          </div>

          <nav className="hidden items-center gap-1.5 xl:flex">{renderNavLinks()}</nav>

          <div className="hidden items-center gap-3 xl:flex" ref={desktopMenuRef}>
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((value) => !value)}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 transition hover:border-orange-300 shadow-sm"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <Avatar
                    size={26}
                    src={getAvatarUrl(user) || undefined}
                    className="bg-orange-600 text-white font-bold text-xs"
                  >
                    {!getAvatarUrl(user) && getAvatarLabel(user)}
                  </Avatar>
                  <div className="min-w-0 text-left">
                    <p className="max-w-[9rem] truncate text-xs font-bold text-gray-900">{getDisplayName(user)}</p>
                  </div>
                  <ChevronDown size={13} className="text-gray-400 transition-transform" />
                </button>

                {accountDropdown}
              </div>
            ) : (
              <>
                <Button onClick={() => navigate('/login')} className="!h-9 !rounded-xl !border-gray-300 !bg-white !text-xs !font-bold !text-gray-700 hover:!border-orange-400 hover:!text-orange-600 transition-all">
                  Đăng nhập
                </Button>
                <Button type="primary" onClick={() => navigate('/register')} className="!h-9 !rounded-xl !border-orange-600 !bg-orange-600 !text-xs !font-bold hover:!border-orange-500 hover:!bg-orange-500 shadow-md transition-all">
                  Đăng ký
                </Button>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 xl:hidden">
            {user ? (
              <div className="relative" ref={mobileMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((value) => !value)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 transition hover:border-orange-300"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <Avatar
                    size={24}
                    src={getAvatarUrl(user) || undefined}
                    className="bg-orange-600 text-white font-bold text-xs"
                  >
                    {!getAvatarUrl(user) && getAvatarLabel(user)}
                  </Avatar>
                  <ChevronDown size={12} className="text-gray-400 transition-transform" />
                </button>

                {accountDropdown}
              </div>
            ) : null}

            <button
              className="rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition-colors"
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
          <div className="flex flex-col space-y-2">{renderNavLinks(true)}</div>
          <div className="mt-6 border-t border-gray-200 pt-4">
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
                <Button block type="primary" onClick={() => { setMobileOpen(false); navigate('/register'); }} className="!bg-orange-600 !border-orange-600">
                  Đăng ký
                </Button>
              </div>
            )}
          </div>
        </Drawer>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <Outlet />
      </main>

      <footer className="mt-10 border-t border-gray-800 bg-gray-900 px-5 py-10 text-gray-300 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-4">
          
          {/* 🚀 FIXED FOOTER LOGO: Sửa đồng bộ bọc nền trắng tràn viền đầy đặn dưới chân trang */}
          <div className="space-y-3 lg:col-span-1">
            <div className="flex items-center gap-3 select-none">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white overflow-hidden shadow-md shrink-0">
                <img 
                  src="/logo.png" 
                  alt="SmartEvent Logo" 
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-base font-black tracking-tight text-white">SmartEvent</p>
            </div>
            <p className="text-sm leading-6 text-gray-400">
              Đặt vé nhanh, trải nghiệm đẹp, quản lý minh bạch cho khách hàng và nhà tổ chức.
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">Hỗ trợ</p>
            <div className="space-y-1.5 text-sm text-gray-400">
            <p>Hotline: 1900 1234</p>
            <p>Email: support@smartevent.vn</p>
            <Link to="/customer/policy" className="block hover:text-orange-400">Hoàn vé & chính sách</Link>
          </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">Khám phá</p>
            <div className="space-y-1.5 text-sm text-gray-400">
              <Link to="/customer/events" className="block hover:text-orange-400">Sự kiện</Link>
              <Link to="/customer/my-tickets" className="block hover:text-orange-400">Vé của tôi</Link>
              <Link to="/customer/my-orders" className="block hover:text-orange-400">Lịch sử đặt vé</Link>
              <Link to="/customer/contact" className="block hover:text-orange-400">Liên hệ</Link>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">Kết nối</p>
            <div className="flex gap-2.5">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 text-gray-300 hover:border-orange-500 hover:text-orange-400 transition-colors">
                <Facebook size={16} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 text-gray-300 hover:border-orange-500 hover:text-orange-400 transition-colors">
                <Youtube size={16} />
              </a>
              <a href="https://zalo.me" target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 text-gray-300 hover:border-orange-500 hover:text-orange-400 transition-colors">
                <MessageCircle size={16} />
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-[1440px] items-center justify-between border-t border-gray-800 pt-6 text-xs text-gray-500">
          <span>© 2026 SmartEvent. All rights reserved.</span>
          <span>Nền tảng đặt vé trực tuyến</span>
        </div>
      </footer>
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Lên đầu trang"
          className="fixed bottom-24 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition hover:bg-orange-600 sm:right-8"
        >
          <ChevronUp size={20} />
        </button>
      )}
    </div>
  );
};

export default CustomerLayout;