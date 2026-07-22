import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { authService } from '../services/authService';
import AdminChatbotWidget from '../components/admin/AdminChatbotWidget';

const AdminLayout = ({ sidebarOpen, setSidebarOpen }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex flex-col min-h-screen">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className={`flex-1 p-4 md:p-8 transition-all duration-300 ml-0 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
          <Outlet /> 
        </main>
      </div>
      <AdminChatbotWidget />
    </div>
  );
};

export default AdminLayout;