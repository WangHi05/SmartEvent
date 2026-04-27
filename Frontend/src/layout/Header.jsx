import React from 'react';
import useAuthStore from '../store/useAuthStore';

const Header = ({ sidebarOpen, setSidebarOpen }) => {
  // Lấy thông tin user trực tiếp từ Zustand Store
  const user = useAuthStore((state) => state.user);

  // 2. XỬ LÝ LẤY TÊN VÀ QUYỀN
  // Lấy FullName, nếu không có thì lấy Username, nếu vẫn không có thì mặc định là 'Khách'
  const fullName = user?.fullName || user?.FullName || user?.username || 'Khách';
  const rawRole = (user?.role || user?.Role || '').toString().toLowerCase();

  // 3. BỘ CHUYỂN ĐỔI (MAPPER) TỪ ENUM SANG TIẾNG VIỆT
  let roleDisplay = '';
  switch (rawRole) {
    case '0':
    case 'admin':
      roleDisplay = 'Quản trị viên';
      break;
    case '1':
    case 'manager':
      roleDisplay = 'Quản lý';
      break;
    case '2':
    case 'staff':
      roleDisplay = 'Nhân viên';
      break;
    case '3':
    case 'customer':
      roleDisplay = 'Khách hàng';
      break;
    default:
      roleDisplay = 'Chưa xác định';
  }

  // 4. LẤY CHỮ CÁI ĐẦU TIÊN CỦA TÊN LÀM AVATAR
  const nameParts = fullName.trim().split(' ');
  const lastName = nameParts[nameParts.length - 1];
  const avatarLetter = lastName ? lastName.charAt(0).toUpperCase() : 'U';

  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 transition-all duration-300">
      
      {/* KHU VỰC TRÁI: Nút thu phóng Sidebar và Thanh tìm kiếm */}
      <div className="flex items-center gap-4">
        <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
        >
            {/* <Menu size={24} /> - Thay bằng icon hamburger của em */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        {/* Thanh tìm kiếm của em để ở đây... */}
      </div>

      {/* KHU VỰC PHẢI: Thông báo và Profile User */}
      <div className="flex items-center gap-6">
        
        {/* Nút thông báo */}
        <button className="text-gray-500 hover:text-orange-500 relative">
          {/* <Bell size={24} /> */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        {/* Khung thông tin User Động */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            {/* Tên động */}
            <p className="text-sm font-bold text-gray-800 leading-tight">{fullName}</p>
            {/* Chức vụ động */}
            <p className="text-xs text-gray-500">{roleDisplay}</p>
          </div>
          
          {/* Avatar động */}
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md cursor-pointer hover:bg-blue-700 transition-colors">
            {avatarLetter}
          </div>
        </div>
        
      </div>
    </header>
  );
};

export default Header;