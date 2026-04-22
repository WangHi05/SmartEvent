import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, QrCode, Users, Settings, FileText, LogOut, ScanLine } from 'lucide-react';

const Sidebar = ({ sidebarOpen }) => {
  const navigate = useNavigate();

// 1. LẤY THÔNG TIN USER TỪ LOCAL STORAGE ĐỂ PHÂN QUYỀN
const userStr = localStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;

// Lấy giá trị thô từ LocalStorage (chữ hoặc số) và ép kiểu về chuỗi chữ thường
const rawRole = (user?.role || user?.Role || '').toString().toLowerCase();

// 2. BỘ CHUYỂN ĐỔI ENUM (Mapper)
// Biến số '0', '1', '2' thành chữ để khớp với mảng phân quyền của Menu
let userRole = '';
switch (rawRole) {
    case '0':
    case 'admin':
        userRole = 'admin';
        break;
    case '1':
    case 'manager':
        userRole = 'manager';
        break;
    case '2':
    case 'staff':
        userRole = 'staff';
        break;
    default:
        userRole = '';
}

// DEBUG để kiểm tra lại
console.log("Giá trị gốc từ DB:", rawRole);
console.log("Quyền đã được chuẩn hóa:", userRole);

  // DEBUG: In ra màn hình console để em theo dõi (Bấm F12 để xem)
  console.log("Dữ liệu User từ LocalStorage:", user);
  console.log("Quyền (Role) hiện tại là:", userRole);

  // 2. DANH SÁCH MENU ĐÃ ĐƯỢC CẤU HÌNH ĐƯỜNG DẪN (path) VÀ QUYỀN (roles)
  const menuItems = [
    { path: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] },
    { path: '/events', label: 'Quản lý Sự kiện', icon: Calendar, roles: ['admin', 'manager'] },
    { path: '/tickets', label: 'Vé & Soát vé', icon: QrCode, roles: ['admin', 'manager', 'staff'] },
    { path: '/checkin', label: 'Soát vé (Quét QR)', icon: ScanLine, roles: ['admin', 'manager', 'staff'] },
    { path: '/users', label: 'Người dùng', icon: Users, roles: ['admin'] },
    { path: '/audit-logs', label: 'Lịch sử thao tác', icon: FileText, roles: ['admin', 'manager'] },
    { path: '/settings', label: 'Cấu hình', icon: Settings, roles: ['admin'] },
  ];

  // Hàm xử lý đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-full z-20 shadow-lg md:shadow-none`}>
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
          <h1 className="text-2xl font-extrabold text-orange-600 tracking-tight">SmartEvent</h1>
        ) : (
          <h1 className="text-2xl font-extrabold text-orange-600">HE</h1>
        )}
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          // KIỂM TRA QUYỀN: Nếu Role không có trong danh sách, sẽ không render menu này
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
                  <div className={`${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  
                  <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
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
          {sidebarOpen && <span className="ml-3 font-medium">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;