import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import useAuthStore from '../store/useAuthStore';
import { LayoutDashboard, Calendar, Users, Settings, FileText, LogOut, ScanLine, ClipboardList, Headset, Ticket, Route, History, BrainCircuit } from 'lucide-react';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();

  // Lấy user từ store trước, fallback localStorage/sessionStorage
  const storeUser = useAuthStore((state) => state.user);
  const user = storeUser || authService.getCurrentUser();

  const normalizeRole = (role) => {
    const rawRole = (role || '').toString().trim().toLowerCase();

    switch (rawRole) {
      case '0':
      case 'admin':
      case 'administrator':
      case 'quản trị viên':
      case 'quan tri vien':
        return 'admin';
      case '1':
      case 'manager':
      case 'quản lý':
      case 'quan ly':
        return 'manager';
      case '2':
      case 'staff':
      case 'nhân viên':
      case 'nhan vien':
        return 'staff';
      case '3':
      case 'customer':
      case 'khách hàng':
      case 'khach hang':
        return 'customer';
      case '4':
      case 'director':
      case 'giam doc':
      case 'ban tổ chức':
      case 'ban to chuc':
        return 'director';
      default:
        return '';
    }
  };

  const inferredRole = normalizeRole(
    user?.role ||
      user?.Role ||
      user?.roleName ||
      user?.RoleName ||
      user?.roleDisplayName ||
      user?.RoleDisplayName ||
      user?.userRole ||
      user?.UserRole
  );

  const userRole = inferredRole || 'admin';

  // 2. DANH SÁCH MENU ĐÃ ĐƯỢC CẤU HÌNH ĐƯỜNG DẪN (path) VÀ QUYỀN (roles)
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager'] },
    { path: '/director/dashboard', label: 'Dashboard Giám đốc', icon: LayoutDashboard, roles: ['director'] },
    { path: '/events', label: 'Quản lý sự kiện', icon: Calendar, roles: ['admin', 'manager'] }, //
    { path: '/tickets', label: 'Vé & Soát vé', icon: Ticket, roles: ['admin', 'manager'] }, //
    { path: '/bookings', label: 'Quản lý đặt vé', icon: ClipboardList, roles: ['admin', 'manager', 'staff'] },
    { path: '/checkin', label: 'Soát vé (Quét QR)', icon: ScanLine, roles: ['admin', 'manager', 'staff'] },
    { path: '/gateAD', label: 'Kiểm soát cổng', icon: Route, roles: ['admin', 'manager'] },
    { path: '/checkinHD', label: 'Help Desk', icon: Headset, roles: ['admin', 'manager', 'staff'] },
    { path: '/users', label: 'Người dùng', icon: Users, roles: ['admin'] }, //
    { path: '/audit-logs', label: 'Theo dõi hoạt động', icon: FileText, roles: ['admin', 'manager'] },
    { path: '/checkinlogs', label: 'Lịch sử Check-in', icon: History, roles: ['admin', 'manager'] },
    { path: '/knowledge-management', label: 'Tri thức AI', icon: BrainCircuit, roles: ['admin'] }, //
    { path: '/settings', label: 'Cấu hình hệ thống', icon: Settings, roles: ['admin'] }, //
  ];

  // Hàm xử lý đăng xuất
  const handleLogout = () => {
    authService.logout(); 
  };

  return (
  <>
    {/* Overlay cho mobile */}
    {sidebarOpen && (
      <div
        className="fixed inset-0 bg-black/40 z-20 md:hidden"
        onClick={() => setSidebarOpen?.(false)}
      />
    )}

    <aside className={`${sidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'} md:translate-x-0 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-full z-30 shadow-lg md:shadow-none`}>
      {/* Logo Area */}
      <div className="h-20 flex items-center justify-center border-b border-gray-100">
        <img
          src="/logo.png"
          alt="HostEvent Logo"
          className={`object-contain transition-all duration-300 ${
            sidebarOpen ? 'w-8 h-8 mr-2' : 'w-10 h-10'
          }`}
        />
        {sidebarOpen ? (
          <h1 className="text-2xl font-extrabold text-orange-600 tracking-tight">
            SmartEvent
          </h1>
        ) : (
          <h1 className="text-2xl font-extrabold text-orange-600">HE</h1>
        )}
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          if (!item.roles.includes(userRole)) return null;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `w-full flex items-center p-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 font-semibold shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`${
                      isActive
                        ? 'text-orange-600'
                        : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  >
                    <item.icon
                      size={22}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>

                  <span
                    className={`ml-3 whitespace-nowrap overflow-hidden transition-all ${
                      sidebarOpen
                        ? 'w-auto opacity-100'
                        : 'w-0 opacity-0'
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={22} />
          {sidebarOpen && (
            <span className="ml-3 font-medium">Đăng xuất</span>
          )}
        </button>
      </div>
    </aside>
  </>
);
};

export default Sidebar;