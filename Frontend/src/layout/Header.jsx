import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';

const Header = ({ sidebarOpen, setSidebarOpen, userName = "Admin User" }) => {
  return (
    <header className={`h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
      
      {/* Left: Toggle & Search */}
      <div className="flex items-center space-x-4">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <Menu size={24}/>
        </button>

        <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-4 py-2.5 w-80 transition-all focus-within:w-96 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 border border-transparent focus-within:border-blue-200">
          <Search size={18} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Tìm mã vé, sự kiện..." 
            className="bg-transparent border-none outline-none ml-3 w-full text-sm text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>
      
      {/* Right: Notification & Profile */}
      <div className="flex items-center space-x-6">
        <button className="relative p-2 rounded-full hover:bg-gray-50 text-gray-500 hover:text-blue-600 transition-colors">
          <Bell size={22} />
          <span className="absolute top-1.5 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
        
        <div className="flex items-center space-x-3 border-l pl-6 border-gray-200">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-gray-800">{userName}</p>
            <p className="text-xs text-gray-500 font-medium">Quản trị viên</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold border-2 border-white shadow-md cursor-pointer hover:shadow-lg transition-shadow">
            {userName.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;