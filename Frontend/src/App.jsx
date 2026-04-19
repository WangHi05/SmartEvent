import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { Settings } from 'lucide-react';

// Import Layout
import AdminLayout from './layout/AdminLayout';

// Import Pages (Features)
import DashboardView from './features/dashboard/DashboardView';
import { EventList } from './features/admin/events';
import { SettingsPage } from './features/admin/settings';
import { AuditLogsView } from './features/admin/audit-logs';
import { UserList } from './features/admin/users';

import Login from './pages/Login'; 
import Register from './pages/Register'; 

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ConfigProvider locale={viVN}>
      <BrowserRouter>
        <Routes>
          {/* LUỒNG 1: PUBLIC ROUTES (Không bị bọc bởi AdminLayout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* LUỒNG 2: PROTECTED ROUTES (Được bọc bên trong AdminLayout) */}
          <Route path="/" element={<AdminLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            <Route path="dashboard" element={<DashboardView />} />
            <Route path="events" element={<EventList />} />
            <Route path="users" element={<UserList />} />
            <Route path="audit-logs" element={<AuditLogsView />} />
            <Route path="settings" element={<SettingsPage />} />
            
            <Route path="tickets" element={
              <div className="flex flex-col items-center justify-center h-96 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                <Settings size={48} className="mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-600">Chức năng đang phát triển</h3>
                <p className="text-sm">Vui lòng quay lại module này sau.</p>
              </div>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;