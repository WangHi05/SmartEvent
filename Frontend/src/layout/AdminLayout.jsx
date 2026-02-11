import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

// Đây là component "Khung sườn" của trang Admin
// Nó nhận vào `children` là nội dung thay đổi (Dashboard hoặc EventList)
const AdminLayout = ({ children, activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Sidebar nằm cố định bên trái */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        sidebarOpen={sidebarOpen} 
      />

      {/* Main Content Area */}
      <div className="flex flex-col min-h-screen">
         {/* Header nằm cố định bên trên */}
        <Header 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen} 
        />

        {/* Nội dung chính thay đổi theo tab */}
        <main className={`flex-1 p-8 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;