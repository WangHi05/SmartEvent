import React, { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Drawer, Dropdown, Avatar, Button } from 'antd';
import { Menu, X, User, Ticket, ClipboardList, LogOut } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const CustomerLayout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/customer/home" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-xl text-white shadow-sm">
              S
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">SmartEvent</p>
              <p className="-mt-1 text-xs text-slate-500">Live Ticketing Platform</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">{renderNavLinks()}</nav>

          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <Dropdown menu={{ items: userMenu }} trigger={['click']}>
                <button className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 hover:border-orange-300 hover:bg-orange-50">
                  <Avatar size={34}>
                    {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900">{user?.fullName || user?.username}</p>
                    <p className="text-xs text-slate-500">Tài khoản khách hàng</p>
                  </div>
                </button>
              </Dropdown>
            ) : (
              <>
                <Button onClick={() => navigate('/login')} className="!rounded-xl">Đăng nhập</Button>
                <Button type="primary" onClick={() => navigate('/register')} className="!rounded-xl !bg-orange-500 !border-orange-500">Đăng ký</Button>
              </>
            )}
          </div>

          <button
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
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
        >
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

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-6">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
        © 2026 SmartEvent. All rights reserved.
      </footer>
    </div>
  );
};

export default CustomerLayout;
