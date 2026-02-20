import React, { useState } from 'react';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import AdminLayout from './layout/AdminLayout';
import DashboardView from './features/dashboard/DashboardView';
import { EventList } from './features/admin/events';
import { SettingsPage } from './features/admin/settings';
import { AuditLogsView } from './features/admin/audit-logs';
import { UserList } from './features/admin/users';
import { Settings } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Hàm quyết định render nội dung nào dựa trên tab đang chọn
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'events':
        return <EventList />;
      case 'settings':
        return <SettingsPage />;
      case 'users':
        return <UserList />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'tickets':
        return (
          <div className="flex flex-col items-center justify-center h-96 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <Settings size={48} className="mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-600">Chức năng đang phát triển</h3>
            <p className="text-sm">Vui lòng quay lại module {activeTab} sau.</p>
          </div>
        );
      default:
        return <DashboardView />;
    }
  };

  return (
    <ConfigProvider locale={viVN}>
      <AdminLayout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      >
        {renderContent()}
      </AdminLayout>
    </ConfigProvider>
  );
}

export default App;