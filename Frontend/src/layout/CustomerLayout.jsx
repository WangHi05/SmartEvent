import React, { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Drawer, Dropdown, Input } from 'antd';
import { Facebook, LogOut, Menu, MessageCircle, Search, Ticket, ClipboardList, User, X, Youtube } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const CustomerLayout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

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

  const userMenu = [
    {
      key: 'profile',
      icon: <User size={16} />,
      label: 'Hồ sơ',
      onClick: () => navigate('/customer/profile'),
    },
    {
      key: 'tickets',
      icon: <Ticket size={16} />,
      label: 'Vé của tôi',
      onClick: () => navigate('/customer/my-tickets'),
    },
    {
      key: 'orders',
      icon: <ClipboardList size={16} />,
      label: 'Lịch sử đặt vé',
      onClick: () => navigate('/customer/my-orders'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogOut size={16} />,
      label: 'Đăng xuất',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const isActivePath = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

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
            ? 'bg-orange-100 text-orange-700'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        {item.label}
      </Link>
    ));

  return (
    <div className="min-h-screen text-slate-800">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 text-white shadow-[0_20px_60px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/customer/home" className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-xl font-black text-white shadow-lg shadow-orange-500/30">
              S
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight">SmartEvent</p>
              <p className="-mt-1 text-xs text-white/65">Premium live ticketing</p>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 xl:block">
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

          <nav className="hidden items-center gap-1 2xl:flex">{renderNavLinks()}</nav>

          <div className="hidden items-center gap-2 2xl:flex">
            {user ? (
              <Dropdown menu={{ items: userMenu }} trigger={['click']}>
                <button className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-3 py-2 transition hover:border-orange-400/40 hover:bg-white/12">
                  <Avatar size={34}>
                    {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{user?.fullName || user?.username}</p>
                    <p className="text-xs text-white/65">Tài khoản khách hàng</p>
                  </div>
                </button>
              </Dropdown>
            ) : (
              <>
                <Button onClick={() => navigate('/login')} className="!rounded-2xl !border-white/15 !bg-white/8 !text-white hover:!border-white/30 hover:!bg-white/12">
                  Đăng nhập
                </Button>
                <Button type="primary" onClick={() => navigate('/register')} className="!rounded-2xl !border-orange-500 !bg-orange-500 !font-semibold shadow-lg shadow-orange-500/30">
                  Đăng ký
                </Button>
              </>
            )}
          </div>

          <button
            className="rounded-xl p-2 text-white hover:bg-white/10 2xl:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
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
                <Button block onClick={() => { setMobileOpen(false); navigate('/customer/profile'); }}>
                  Hồ sơ
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

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="customer-glass rounded-[32px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      <footer className="mt-10 border-t border-white/10 bg-slate-950 px-4 py-10 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-0 sm:px-2 lg:grid-cols-4 lg:px-8">
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 font-black text-white shadow-lg shadow-orange-500/30">
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
        <div className="mx-auto mt-8 flex max-w-7xl items-center justify-between border-t border-white/10 pt-6 text-xs text-white/50">
          <span>© 2026 SmartEvent. All rights reserved.</span>
          <span>Premium live ticketing platform</span>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;
