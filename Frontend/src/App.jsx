import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

// Import Layout
import AdminLayout from './layout/AdminLayout';

// Import Pages (Features)
import DashboardView from './features/dashboard/DashboardView';
import { EventList } from './features/admin/events';
import { SettingsPage } from './features/admin/settings';
import { AuditLogsView } from './features/admin/audit-logs';
import { UserList } from './features/admin/users';
import { TicketList } from './features/admin/tickets';
import CheckInPage from './features/admin/checkin/CheckInPage';

import Login from './pages/Login'; 
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword'; 

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ConfigProvider locale={viVN}>
      <BrowserRouter>
        <Routes>
          {/* LUỒNG 1: PUBLIC ROUTES (Không bị bọc bởi AdminLayout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* LUỒNG 2: PROTECTED ROUTES (Được bọc bên trong AdminLayout) */}
          <Route path="/" element={<AdminLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            <Route path="dashboard" element={<DashboardView />} />
            <Route path="events" element={<EventList />} />
            <Route path="users" element={<UserList />} />
            <Route path="audit-logs" element={<AuditLogsView />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="tickets" element={<TicketList />} />
            <Route path="checkin" element={<CheckInPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;