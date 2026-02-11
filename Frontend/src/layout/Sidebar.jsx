import React from 'react';
import { LayoutDashboard, Calendar, QrCode, Users, Settings, LogOut } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, sidebarOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'events', label: 'Quản lý Sự kiện', icon: Calendar },
    { id: 'tickets', label: 'Vé & Soát vé', icon: QrCode },
    { id: 'users', label: 'Người dùng', icon: Users },
    { id: 'settings', label: 'Cấu hình', icon: Settings },
  ];

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-full z-20 shadow-lg md:shadow-none`}>
      {/* Logo Area */}
      <div className="h-20 flex items-center justify-center border-b border-gray-100">
        {sidebarOpen ? (
          <h1 className="text-2xl font-extrabold text-orange-600 tracking-tight">HostEvent<span className="text-gray-800"></span></h1>
        ) : (
          <h1 className="text-2xl font-extrabold text-orange-600">FE</h1>
        )}
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 group ${
              activeTab === item.id 
                ? 'bg-orange-50 text-orange-600 font-semibold shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className={`${activeTab === item.id ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            </div>
            
            <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-100">
        <button className="w-full flex items-center p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={22} />
          {sidebarOpen && <span className="ml-3 font-medium">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;