import React from 'react';
import useAuthStore from '../store/useAuthStore';

const Header = ({ sidebarOpen, setSidebarOpen }) => {
  const user = useAuthStore((state) => state.user);

  const fullName = user?.fullName || user?.FullName || user?.username || 'Khách';
  const avatarUrl = user?.avatarUrl || user?.AvatarUrl || '';
  const rawRole = (user?.role || user?.Role || '').toString().toLowerCase();

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

  const nameParts = fullName.trim().split(' ');
  const lastName = nameParts[nameParts.length - 1];
  const avatarLetter = lastName ? lastName.charAt(0).toUpperCase() : 'U';

  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 transition-all duration-300">
      
      {/* KHU VỰC TRÁI: Nút thu phóng Sidebar, LOGO THAY CHỮ S và Thanh tìm kiếm */}
      <div className="flex items-center gap-5">
        <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        {/* 🚀 ĐÃ THÊM: Khối hiển thị Logo máy thay cho ô chữ S xanh lá cũ - Đảm bảo hài hòa màu sắc */}
        <div className="flex items-center gap-3 select-none">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-orange-50 border border-orange-200/60 p-1.5 shadow-sm shrink-0">
            <img 
              src="/logo.png" 
              alt="SmartEvent Logo" 
              className="h-full w-full object-contain"
            />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-black text-slate-800 tracking-tight leading-none">SmartEvent</p>
            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-1">Nền tảng đặt vé</p>
          </div>
        </div>

      </div>

      {/* KHU VỰC PHẢI: Thông báo và Profile User (GIỮ NGUYÊN NGUYÊN BẢN) */}
      <div className="flex items-center gap-6">
        
        {/* Nút thông báo */}
        <button className="text-gray-500 hover:text-orange-600 relative transition-colors">
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
          <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-md cursor-pointer hover:bg-orange-700 transition-colors">
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              avatarLetter
            )}
          </div>
        </div>
        
      </div>
    </header>
  );
};

export default Header;