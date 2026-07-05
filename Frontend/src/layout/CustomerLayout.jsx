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
        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActivePath(item.path)
            ? 'bg-gray-800 text-white'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`}
      >
        {item.label}
      </Link>
    ));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="sticky top-0 z-40 bg-gray-900 text-white shadow-sm">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-5 px-5 py-3.5 sm:px-8 lg:px-10">
          <Link to="/customer/home" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-green-600 text-lg font-bold text-white">
              S
            </div>
            <div>
              <p className="text-base font-bold leading-tight">SmartEvent</p>
              <p className="text-[11px] text-gray-400">Nền tảng đặt vé</p>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 xl:block xl:max-w-[560px]">
            <Input.Search
              size="large"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSearch={handleSearch}
              placeholder="Tìm kiếm sự kiện, nghệ sĩ, workshop..."
              prefix={<Search size={16} className="text-gray-400" />}
              allowClear
            />
          </div>

          <nav className="hidden items-center gap-1 xl:flex">{renderNavLinks()}</nav>

          <div className="hidden items-center gap-3 xl:flex" ref={desktopMenuRef}>
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((value) => !value)}
                  className="flex items-center gap-2.5 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 transition hover:border-gray-600"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <Avatar size={28} className="bg-green-600 text-white">
                    {getAvatarLabel(user)}
                  </Avatar>
                  <div className="min-w-0 text-left">
                    <p className="max-w-[9rem] truncate text-sm font-medium text-white">{getDisplayName(user)}</p>
                  </div>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountDropdown}
              </div>
            ) : (
              <>
                <Button onClick={() => navigate('/login')} className="!rounded-md !border-gray-600 !bg-transparent !text-white hover:!border-gray-400">
                  Đăng nhập
                </Button>
                <Button type="primary" onClick={() => navigate('/register')} className="!rounded-md !border-green-600 !bg-green-600 !font-semibold hover:!border-green-700 hover:!bg-green-700">
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
                  className="flex items-center gap-2 rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1.5 transition hover:border-gray-600"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <Avatar size={26} className="bg-green-600 text-white">
                    {getAvatarLabel(user)}
                  </Avatar>
                  <ChevronDown size={13} className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountDropdown}
              </div>
            ) : null}

            <button
              className="rounded-md p-2 text-white hover:bg-gray-800"
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
          <div className="space-y-1">{renderNavLinks(true)}</div>
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
                <Button block type="primary" onClick={() => { setMobileOpen(false); navigate('/register'); }}>
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
          <div className="space-y-3 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-green-600 font-bold text-white">
                S
              </div>
              <p className="text-base font-bold text-white">SmartEvent</p>
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
              <p>Hoàn vé & chính sách</p>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">Khám phá</p>
            <div className="space-y-1.5 text-sm text-gray-400">
              <Link to="/customer/events" className="block hover:text-white">Sự kiện</Link>
              <Link to="/customer/my-tickets" className="block hover:text-white">Vé của tôi</Link>
              <Link to="/customer/my-orders" className="block hover:text-white">Lịch sử đặt vé</Link>
              <Link to="/customer/contact" className="block hover:text-white">Liên hệ</Link>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">Kết nối</p>
            <div className="flex gap-2.5">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white">
                <Facebook size={16} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white">
                <Youtube size={16} />
              </a>
              <a href="https://zalo.me" target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white">
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
    </div>
  );
};

export default CustomerLayout;